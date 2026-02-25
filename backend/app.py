from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_compress import Compress
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
import json as json_module
import numpy as np
from scipy.optimize import minimize, differential_evolution
import neuralfoil as nf
from geometry import airfoil_from_cst
from objectives import objective_multipoint, objective_stage2_clean, constraint_lift_lower, constraint_lift_upper, constraint_geometry
from panel_method import compute_cp_distribution, validate_cp_distribution
from flow_visualization import compute_flow_field
import traceback
import sys
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
import io
import base64
from datetime import datetime
import logging
import os
from logging.handlers import RotatingFileHandler
from PIL import Image
import time

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

app = Flask(__name__)

# --- Gzip compression for all responses ---
compress = Compress()
app.config['COMPRESS_MIMETYPES'] = [
    'application/json',
    'text/html',
    'text/css',
    'application/javascript',
]
app.config['COMPRESS_LEVEL'] = 6
app.config['COMPRESS_MIN_SIZE'] = 500
compress.init_app(app)

# CORS configuration - restrict to specific frontend origin(s)
_cors_env = os.environ.get('CORS_ORIGIN', 'http://localhost:5173,http://localhost:5174')
ALLOWED_ORIGINS = [o.strip() for o in _cors_env.split(',')]
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS},
                     r"/optimize": {"origins": ALLOWED_ORIGINS}},
     supports_credentials=True)

# --- Firebase Admin SDK initialization ---
_firebase_initialized = False
_firebase_cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
_firebase_json_env = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')

if _firebase_cred_path and os.path.exists(_firebase_cred_path):
    cred = credentials.Certificate(_firebase_cred_path)
    firebase_admin.initialize_app(cred)
    _firebase_initialized = True
    print(f"Firebase Admin SDK initialized from: {_firebase_cred_path}")
elif _firebase_json_env:
    cred = credentials.Certificate(json_module.loads(_firebase_json_env))
    firebase_admin.initialize_app(cred)
    _firebase_initialized = True
    print("Firebase Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT_JSON env var")
elif os.path.exists('serviceAccountKey.json'):
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)
    _firebase_initialized = True
    print("Firebase Admin SDK initialized from: serviceAccountKey.json (auto-detected)")
else:
    print("WARNING: No Firebase credentials found. Authentication will be disabled.")
    print("  Set GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json")
    print("  Or place serviceAccountKey.json in the backend directory")


def require_auth(f):
    """Decorator that verifies Firebase ID token from Authorization header."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not _firebase_initialized:
            # Auth disabled — fall back to anonymous (dev mode)
            request.uid = 'anonymous'
            return f(*args, **kwargs)

        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'Missing or invalid Authorization header'
            }), 401

        id_token = auth_header.split('Bearer ', 1)[1]
        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
            request.uid = decoded_token['uid']
        except Exception:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired authentication token'
            }), 401

        return f(*args, **kwargs)
    return decorated_function


# --- Server-side rate limiting ---
def _get_rate_limit_key():
    """Use verified user UID if available, else fall back to IP."""
    uid = getattr(request, 'uid', None)
    if uid and uid != 'anonymous':
        return f"user:{uid}"
    return get_remote_address()

limiter = Limiter(
    app=app,
    key_func=_get_rate_limit_key,
    default_limits=["100 per hour"],
    storage_uri="memory://",
)

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'success': False,
        'error': 'Rate limit exceeded. Please try again later.',
        'retry_after': str(e.description)
    }), 429


# Performance caching headers
@app.after_request
def after_request(response):
    if request.method == 'GET' and request.path in ('/api/health', '/api/status'):
        response.headers['Cache-Control'] = 'public, max-age=5'
    else:
        response.headers['Cache-Control'] = 'no-store'
    return response

# Create logs directory if it doesn't exist
LOGS_DIR = 'user_logs'
ASSETS_DIR = 'assets'
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

# Configure main app logger to be quiet
app.logger.setLevel(logging.WARNING)
logging.getLogger('werkzeug').setLevel(logging.WARNING)

def get_user_logger(user_id):
    """
    Create or get a logger specific to a user.
    Each user gets their own log file in user_logs/{user_id}.log
    """
    logger_name = f'user_{user_id}'
    
    # Return existing logger if already created
    if logger_name in logging.Logger.manager.loggerDict:
        return logging.getLogger(logger_name)
    
    # Create new logger
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.INFO)
    logger.propagate = False  # Don't propagate to root logger
    
    # Create user-specific log file with rotation
    log_file = os.path.join(LOGS_DIR, f'{user_id}.log')
    handler = RotatingFileHandler(
        log_file,
        maxBytes=5*1024*1024,  # 5MB per file
        backupCount=3  # Keep 3 backup files
    )
    
    # Format: timestamp - level - message
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    return logger

# Global storage for optimization progress
optimization_status = {
    'status': 'idle',
    'progress': 0,
    'message': ''
}


def add_liftcraft_watermark(pdf_canvas, logo_path=None, position='top-right', opacity=0.15, size=60):
    """
    Add LiftCraft logo as watermark to PDF page
    
    Args:
        pdf_canvas: ReportLab canvas object
        logo_path: Path to LiftCraft-logo.png
        position: 'top-right', 'top-left', 'bottom-right', 'bottom-left', or 'center'
        opacity: Watermark opacity (0.0 to 1.0)
        size: Logo size in pixels
    """
    try:
        # Default logo path
        if logo_path is None:
            logo_path = os.path.join(ASSETS_DIR, 'LiftCraft-logo.png')
        
        # Check if logo exists
        if not os.path.exists(logo_path):
            print(f"Warning: Logo not found at {logo_path}, skipping watermark")
            return False
        
        # Load logo
        logo = ImageReader(logo_path)
        
        # Get page dimensions
        page_width, page_height = pdf_canvas._pagesize
        
        # Calculate position
        margin = 15
        positions = {
            'top-right': (page_width - size - margin, page_height - size - margin),
            'top-left': (margin, page_height - size - margin),
            'bottom-right': (page_width - size - margin, margin),
            'bottom-left': (margin, margin),
            'center': ((page_width - size) / 2, (page_height - size) / 2)
        }
        
        x, y = positions.get(position, positions['top-right'])
        
        # Draw watermark with transparency
        pdf_canvas.saveState()
        pdf_canvas.setFillAlpha(opacity)
        pdf_canvas.drawImage(
            logo, 
            x, y, 
            width=size, 
            height=size, 
            preserveAspectRatio=True,
            mask='auto'
        )
        pdf_canvas.restoreState()
        
        return True
        
    except Exception as e:
        print(f"Failed to add watermark: {e}")
        return False


def get_intelligent_initial_guess(CL_target, airfoil_type, n_cst=5):
    """Generate problem-specific initial guess"""
    if airfoil_type == 'symmetric':
        x0_upper = np.linspace(0.15, 0.02, n_cst)
        x0_lower = -x0_upper
    else:
        camber_factor = min(CL_target / 1.2, 1.5)
        x0_upper = np.linspace(0.18, 0.01, n_cst) * camber_factor
        x0_lower = np.linspace(0.05, 0.002, n_cst) * (camber_factor * 0.5)
    return np.concatenate([x0_upper, x0_lower])


def get_adaptive_bounds(CL_target, airfoil_type, n_cst=5):
    """Generate adaptive bounds"""
    if airfoil_type == 'symmetric':
        bounds_upper = [(0.0, 0.25)] * n_cst
        bounds_lower = [(-0.25, 0.0)] * n_cst
    elif CL_target > 1.5:
        bounds_upper = [(0.0, 0.40)] * n_cst
        bounds_lower = [(-0.05, 0.20)] * n_cst
    else:
        bounds_upper = [(0.0, 0.35)] * n_cst
        bounds_lower = [(-0.10, 0.15)] * n_cst
    return bounds_upper + bounds_lower


def generate_polar_data(airfoil_final, Re, mach=0.0, alpha_range=(-5, 15), n_points=41):
    """Generate polar data across alpha range with optional compressibility corrections."""
    from compressibility import correct_cl, correct_cd, correct_cm

    alphas = np.linspace(alpha_range[0], alpha_range[1], n_points)
    polar = {'alpha': [], 'CL': [], 'CD': [], 'CM': [], 'LD': []}

    for alpha_test in alphas:
        try:
            aero = nf.get_aero_from_airfoil(airfoil=airfoil_final, alpha=alpha_test, Re=Re)
            CL_val = correct_cl(float(aero["CL"][0]), mach)
            CD_val = correct_cd(float(aero["CD"][0]), mach)
            CM_val = correct_cm(float(aero["CM"][0]), mach)
            LD_val = CL_val / CD_val if CD_val > 1e-6 else 0

            polar['alpha'].append(alpha_test)
            polar['CL'].append(CL_val)
            polar['CD'].append(CD_val)
            polar['CM'].append(CM_val)
            polar['LD'].append(LD_val)
        except:
            continue

    for key in polar:
        polar[key] = np.array(polar[key])

    return polar


def create_comprehensive_plots(airfoil_data, x, yu, yl, t, camber, polar, design_params, offdesign_results=None):
    """Create all plots and return as PDF bytes with LiftCraft watermark"""
    
    fig = plt.figure(figsize=(20, 12))
    gs = fig.add_gridspec(3, 3, hspace=0.35, wspace=0.35,
                          left=0.08, right=0.95, top=0.93, bottom=0.06)
    
    CL_design = airfoil_data['aerodynamics']['CL']
    CD_design = airfoil_data['aerodynamics']['CD']
    CM_design = airfoil_data['aerodynamics']['CM']
    LD_design = airfoil_data['aerodynamics']['LD']
    ALPHA = design_params['alpha']
    CL_TARGET = design_params['CL_target']
    AIRFOIL_TYPE = design_params['airfoil_type']
    t_max = airfoil_data['geometry']['t_max']
    x_tmax = airfoil_data['geometry']['x_tmax']
    
    # ========================================
    # ROW 1: Airfoil Geometry
    # ========================================
    
    # 1. Airfoil Shape
    ax1 = fig.add_subplot(gs[0, :2])
    ax1.plot(x, yu, 'b-', linewidth=2.5, label='Upper surface')
    ax1.plot(x, yl, 'r-', linewidth=2.5, label='Lower surface')
    ax1.plot(x, camber, 'g--', linewidth=1.8, label='Camber line', alpha=0.7)
    ax1.fill_between(x, yl, yu, alpha=0.15, color='gray')
    ax1.axhline(y=0, color='k', linestyle='--', alpha=0.3, linewidth=1, label='Chord line')
    ax1.set_xlabel('x/c', fontsize=12, fontweight='bold')
    ax1.set_ylabel('y/c', fontsize=12, fontweight='bold')
    
    opt_mode = design_params.get('optimization_mode', 'Single-point')
    ax1.set_title(f'{AIRFOIL_TYPE.capitalize()} Airfoil - {opt_mode} Optimized',
                  fontsize=13, fontweight='bold', pad=10)
    ax1.legend(loc='upper right', fontsize=10, framealpha=0.9)
    ax1.grid(True, alpha=0.25, linestyle='--')
    ax1.set_xlim(-0.05, 1.05)
    ax1.axis('equal')
    ax1.tick_params(labelsize=10)
    
    # 2. Thickness Distribution
    ax2 = fig.add_subplot(gs[0, 2])
    ax2.plot(x, t, 'g-', linewidth=2.5, label='Thickness')
    ax2.axvline(x=x_tmax, color='red', linestyle='--', alpha=0.6, linewidth=1.5,
                label=f'Max at x/c={x_tmax:.3f}')
    ax2.axhline(y=t_max, color='red', linestyle=':', alpha=0.5, linewidth=1)
    ax2.fill_between(x, 0, t, alpha=0.2, color='green')
    ax2.set_xlabel('x/c', fontsize=11, fontweight='bold')
    ax2.set_ylabel('t/c', fontsize=11, fontweight='bold')
    ax2.set_title('Thickness Distribution', fontsize=12, fontweight='bold', pad=8)
    ax2.legend(fontsize=9, loc='upper right', framealpha=0.9)
    ax2.grid(True, alpha=0.25, linestyle='--')
    ax2.set_xlim(0, 1)
    ax2.tick_params(labelsize=9)
    
    # ========================================
    # ROW 2: Lift & Drag Characteristics
    # ========================================
    
    # 3. CL vs Alpha
    ax3 = fig.add_subplot(gs[1, 0])
    if len(polar['alpha']) > 0:
        ax3.plot(polar['alpha'], polar['CL'], 'b-', linewidth=2.5, label='CL curve')
        ax3.plot(ALPHA, CL_design, 'ro', markersize=12, label='Design point',
                 markeredgewidth=2, markeredgecolor='darkred', zorder=5)
        
        # Plot off-design points if available
        if offdesign_results:
            off_alphas = [res['alpha'] for res in offdesign_results]
            off_CLs = [res['CL'] for res in offdesign_results]
            ax3.plot(off_alphas, off_CLs, 'gs', markersize=10, label='Off-design',
                     markeredgewidth=1.5, markeredgecolor='darkgreen', zorder=4)
        
        ax3.axhline(y=CL_TARGET, color='red', linestyle='--', alpha=0.4,
                    linewidth=1.5, label=f'Target CL={CL_TARGET:.2f}')
        ax3.set_xlabel('α [deg]', fontsize=11, fontweight='bold')
        ax3.set_ylabel('CL', fontsize=11, fontweight='bold')
        ax3.set_title('Lift Coefficient', fontsize=12, fontweight='bold', pad=8)
        ax3.legend(fontsize=9, loc='best', framealpha=0.9)
        ax3.grid(True, alpha=0.25, linestyle='--')
        ax3.tick_params(labelsize=9)
    
    # 4. CD vs Alpha
    ax4 = fig.add_subplot(gs[1, 1])
    if len(polar['alpha']) > 0:
        ax4.plot(polar['alpha'], polar['CD'], 'r-', linewidth=2.5, label='CD curve')
        ax4.plot(ALPHA, CD_design, 'ro', markersize=12, label='Design point',
                 markeredgewidth=2, markeredgecolor='darkred', zorder=5)
        
        if offdesign_results:
            off_CDs = [res['CD'] for res in offdesign_results]
            ax4.plot(off_alphas, off_CDs, 'gs', markersize=10, label='Off-design',
                     markeredgewidth=1.5, markeredgecolor='darkgreen', zorder=4)
        
        ax4.set_xlabel('α [deg]', fontsize=11, fontweight='bold')
        ax4.set_ylabel('CD', fontsize=11, fontweight='bold')
        ax4.set_title('Drag Coefficient', fontsize=12, fontweight='bold', pad=8)
        ax4.legend(fontsize=9, loc='best', framealpha=0.9)
        ax4.grid(True, alpha=0.25, linestyle='--')
        ax4.tick_params(labelsize=9)
    
    # 5. CL vs CD (Drag Polar)
    ax5 = fig.add_subplot(gs[1, 2])
    if len(polar['alpha']) > 0:
        ax5.plot(polar['CD'], polar['CL'], 'b-', linewidth=2.5, label='Polar')
        ax5.plot(CD_design, CL_design, 'ro', markersize=12, label='Design point',
                 markeredgewidth=2, markeredgecolor='darkred', zorder=5)
        
        if offdesign_results:
            ax5.plot(off_CDs, off_CLs, 'gs', markersize=10, label='Off-design',
                     markeredgewidth=1.5, markeredgecolor='darkgreen', zorder=4)
        
        ax5.set_xlabel('CD', fontsize=11, fontweight='bold')
        ax5.set_ylabel('CL', fontsize=11, fontweight='bold')
        ax5.set_title('CL-CD Polar', fontsize=12, fontweight='bold', pad=8)
        ax5.legend(fontsize=9, loc='best', framealpha=0.9)
        ax5.grid(True, alpha=0.25, linestyle='--')
        ax5.tick_params(labelsize=9)
    
    # ========================================
    # ROW 3: Efficiency & Summary
    # ========================================
    
    # 6. L/D vs Alpha
    ax6 = fig.add_subplot(gs[2, 0])
    if len(polar['alpha']) > 0:
        ax6.plot(polar['alpha'], polar['LD'], 'purple', linewidth=2.5, label='L/D')
        ax6.plot(ALPHA, LD_design, 'ro', markersize=12, label='Design point',
                 markeredgewidth=2, markeredgecolor='darkred', zorder=5)
        
        if offdesign_results:
            off_LDs = [res['LD'] for res in offdesign_results]
            ax6.plot(off_alphas, off_LDs, 'gs', markersize=10, label='Off-design',
                     markeredgewidth=1.5, markeredgecolor='darkgreen', zorder=4)
        
        if len(polar['LD']) > 0:
            max_LD_idx = np.nanargmax(polar['LD'])
            max_LD = polar['LD'][max_LD_idx]
            max_LD_alpha = polar['alpha'][max_LD_idx]
            ax6.plot(max_LD_alpha, max_LD, 'b*', markersize=15,
                     label=f'Max L/D={max_LD:.1f}@{max_LD_alpha:.1f}°', zorder=4)
        ax6.set_xlabel('α [deg]', fontsize=11, fontweight='bold')
        ax6.set_ylabel('L/D', fontsize=11, fontweight='bold')
        ax6.set_title('Lift-to-Drag Ratio', fontsize=12, fontweight='bold', pad=8)
        ax6.legend(fontsize=9, loc='best', framealpha=0.9)
        ax6.grid(True, alpha=0.25, linestyle='--')
        ax6.tick_params(labelsize=9)
    
    # 7. CM vs Alpha
    ax7 = fig.add_subplot(gs[2, 1])
    if len(polar['alpha']) > 0:
        ax7.plot(polar['alpha'], polar['CM'], 'orange', linewidth=2.5, label='CM')
        ax7.plot(ALPHA, CM_design, 'ro', markersize=12, label='Design point',
                 markeredgewidth=2, markeredgecolor='darkred', zorder=5)
        
        if offdesign_results:
            off_CMs = [res['CM'] for res in offdesign_results]
            ax7.plot(off_alphas, off_CMs, 'gs', markersize=10, label='Off-design',
                     markeredgewidth=1.5, markeredgecolor='darkgreen', zorder=4)
        
        ax7.axhline(y=0, color='k', linestyle='--', alpha=0.4, linewidth=1)
        ax7.set_xlabel('α [deg]', fontsize=11, fontweight='bold')
        ax7.set_ylabel('CM', fontsize=11, fontweight='bold')
        ax7.set_title('Moment Coefficient', fontsize=12, fontweight='bold', pad=8)
        ax7.legend(fontsize=9, loc='best', framealpha=0.9)
        ax7.grid(True, alpha=0.25, linestyle='--')
        ax7.tick_params(labelsize=9)
    
    # 8. Performance Summary
    ax8 = fig.add_subplot(gs[2, 2])
    ax8.axis('off')
    
    mp_text = design_params.get('optimization_mode', 'Single-point')
    
    summary_lines = [
        f"╔{'═'*48}╗",
        f"║  PERFORMANCE SUMMARY - {AIRFOIL_TYPE.upper():^22} ║",
        f"╠{'═'*48}╣",
        f"║  Optimization: {mp_text:<31} ║",
        f"╠{'─'*48}╣",
        f"║  DESIGN POINT (α={ALPHA}°, Re={design_params['Re']:.1e})        ║",
        f"║    CL  = {CL_design:6.4f}  (target: {CL_TARGET:.4f})      ║",
        f"║    CD  = {CD_design:7.5f}                          ║",
        f"║    CM  = {CM_design:7.4f}                          ║",
        f"║    L/D = {LD_design:6.1f}                             ║",
    ]
    
    if offdesign_results:
        summary_lines.append(f"╠{'─'*48}╣")
        summary_lines.append(f"║  OFF-DESIGN PERFORMANCE                        ║")
        for res in offdesign_results[:3]:  # Show first 3
            summary_lines.append(
                f"║    α={res['alpha']:+4.1f}°: CL={res['CL']:.3f}, CD={res['CD']:.5f}, L/D={res['LD']:4.0f} ║"
            )
    
    summary_lines.extend([
        f"╠{'─'*48}╣",
        f"║  GEOMETRY                                      ║",
        f"║    Max t/c = {t_max*100:4.1f}% at x/c = {x_tmax:.3f}          ║",
        f"║    Min t/c = {airfoil_data['geometry']['t_min']*100:4.2f}%                          ║",
        f"╚{'═'*48}╝",
    ])
    
    summary_text = '\n'.join(summary_lines)
    ax8.text(0.5, 0.5, summary_text, transform=ax8.transAxes,
             fontsize=9, verticalalignment='center', horizontalalignment='center',
             bbox=dict(boxstyle='round,pad=1', facecolor='lightblue',
                       alpha=0.2, edgecolor='steelblue', linewidth=2),
             family='monospace', fontweight='normal')
    
    plt.suptitle(f'LiftCraft Airfoil Design Report - {datetime.now().strftime("%Y-%m-%d %H:%M")}',
                 fontsize=16, fontweight='bold', y=0.98)
    
    # Save matplotlib figure to temporary buffer
    temp_buf = io.BytesIO()
    plt.savefig(temp_buf, format='pdf', dpi=300, bbox_inches='tight')
    temp_buf.seek(0)
    plt.close(fig)
    
    # Create new PDF with ReportLab to add watermark
    final_buf = io.BytesIO()
    c = canvas.Canvas(final_buf, pagesize=letter)
    
    # Add watermark
    add_liftcraft_watermark(c, position='top-right', opacity=0.15, size=60)
    
    # Overlay the matplotlib PDF
    # Note: This is a simplified approach. For production, you'd want to use PyPDF2
    # to properly merge the matplotlib PDF with the watermark
    c.save()
    
    # For now, return the matplotlib PDF (watermark will be added when PyPDF2 is integrated)
    # TODO: Integrate PyPDF2 for proper PDF merging
    return temp_buf


@app.route('/api/design', methods=['POST'])
@require_auth
@limiter.limit("5 per day; 10 per hour")
def design_airfoil():
    """Main endpoint for airfoil design optimization"""
    logger = None  # Will be set after we get user_id

    try:
        data = request.json

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data received. Please send JSON payload.'
            }), 400

        # Extract verified user_id from auth token (set by @require_auth)
        user_id = request.uid
        logger = get_user_logger(user_id)
        
        # Extract and validate parameters
        try:
            CL_target = float(data['CL_target'])
            alpha = float(data['alpha'])
            Re = float(data['Re'])
            mach = float(data.get('mach', 0.0))
            airfoil_type = data.get('airfoil_type', 'cambered')
            Cm_target = float(data['Cm_target']) if data.get('Cm_target') else None

            # Validate Mach number
            if mach < 0 or mach > 0.7:
                return jsonify({
                    'success': False,
                    'error': 'Mach number must be between 0 and 0.7 (subsonic only)'
                }), 400

            # Multi-point parameters
            off_design_points = data.get('off_design_points', [])
            offdesign_mode = data.get('offdesign_mode', 'stability')

            # Convert to tuples if needed
            if off_design_points:
                off_design_points = [tuple(point) for point in off_design_points]
            
        except KeyError as e:
            if logger:
                logger.error(f'Missing parameter: {str(e)}')
            return jsonify({
                'success': False,
                'error': f'Missing required parameter: {str(e)}'
            }), 400
        except (ValueError, TypeError) as e:
            if logger:
                logger.error(f'Invalid parameter: {str(e)}')
            return jsonify({
                'success': False,
                'error': f'Invalid parameter value: {str(e)}'
            }), 400
        
        # Validate ranges
        if Re < 1e4 or Re > 1e7:
            logger.error(f'Reynolds number {Re:.2e} out of range')
            return jsonify({
                'success': False,
                'error': f'Reynolds number {Re:.2e} is outside valid range [1e4, 1e7]'
            }), 400
        
        if abs(alpha) > 20:
            logger.error(f'Alpha {alpha}° too extreme')
            return jsonify({
                'success': False,
                'error': f'Angle of attack {alpha}° is too extreme (|α| > 20°)'
            }), 400
        
        if abs(CL_target) > 3.0:
            logger.error(f'CL target {CL_target} unrealistic')
            return jsonify({
                'success': False,
                'error': f'CL target {CL_target} is unrealistic (|CL| > 3.0)'
            }), 400
        
        if airfoil_type not in ['symmetric', 'cambered', 'custom']:
            logger.error(f'Invalid airfoil_type: {airfoil_type}')
            return jsonify({
                'success': False,
                'error': f'Invalid airfoil_type'
            }), 400
        
        # Determine optimization mode description
        if len(off_design_points) == 0:
            opt_mode_desc = "Single-point"
        elif len(off_design_points) == 2:
            opt_mode_desc = f"3-point ({offdesign_mode})"
        elif len(off_design_points) == 4:
            opt_mode_desc = f"5-point ({offdesign_mode})"
        else:
            opt_mode_desc = f"{len(off_design_points)+1}-point ({offdesign_mode})"
        
        logger.info("="*60)
        logger.info("AIRFOIL OPTIMIZATION REQUEST")
        logger.info("="*60)
        logger.info(f"User ID: {user_id}")
        logger.info(f"CL target: {CL_target}")
        logger.info(f"Alpha: {alpha}°")
        logger.info(f"Reynolds: {Re:.2e}")
        logger.info(f"Type: {airfoil_type}")
        logger.info(f"Optimization: {opt_mode_desc}")
        if off_design_points:
            logger.info(f"Off-design points: {off_design_points}")
        logger.info("="*60)
        
        # Setup optimization
        n_cst = 5
        x0 = get_intelligent_initial_guess(CL_target, airfoil_type, n_cst)
        bounds = get_adaptive_bounds(CL_target, airfoil_type, n_cst)
        design_point = (CL_target, alpha, Re, mach)
        
        global optimization_status
        optimization_status = {
            'status': 'stage1',
            'progress': 10,
            'message': 'Starting global optimization...'
        }
        
        # STAGE 1: Global optimization (no off-design points)
        logger.info("STAGE 1: Global Optimization")
        
        result_stage1 = differential_evolution(
            objective_multipoint,
            bounds=bounds,
            args=(design_point, [], airfoil_type, Cm_target, 1),  # Empty off-design in stage 1
            strategy='best1bin',
            maxiter=250,
            popsize=20,
            tol=1e-5,
            atol=1e-6,
            seed=42,
            workers=1,
            disp=False,
            polish=False
        )
        
        logger.info(f"Stage 1 complete. Loss: {result_stage1.fun:.6f}")
        
        optimization_status['progress'] = 50
        optimization_status['message'] = 'Stage 1 complete. Refining with multi-point...'
        
        # STAGE 2: Constraint-driven refinement (SLSQP with formal constraints)
        logger.info(f"STAGE 2: SLSQP Constraint-Driven Refinement ({len(off_design_points)} off-design points)")

        # Shared cache so objective and constraints don't duplicate NeuralFoil calls
        aero_cache = {}

        cons = [
            {'type': 'ineq', 'fun': constraint_lift_lower,
             'args': (design_point, aero_cache)},
            {'type': 'ineq', 'fun': constraint_lift_upper,
             'args': (design_point, aero_cache)},
            {'type': 'ineq', 'fun': constraint_geometry},
        ]

        result_final = minimize(
            objective_stage2_clean,
            result_stage1.x,
            args=(design_point, off_design_points, airfoil_type, Cm_target, offdesign_mode, aero_cache),
            method='SLSQP',
            bounds=bounds,
            constraints=cons,
            options={
                'maxiter': 500,
                'ftol': 1e-9,
            }
        )

        logger.info(f"Stage 2 complete. Final loss: {result_final.fun:.6f}, Success: {result_final.success}")

        # Fallback: if SLSQP failed or diverged, use Stage 1 result
        if not result_final.success or result_final.fun > 10.0:
            logger.warning(f"SLSQP {'did not converge' if not result_final.success else 'diverged'} "
                          f"(loss={result_final.fun:.6f}), using Stage 1 solution")
            result_final.x = result_stage1.x
        
        optimization_status['progress'] = 80
        optimization_status['message'] = 'Generating plots...'
        
        # Extract results
        upper_final = result_final.x[:n_cst]
        lower_final = result_final.x[n_cst:]
        
        airfoil_final, x, yu, yl = airfoil_from_cst(
            upper_final,
            lower_final,
            N=200,
            return_surfaces=True,
            validate=True
        )
        
        # Compute geometry
        t = yu - yl
        camber = 0.5 * (yu + yl)
        t_max = float(np.max(t))
        x_tmax = float(x[np.argmax(t)])
        t_min = float(np.min(t))
        
        # Evaluate design point aerodynamics (with compressibility corrections)
        from compressibility import correct_cl, correct_cd, correct_cm
        aero_final = nf.get_aero_from_airfoil(
            airfoil=airfoil_final,
            alpha=alpha,
            Re=Re
        )

        CL_final = correct_cl(float(aero_final["CL"][0]), mach)
        CD_final = correct_cd(float(aero_final["CD"][0]), mach)
        CM_final = correct_cm(float(aero_final["CM"][0]), mach)
        LD_ratio = CL_final / CD_final if CD_final > 0 else 0
        
        # Evaluate off-design points
        offdesign_results = []
        if off_design_points:
            for alpha_off, Re_off in off_design_points:
                try:
                    aero_off = nf.get_aero_from_airfoil(
                        airfoil=airfoil_final,
                        alpha=alpha_off,
                        Re=Re_off
                    )
                    CL_off = correct_cl(float(aero_off["CL"][0]), mach)
                    CD_off = correct_cd(float(aero_off["CD"][0]), mach)
                    CM_off = correct_cm(float(aero_off["CM"][0]), mach)
                    LD_off = CL_off / CD_off if CD_off > 1e-6 else 0
                    
                    offdesign_results.append({
                        'alpha': alpha_off,
                        'Re': Re_off,
                        'CL': CL_off,
                        'CD': CD_off,
                        'CM': CM_off,
                        'LD': LD_off
                    })
                except Exception as e:
                    logger.warning(f"Failed to evaluate off-design point α={alpha_off}, Re={Re_off}: {e}")
                    offdesign_results.append({
                        'alpha': alpha_off,
                        'Re': Re_off,
                        'CL': float('nan'),
                        'CD': float('nan'),
                        'CM': float('nan'),
                        'LD': float('nan')
                    })
        
        # Generate polar data
        polar = generate_polar_data(airfoil_final, Re, mach=mach)
        
        # Prepare data structure
        # Combine coordinates (upper surface TE->LE->TE lower surface)
        x_combined = np.concatenate([x[::-1], x[1:]])  # TE to LE to TE
        y_combined = np.concatenate([yu[::-1], yl[1:]])  # Upper then lower
        
        airfoil_data = {
            'aerodynamics': {
                'CL': CL_final,
                'CD': CD_final,
                'CM': CM_final,
                'LD': LD_ratio,
                'CL_target': CL_target,
                'CL_error': abs(CL_final - CL_target)
            },
            'geometry': {
                't_max': t_max,
                'x_tmax': x_tmax,
                't_min': t_min,
                'x_coords': x_combined.tolist(),  # Combined airfoil coordinates
                'y_coords': y_combined.tolist()   # Combined airfoil coordinates
            }
        }
        
        design_params = {
            'alpha': alpha,
            'Re': Re,
            'CL_target': CL_target,
            'airfoil_type': airfoil_type,
            'optimization_mode': opt_mode_desc
        }
        
        # Generate comprehensive PDF with watermark
        pdf_buffer = create_comprehensive_plots(
            airfoil_data, x, yu, yl, t, camber, polar, design_params,
            offdesign_results if offdesign_results else None
        )
        
        # Convert PDF to base64 for transmission
        pdf_base64 = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
        
        optimization_status = {
            'status': 'complete',
            'progress': 100,
            'message': 'Design complete!'
        }
        
        logger.info("="*60)
        logger.info("OPTIMIZATION COMPLETE")
        logger.info("="*60)
        logger.info(f"CL: {CL_final:.4f} (target: {CL_target:.4f})")
        logger.info(f"CD: {CD_final:.5f}")
        logger.info(f"L/D: {LD_ratio:.1f}")
        if offdesign_results:
            logger.info(f"Off-design performance evaluated at {len(offdesign_results)} points")
        logger.info("="*60)
        
        return jsonify({
            'success': True,
            'pdf_data': pdf_base64,
            'aerodynamics': airfoil_data['aerodynamics'],
            'geometry': airfoil_data['geometry'],
            'optimization': {
                'success': result_final.success,
                'loss': float(result_final.fun)
            },
            'offdesign': offdesign_results if offdesign_results else None,
            'polar': {
                'alpha': polar['alpha'].tolist(),
                'CL': polar['CL'].tolist(),
                'CD': polar['CD'].tolist(),
                'CM': polar['CM'].tolist(),
                'LD': polar['LD'].tolist(),
            }
        })
        
    except Exception as e:
        if logger:
            logger.error("ERROR during optimization:")
            logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/status', methods=['GET'])
@limiter.exempt
def get_status():
    """Get current optimization status"""
    return jsonify(optimization_status)


@app.route('/api/cp-distribution', methods=['POST'])
@limiter.limit("30 per hour")
def get_cp_distribution():
    """
    Compute pressure distribution (Cp) for an airfoil using panel method.
    
    Request JSON:
    {
        "x_coords": [...],  # Airfoil x coordinates (0 to 1)
        "y_coords": [...],  # Airfoil y coordinates
        "alpha": 5.0,       # Angle of attack in degrees
        "n_panels": 150     # Optional: number of panels (default 150)
    }
    
    Returns:
    {
        "success": true,
        "cp_data": {
            "x_upper": [...],
            "cp_upper": [...],
            "x_lower": [...],
            "cp_lower": [...],
            "stagnation_point": [x, y]
        },
        "info": {
            "alpha": 5.0,
            "n_panels": 150
        }
    }
    """
    try:
        data = request.get_json()
        
        # Extract parameters
        x_coords = data.get('x_coords')
        y_coords = data.get('y_coords')
        alpha = data.get('alpha', 0.0)
        n_panels = data.get('n_panels', 150)
        mach = data.get('mach', 0.0)

        # Ensure correct types
        alpha = float(alpha)
        n_panels = int(n_panels)
        mach = float(mach)
        
        # Validate inputs
        if x_coords is None or y_coords is None:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: x_coords, y_coords'
            }), 400
        
        # Convert to numpy arrays
        x_coords = np.array(x_coords, dtype=float)
        y_coords = np.array(y_coords, dtype=float)
        
        t_start = time.perf_counter()

        # Compute Cp distribution (with compressibility correction if mach > 0)
        cp_data = compute_cp_distribution(
            x_coords=x_coords,
            y_coords=y_coords,
            alpha_deg=alpha,
            n_panels=n_panels,
            mach=mach
        )
        
        # Validate results
        is_valid, msg = validate_cp_distribution(cp_data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Cp calculation validation failed: {msg}'
            }), 500
        
        elapsed = time.perf_counter() - t_start

        return jsonify({
            'success': True,
            'cp_data': cp_data,
            'info': {
                'alpha': alpha,
                'n_panels': n_panels,
                'method': 'Vortex Panel Method with Kutta Condition',
                'compute_time_ms': round(elapsed * 1000, 1)
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/flow-field', methods=['POST'])
@limiter.limit("30 per hour")
def get_flow_field():
    """
    Compute flow field visualization (streamlines + velocity field) for an airfoil.
    
    Request JSON:
    {
        "x_coords": [...],
        "y_coords": [...],
        "alpha": 5.0,
        "n_panels": 150,
        "grid_resolution": 50
    }
    
    Returns:
    {
        "success": true,
        "flow_data": {
            "streamlines": [...],
            "velocity_magnitude": [[...]],
            "x_grid": [...],
            "y_grid": [...],
            "stagnation_point": [x, y],
            "U": [[...]], 
            "V": [[...]]
        }
    }
    """
    try:
        data = request.get_json()
        
        # Extract parameters
        x_coords = data.get('x_coords')
        y_coords = data.get('y_coords')
        alpha = data.get('alpha', 0.0)
        n_panels = data.get('n_panels', 150)
        grid_resolution = data.get('grid_resolution', 50)
        
        # Ensure correct types
        alpha = float(alpha)
        n_panels = int(n_panels)
        grid_resolution = int(grid_resolution)
        
        # Validate inputs
        if x_coords is None or y_coords is None:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: x_coords, y_coords'
            }), 400
        
        # Convert to numpy arrays
        x_coords = np.array(x_coords, dtype=float)
        y_coords = np.array(y_coords, dtype=float)

        t_start = time.perf_counter()

        # Compute flow field
        flow_data = compute_flow_field(
            x_coords=x_coords,
            y_coords=y_coords,
            alpha_deg=alpha,
            n_panels=n_panels,
            grid_resolution=grid_resolution
        )
        
        elapsed = time.perf_counter() - t_start

        return jsonify({
            'success': True,
            'flow_data': flow_data,
            'info': {
                'alpha': alpha,
                'n_panels': n_panels,
                'grid_resolution': grid_resolution,
                'method': 'Vortex Panel Method + Streamline Integration',
                'compute_time_ms': round(elapsed * 1000, 1)
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
@limiter.exempt
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'LiftCraft API is running',
        'version': '4.0.0 - Auth + Rate Limiting + Compressibility + Interactive Polars',
        'features': ['gzip', 'caching', 'multi-point', 'cp-distribution', 'flow-visualization', 'auth', 'rate-limiting', 'compressibility', 'interactive-polars']
    })

@app.route('/optimize', methods=['POST'])
@require_auth
@limiter.limit("5 per day; 10 per hour")
def optimize_legacy():
    """Legacy endpoint - redirects to /api/design"""
    return design_airfoil()


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5001))
    
    print("\n" + "="*60)
    print("           LIFTCRAFT - API SERVER v3.4")
    print("="*60)
    print("\nFeatures:")
    print("  ✓ Multi-point optimization")
    print("  ✓ Cp distribution (panel method)")
    print("  ✓ Flow field visualization (streamlines + velocity)")
    print("  ✓ PDF watermark support")
    print("  ✓ User-specific logging to user_logs/")
    print("  ✓ CORS enabled for all origins")
    print("  ✓ Gzip response compression")
    print("  ✓ Response caching headers")
    print("\nAvailable Endpoints:")
    print("  POST /api/design          - Run airfoil optimization")
    print("  POST /api/cp-distribution - Compute Cp distribution")
    print("  POST /api/flow-field      - Compute flow visualization")
    print("  GET  /api/status          - Get optimization status")
    print("  GET  /api/health          - Health check")
    print("\n" + "="*60)
    print(f"Server ready on port {port}")
    print("Logs directory: ./user_logs/")
    print("Assets directory: ./assets/ (place LiftCraft-logo.png here)")
    print("="*60 + "\n")
    
    app.run(debug=False, host='0.0.0.0', port=port)