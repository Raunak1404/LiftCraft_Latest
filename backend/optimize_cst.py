import numpy as np
from scipy.optimize import minimize, differential_evolution
import matplotlib.pyplot as plt
import neuralfoil as nf
from objectives import objective_multipoint, evaluate_polar, objective_stage2_clean, constraint_lift_lower, constraint_lift_upper, constraint_geometry
from geometry import airfoil_from_cst


def get_user_inputs_multipoint():
    """Get design requirements including multi-point options"""
    print("\n" + "="*70)
    print("        MULTI-POINT INVERSE AIRFOIL DESIGN SYSTEM")
    print("="*70)
    print("\nDesign airfoils that are stable across multiple flight conditions!\n")
    
    # Basic aerodynamic inputs
    print("PRIMARY DESIGN POINT:")
    CL_target = float(input("  Target CL (e.g., 1.2): "))
    alpha = float(input("  Angle of attack [deg] (e.g., 5.0): "))
    Re = float(input("  Reynolds number (e.g., 1e6): "))
    
    # Airfoil type
    print("\n" + "-"*70)
    print("AIRFOIL TYPE:")
    print("  [1] Symmetric (Cm ≈ 0, no camber)")
    print("  [2] Cambered (realistic Cm for given CL)")
    print("  [3] Custom Cm target")
    print("-"*70)
    
    type_choice = input("Enter choice [1/2/3] (default: 2): ").strip()
    
    if type_choice == '1':
        airfoil_type = 'symmetric'
        Cm_target = None
        print("  → Symmetric airfoil selected")
    elif type_choice == '3':
        airfoil_type = 'custom'
        Cm_target = float(input("  Enter target Cm (e.g., -0.05): "))
        print(f"  → Custom Cm target: {Cm_target}")
    else:
        airfoil_type = 'cambered'
        Cm_target = None
        print("  → Cambered airfoil selected")
    
    # Multi-point options
    print("\n" + "-"*70)
    print("MULTI-POINT OPTIMIZATION:")
    print("  Optimize for stability across multiple (α, Re) conditions")
    print("\n  [1] Single-point only (fastest)")
    print("  [2] 3-point: Design ± 2° alpha (good stability)")
    print("  [3] 5-point: Design ± 2°, ±4° alpha (excellent stability)")
    print("  [4] Custom points")
    print("-"*70)
    
    mp_choice = input("Enter choice [1/2/3/4] (default: 2): ").strip()
    
    off_design_points = []
    offdesign_mode = 'stability'
    
    if mp_choice == '1':
        print("  → Single-point optimization")
    elif mp_choice == '3':
        off_design_points = [
            (alpha - 4, Re),
            (alpha - 2, Re),
            (alpha + 2, Re),
            (alpha + 4, Re)
        ]
        print(f"  → 5-point optimization: α = [{alpha-4}, {alpha-2}, {alpha}, {alpha+2}, {alpha+4}]°")
    elif mp_choice == '4':
        print("\n  Enter off-design points (one per line, format: alpha Re)")
        print("  Example: 3.0 1e6")
        print("  Enter blank line when done:")
        while True:
            line = input("  > ").strip()
            if not line:
                break
            try:
                a, r = line.split()
                off_design_points.append((float(a), float(r)))
            except:
                print("    Invalid format, try again")
        print(f"  → Custom {len(off_design_points)} off-design points added")
    else:  # Default: 3-point
        off_design_points = [
            (alpha - 2, Re),
            (alpha + 2, Re)
        ]
        print(f"  → 3-point optimization: α = [{alpha-2}, {alpha}, {alpha+2}]°")
    
    if off_design_points:
        print("\n  Off-design objective:")
        print("  [1] Stability (minimize CD increase, avoid stall)")
        print("  [2] Performance (maintain L/D ratio)")
        mode_choice = input("  Enter choice [1/2] (default: 1): ").strip()
        offdesign_mode = 'performance' if mode_choice == '2' else 'stability'
        print(f"  → {offdesign_mode.capitalize()} mode selected")
    
    print("\n" + "="*70)
    return CL_target, alpha, Re, airfoil_type, Cm_target, off_design_points, offdesign_mode


def validate_inputs(CL_target, alpha, Re, airfoil_type):
    """Validate user inputs"""
    warnings = []
    
    if Re < 1e4 or Re > 1e7:
        warnings.append(f"⚠️  Re={Re:.2e} is outside typical range [1e4, 1e7]")
    if CL_target > 2.0:
        warnings.append(f"⚠️  CL={CL_target} is very high")
    if abs(alpha) > 15:
        warnings.append(f"⚠️  |α|={abs(alpha)}° is high")
    if airfoil_type == 'symmetric' and CL_target > 0.5:
        warnings.append(f"⚠️  Symmetric airfoil with CL={CL_target} may require high α")
    
    if warnings:
        print("\n⚠️  INPUT WARNINGS:")
        for w in warnings:
            print(f"  {w}")
        proceed = input("\nProceed anyway? [y/n]: ").strip().lower()
        if proceed != 'y':
            exit(0)


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


# ================================================
# MAIN OPTIMIZATION SCRIPT
# ================================================

# Get user inputs
CL_TARGET, ALPHA, RE, AIRFOIL_TYPE, CM_TARGET, OFF_DESIGN_POINTS, OFFDESIGN_MODE = get_user_inputs_multipoint()
validate_inputs(CL_TARGET, ALPHA, RE, AIRFOIL_TYPE)

n_cst = 5
x0 = get_intelligent_initial_guess(CL_TARGET, AIRFOIL_TYPE, n_cst)
bounds = get_adaptive_bounds(CL_TARGET, AIRFOIL_TYPE, n_cst)

design_point = (CL_TARGET, ALPHA, RE)

# ------------------------------------------------
# STAGE 1: Global search
# ------------------------------------------------
print("\n" + "="*70)
print("STAGE 1: Global Aerodynamic Optimization")
print("="*70)
print("Using Differential Evolution for global search...")
if OFF_DESIGN_POINTS:
    print(f"Considering {len(OFF_DESIGN_POINTS)} off-design points...")
print("This may take 5-10 minutes...\n")

result_stage1 = differential_evolution(
    objective_multipoint,
    bounds=bounds,
    args=(design_point, [], AIRFOIL_TYPE, CM_TARGET, 1),  # Empty off-design in Stage 1
    strategy='best1bin',
    maxiter=250,
    popsize=20,
    tol=1e-5,
    atol=1e-6,
    seed=42,
    workers=1,
    disp=True,
    polish=False
)

print(f"\n✓ Stage 1 complete")
print(f"  Loss: {result_stage1.fun:.6f}")

# Check Stage 1 results
upper_s1 = result_stage1.x[:n_cst]
lower_s1 = result_stage1.x[n_cst:]
airfoil_s1, x_s1, yu_s1, yl_s1 = airfoil_from_cst(upper_s1, lower_s1, return_surfaces=True)
t_s1 = yu_s1 - yl_s1

aero_s1 = nf.get_aero_from_airfoil(airfoil=airfoil_s1, alpha=ALPHA, Re=RE)
CL_s1 = float(aero_s1["CL"][0])
CD_s1 = float(aero_s1["CD"][0])
CM_s1 = float(aero_s1["CM"][0])

print(f"  CL: {CL_s1:.4f} (target: {CL_TARGET:.4f})")
print(f"  CD: {CD_s1:.5f}")
print(f"  CM: {CM_s1:.4f}")
print(f"  L/D: {CL_s1/CD_s1:.1f}")

# ------------------------------------------------
# STAGE 2: Multi-point refinement
# ------------------------------------------------
print("\n" + "="*70)
print("STAGE 2: Multi-Point Refinement & Constraint Enforcement")
print("="*70)
if OFF_DESIGN_POINTS:
    print(f"Optimizing across {len(OFF_DESIGN_POINTS)+1} flight conditions...")
    print(f"Mode: {OFFDESIGN_MODE}")
else:
    print("Single-point refinement...")
print("\n")

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
    args=(design_point, OFF_DESIGN_POINTS, AIRFOIL_TYPE, CM_TARGET, OFFDESIGN_MODE, aero_cache),
    method='SLSQP',
    bounds=bounds,
    constraints=cons,
    options={
        'maxiter': 500,
        'ftol': 1e-9,
    }
)

print(f"\n✓ Stage 2 complete (SLSQP)")
print(f"  Final loss: {result_final.fun:.6f}")
print(f"  Converged: {result_final.success}")
if not result_final.success:
    print(f"  Message: {result_final.message}")

# Fallback: if SLSQP failed or diverged, use Stage 1 result
if not result_final.success or result_final.fun > 10.0:
    print("\n⚠️  WARNING: SLSQP did not converge or diverged!")
    print("  Falling back to Stage 1 solution...")
    result_final.x = result_stage1.x

# ------------------------------------------------
# Final evaluation
# ------------------------------------------------
upper_final = result_final.x[:n_cst]
lower_final = result_final.x[n_cst:]
airfoil_final, x, yu, yl = airfoil_from_cst(upper_final, lower_final, return_surfaces=True)
t = yu - yl

# Design point
aero_design = nf.get_aero_from_airfoil(airfoil=airfoil_final, alpha=ALPHA, Re=RE)
CL_design = float(aero_design["CL"][0])
CD_design = float(aero_design["CD"][0])
CM_design = float(aero_design["CM"][0])
LD_design = CL_design / CD_design if CD_design > 0 else 0

# Off-design points
offdesign_results = []
if OFF_DESIGN_POINTS:
    for alpha_off, Re_off in OFF_DESIGN_POINTS:
        try:
            aero_off = nf.get_aero_from_airfoil(airfoil=airfoil_final, alpha=alpha_off, Re=Re_off)
            offdesign_results.append({
                'alpha': alpha_off,
                'Re': Re_off,
                'CL': float(aero_off["CL"][0]),
                'CD': float(aero_off["CD"][0]),
                'CM': float(aero_off["CM"][0])
            })
        except:
            offdesign_results.append({
                'alpha': alpha_off,
                'Re': Re_off,
                'CL': np.nan,
                'CD': np.nan,
                'CM': np.nan
            })

# Geometry
t_max = float(np.max(t))
x_tmax = float(x[np.argmax(t)])

# CRITICAL: Check minimum thickness EXCLUDING LE and TE (which are forced to 0)
# Only check interior points (x between 0.01 and 0.99)
interior_mask = (x > 0.01) & (x < 0.99)
t_interior = t[interior_mask]
t_min_interior = float(np.min(t_interior)) if t_interior.size > 0 else 0.0
t_min = float(np.min(t))  # Keep this for display (includes LE/TE)

# CRITICAL: Validate minimum thickness (interior only!)
if t_min_interior < 0.001:
    print("\n" + "="*70)
    print("❌ CRITICAL ERROR: Airfoil has self-intersection!")
    print("="*70)
    print(f"  Minimum interior thickness: {t_min_interior:.6f}")
    print(f"  (Note: LE and TE are correctly at 0.000)")
    print("\n  The optimization created conflicting constraints.")
    print("  RECOMMENDATIONS:")
    print("  1. Try single-point optimization first")
    print("  2. Use fewer off-design points")
    print("  3. Reduce off-design weight (currently 0.15)")
    print("  4. Increase alpha spacing (use ±3° instead of ±2°)")
    print("\n  Would you like to see Stage 1 results instead? [y/n]: ", end="")
    
    use_stage1 = input().strip().lower()
    if use_stage1 == 'y':
        upper_final = upper_s1
        lower_final = lower_s1
        airfoil_final = airfoil_s1
        x, yu, yl = x_s1, yu_s1, yl_s1
        t = t_s1
        CL_design = CL_s1
        CD_design = CD_s1
        CM_design = CM_s1
        LD_design = CL_s1 / CD_s1
        t_max = float(np.max(t_s1))
        x_tmax = float(x_s1[np.argmax(t_s1)])
        t_min = float(np.min(t_s1))
        t_min_interior = float(np.min(t_s1[(x_s1 > 0.01) & (x_s1 < 0.99)]))
        offdesign_results = []  # Clear off-design
        print("\n  ✓ Using Stage 1 solution (no off-design optimization)")
    else:
        print("\n  Continuing with flawed design for visualization...")
        print("="*70)

# ------------------------------------------------
# Generate polar data for visualization
# ------------------------------------------------
print("\nGenerating polar curves for visualization...")
alpha_range = np.linspace(-5, 15, 41)
polar = {'alpha': [], 'CL': [], 'CD': [], 'CM': [], 'LD': []}

for alpha_test in alpha_range:
    try:
        aero = nf.get_aero_from_airfoil(airfoil=airfoil_final, alpha=alpha_test, Re=RE)
        CL_val = float(aero["CL"][0])
        CD_val = float(aero["CD"][0])
        CM_val = float(aero["CM"][0])
        LD_val = CL_val / CD_val if CD_val > 1e-6 else 0
        
        polar['alpha'].append(alpha_test)
        polar['CL'].append(CL_val)
        polar['CD'].append(CD_val)
        polar['CM'].append(CM_val)
        polar['LD'].append(LD_val)
    except Exception as e:
        # Skip failed evaluations (e.g., stall conditions)
        continue

# Convert to numpy arrays for easier plotting
polar['alpha'] = np.array(polar['alpha'])
polar['CL'] = np.array(polar['CL'])
polar['CD'] = np.array(polar['CD'])
polar['CM'] = np.array(polar['CM'])
polar['LD'] = np.array(polar['LD'])

print(f"  ✓ Generated polar with {len(polar['alpha'])} points")

# ------------------------------------------------
# Results
# ------------------------------------------------
print("\n" + "="*70)
print("FINAL RESULTS")
print("="*70)

print(f"\nDESIGN TYPE: {AIRFOIL_TYPE.upper()}")
if OFF_DESIGN_POINTS:
    print(f"OPTIMIZATION: Multi-point ({len(OFF_DESIGN_POINTS)+1} conditions, {OFFDESIGN_MODE})")

print("\nDESIGN POINT PERFORMANCE:")
print(f"  α = {ALPHA}°, Re = {RE:.2e}")
print(f"  CL = {CL_design:.4f} (target: {CL_TARGET:.4f}, error: {abs(CL_design-CL_TARGET):.4f})")
print(f"  CD = {CD_design:.5f}")
print(f"  CM = {CM_design:.4f}")
print(f"  L/D = {LD_design:.1f}")

if offdesign_results:
    print("\nOFF-DESIGN PERFORMANCE:")
    for res in offdesign_results:
        LD_off = res['CL'] / res['CD'] if res['CD'] > 1e-6 else 0
        print(f"  α={res['alpha']:+.1f}°, Re={res['Re']:.2e}: CL={res['CL']:.3f}, CD={res['CD']:.5f}, L/D={LD_off:.1f}")

print("\nGEOMETRY:")
print(f"  Max thickness: {t_max:.4f} at x/c = {x_tmax:.3f}")
print(f"  Min thickness: {t_min:.4f} (at LE/TE, as expected)")
print(f"  Min interior thickness: {t_min_interior:.4f} (excludes LE/TE)")

print("\nCST COEFFICIENTS:")
print(f"  Upper: {upper_final}")
print(f"  Lower: {lower_final}")

# ================================================
# IMPROVED VISUALIZATION
# ================================================

fig = plt.figure(figsize=(20, 12))
gs = fig.add_gridspec(3, 3, hspace=0.35, wspace=0.35, 
                       left=0.08, right=0.95, top=0.93, bottom=0.06)

# ============================================
# ROW 1: Airfoil Geometry
# ============================================

# 1. Airfoil Shape (larger, spans 2 columns)
ax1 = fig.add_subplot(gs[0, :2])
ax1.plot(x, yu, 'b-', linewidth=2.5, label='Upper surface')
ax1.plot(x, yl, 'r-', linewidth=2.5, label='Lower surface')

# Add camber line
camber = 0.5 * (yu + yl)
ax1.plot(x, camber, 'g--', linewidth=1.8, label='Camber line', alpha=0.7)

ax1.fill_between(x, yl, yu, alpha=0.15, color='gray')
ax1.axhline(y=0, color='k', linestyle='--', alpha=0.3, linewidth=1, label='Chord line')
ax1.set_xlabel('x/c', fontsize=12, fontweight='bold')
ax1.set_ylabel('y/c', fontsize=12, fontweight='bold')
ax1.set_title(f'{AIRFOIL_TYPE.capitalize()} Airfoil - Multi-Point Optimized', 
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

# ============================================
# ROW 2: Lift & Drag Characteristics
# ============================================

# 3. CL vs Alpha (Lift Polar)
ax3 = fig.add_subplot(gs[1, 0])
if len(polar['alpha']) > 0:
    ax3.plot(polar['alpha'], polar['CL'], 'b-', linewidth=2.5, label='CL curve')
    ax3.plot(ALPHA, CL_design, 'ro', markersize=12, label='Design point', 
             markeredgewidth=2, markeredgecolor='darkred', zorder=5)
    if OFF_DESIGN_POINTS and offdesign_results:
        off_alphas = [res['alpha'] for res in offdesign_results if not np.isnan(res['CL'])]
        off_CLs = [res['CL'] for res in offdesign_results if not np.isnan(res['CL'])]
        if off_alphas:
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

# 4. CD vs Alpha (Drag Polar)
ax4 = fig.add_subplot(gs[1, 1])
if len(polar['alpha']) > 0:
    ax4.plot(polar['alpha'], polar['CD'], 'r-', linewidth=2.5, label='CD curve')
    ax4.plot(ALPHA, CD_design, 'ro', markersize=12, label='Design point',
             markeredgewidth=2, markeredgecolor='darkred', zorder=5)
    if OFF_DESIGN_POINTS and offdesign_results:
        off_CDs = [res['CD'] for res in offdesign_results if not np.isnan(res['CD'])]
        if off_CDs and off_alphas:
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
    if OFF_DESIGN_POINTS and offdesign_results and off_CDs and off_CLs:
        ax5.plot(off_CDs, off_CLs, 'gs', markersize=10, label='Off-design',
                 markeredgewidth=1.5, markeredgecolor='darkgreen', zorder=4)
    ax5.set_xlabel('CD', fontsize=11, fontweight='bold')
    ax5.set_ylabel('CL', fontsize=11, fontweight='bold')
    ax5.set_title('CL-CD Polar', fontsize=12, fontweight='bold', pad=8)
    ax5.legend(fontsize=9, loc='best', framealpha=0.9)
    ax5.grid(True, alpha=0.25, linestyle='--')
    ax5.tick_params(labelsize=9)

# ============================================
# ROW 3: Efficiency & Summary
# ============================================

# 6. L/D vs Alpha
ax6 = fig.add_subplot(gs[2, 0])
if len(polar['alpha']) > 0:
    ax6.plot(polar['alpha'], polar['LD'], 'purple', linewidth=2.5, label='L/D')
    ax6.plot(ALPHA, LD_design, 'ro', markersize=12, label='Design point',
             markeredgewidth=2, markeredgecolor='darkred', zorder=5)
    if OFF_DESIGN_POINTS and offdesign_results:
        off_LDs = [res['CL']/res['CD'] if res['CD'] > 1e-6 else 0 
                   for res in offdesign_results if not np.isnan(res['CL'])]
        if off_LDs and off_alphas:
            ax6.plot(off_alphas, off_LDs, 'gs', markersize=10, label='Off-design',
                     markeredgewidth=1.5, markeredgecolor='darkgreen', zorder=4)
    # Mark maximum L/D
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

# 7. CM vs Alpha (Moment Coefficient)
ax7 = fig.add_subplot(gs[2, 1])
if len(polar['alpha']) > 0:
    ax7.plot(polar['alpha'], polar['CM'], 'orange', linewidth=2.5, label='CM')
    ax7.plot(ALPHA, CM_design, 'ro', markersize=12, label='Design point',
             markeredgewidth=2, markeredgecolor='darkred', zorder=5)
    if OFF_DESIGN_POINTS and offdesign_results:
        off_CMs = [res['CM'] for res in offdesign_results if not np.isnan(res['CM'])]
        if off_CMs and off_alphas:
            ax7.plot(off_alphas, off_CMs, 'gs', markersize=10, label='Off-design',
                     markeredgewidth=1.5, markeredgecolor='darkgreen', zorder=4)
    ax7.axhline(y=0, color='k', linestyle='--', alpha=0.4, linewidth=1)
    ax7.set_xlabel('α [deg]', fontsize=11, fontweight='bold')
    ax7.set_ylabel('CM', fontsize=11, fontweight='bold')
    ax7.set_title('Moment Coefficient', fontsize=12, fontweight='bold', pad=8)
    ax7.legend(fontsize=9, loc='best', framealpha=0.9)
    ax7.grid(True, alpha=0.25, linestyle='--')
    ax7.tick_params(labelsize=9)

# 8. Performance Summary (Text Box)
ax8 = fig.add_subplot(gs[2, 2])
ax8.axis('off')

# Build summary text
mp_text = f"{len(OFF_DESIGN_POINTS)+1}-point ({OFFDESIGN_MODE})" if OFF_DESIGN_POINTS else "Single-point"

summary_lines = [
    f"╔{'═'*48}╗",
    f"║  PERFORMANCE SUMMARY - {AIRFOIL_TYPE.upper():^22} ║",
    f"╠{'═'*48}╣",
    f"║  Optimization: {mp_text:<31} ║",
    f"╠{'─'*48}╣",
    f"║  DESIGN POINT (α={ALPHA}°, Re={RE:.1e})        ║",
    f"║    CL  = {CL_design:6.4f}  (target: {CL_TARGET:.4f})      ║",
    f"║    CD  = {CD_design:7.5f}                          ║",
    f"║    CM  = {CM_design:7.4f}                          ║",
    f"║    L/D = {LD_design:6.1f}                             ║",
]

if OFF_DESIGN_POINTS:
    summary_lines.append(f"╠{'─'*48}╣")
    summary_lines.append(f"║  OFF-DESIGN PERFORMANCE                        ║")
    for res in offdesign_results[:3]:  # Show first 3
        LD_off = res['CL']/res['CD'] if res['CD'] > 1e-6 else 0
        summary_lines.append(
            f"║    α={res['alpha']:+4.1f}°: CL={res['CL']:.3f}, CD={res['CD']:.5f}, L/D={LD_off:4.0f} ║"
        )

summary_lines.extend([
    f"╠{'─'*48}╣",
    f"║  GEOMETRY                                      ║",
    f"║    Max t/c = {t_max*100:4.1f}% at x/c = {x_tmax:.3f}          ║",
    f"║    Min t/c = {t_min*100:4.2f}% (LE/TE expected)          ║",
    f"║    Min interior = {t_min_interior*100:4.2f}%                      ║",
    f"╚{'═'*48}╝",
])

summary_text = '\n'.join(summary_lines)

ax8.text(0.5, 0.5, summary_text, transform=ax8.transAxes, 
         fontsize=9, verticalalignment='center', horizontalalignment='center',
         bbox=dict(boxstyle='round,pad=1', facecolor='lightblue', 
                   alpha=0.2, edgecolor='steelblue', linewidth=2),
         family='monospace', fontweight='normal')

# Main title
plt.suptitle('Multi-Point Inverse Airfoil Design - Complete Analysis', 
             fontsize=16, fontweight='bold', y=0.98)

plt.show()

print("\n" + "="*70)
print("Optimization complete!")
print("="*70)