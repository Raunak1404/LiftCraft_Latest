import numpy as np
import neuralfoil as nf
from geometry import airfoil_from_cst
from compressibility import correct_cl, correct_cd, correct_cm


def objective_multipoint(
    cst,
    design_point,      # (CL_target, alpha, Re) or (CL_target, alpha, Re, mach)
    off_design_points, # List of (alpha, Re) tuples
    airfoil_type='cambered',
    Cm_target=None,
    stage=1,
    
    # Multi-point weighting
    w_design=1.0,      # Weight for design point
    w_offdesign=0.15,  # Weight for off-design points (REDUCED from 0.3)
    
    # Performance targets for off-design
    offdesign_mode='stability',  # 'stability' or 'performance'
    max_cd_increase=0.002,  # Max CD increase at off-design
    min_ld_ratio=0.7,       # Min L/D ratio relative to design point
    
    # All other parameters same as before...
    w_CM_s1=30.0,
    w_CM_s2=150.0,
    w_symmetry=800.0,
    w_CL_s1=100.0,
    w_CD_s1=1.0,
    w_CL_s2=150.0,
    w_CD_s2=1.5,
    CL_tolerance=0.08,
    w_intersect=1e7,
    eps=1e-4,
    w_xtmax=800.0,
    xtmax_target=0.30,
    xtmax_tolerance=0.10,
    w_thickness=300.0,
    t_min=0.05,
    w_tmax=150.0,
    tmax_target=0.12,
    tmax_tolerance=0.04,
    w_tmax_cap=500.0,
    tmax_cap=0.18,
    w_min_thickness_strict=1200.0,
    t_min_strict=0.003,
    w_smooth=8.0,
    w_te_gap=200.0,
    w_le_round=150.0,
    le_round_target=0.015,
    x_le_check=0.01,
    w_lower_flat=100.0,
    w_upper_curvature=80.0,
    w_thickness_gradient=200.0,
    w_thickness_smoothness=150.0,
):
    """
    Multi-point objective function for robust airfoil design.
    
    Optimizes for:
    1. PRIMARY: Design point performance (CL, CD, CM)
    2. SECONDARY: Off-design stability/performance
    
    Parameters:
    -----------
    design_point : tuple
        (CL_target, alpha, Re) for primary operating condition
    off_design_points : list of tuples
        [(alpha1, Re1), (alpha2, Re2), ...] for off-design evaluation
    offdesign_mode : str
        'stability' - prioritize stable CD, gentle stall
        'performance' - prioritize maintaining L/D
    """
    
    # Support both 3-tuple (legacy) and 4-tuple (with mach)
    if len(design_point) == 4:
        CL_target, alpha_design, Re_design, mach = design_point
    else:
        CL_target, alpha_design, Re_design = design_point
        mach = 0.0
    n_coef = len(cst) // 2
    upper = cst[:n_coef]
    lower = cst[n_coef:]

    try:
        airfoil, x, yu, yl = airfoil_from_cst(upper, lower, return_surfaces=True)
        t = yu - yl
        camber = 0.5 * (yu + yl)

        # ========================================
        # Geometry constraints (same as before)
        # ========================================
        neg = eps - t
        neg = neg[neg > 0]
        intersection_penalty = w_intersect * np.sum(neg**2) if neg.size else 0.0

        # ========================================
        # DESIGN POINT evaluation
        # ========================================
        aero_design = nf.get_aero_from_airfoil(
            airfoil=airfoil,
            alpha=alpha_design,
            Re=Re_design
        )
        CL_design = correct_cl(float(aero_design["CL"][0]), mach)
        CD_design = correct_cd(float(aero_design["CD"][0]), mach)
        CM_design = correct_cm(float(aero_design["CM"][0]), mach)
        LD_design = CL_design / CD_design if CD_design > 1e-6 else 0.0

        # Cm constraint logic (same as before)
        cm_penalty = 0.0
        symmetry_penalty = 0.0
        w_CM = w_CM_s1 if stage == 1 else w_CM_s2
        
        if airfoil_type == 'symmetric':
            cm_penalty = w_CM * (CM_design ** 2)
            mask_mid = (x > 0.2) & (x < 0.8)
            camber_mid = camber[mask_mid]
            symmetry_penalty = w_symmetry * np.sum(camber_mid ** 2)
        elif airfoil_type == 'cambered':
            cm_min = max(-0.20, -0.05 - 0.08 * abs(CL_target))
            cm_max = 0.05
            if CM_design < cm_min:
                cm_penalty = w_CM * ((CM_design - cm_min) ** 2)
            elif CM_design > cm_max:
                cm_penalty = w_CM * ((CM_design - cm_max) ** 2)
        elif airfoil_type == 'custom' and Cm_target is not None:
            cm_penalty = w_CM * ((CM_design - Cm_target) ** 2)

        # Design point loss
        if stage == 1:
            i_peak = int(np.argmax(t))
            x_tmax = float(x[i_peak])
            basic_xtmax_penalty = (w_xtmax * 0.2) * (x_tmax - xtmax_target)**2
            thin_points = t[t < t_min_strict]
            stage1_thin_penalty = (w_min_thickness_strict * 0.5) * np.sum((t_min_strict - thin_points)**2) if thin_points.size else 0.0
            
            aero_loss_design = w_CL_s1 * (CL_design - CL_target)**2 + w_CD_s1 * CD_design
            design_loss = aero_loss_design + cm_penalty + symmetry_penalty + basic_xtmax_penalty + stage1_thin_penalty
        else:
            # Stage 2: Full geometry constraints
            CL_error = abs(CL_design - CL_target)
            CL_penalty = w_CL_s2 * ((CL_error - CL_tolerance)**2) if CL_error > CL_tolerance else 0.0
            aero_loss_design = w_CL_s2 * (CL_design - CL_target)**2 + w_CD_s2 * CD_design
            
            # All geometry penalties (same as single-point)
            i_peak = int(np.argmax(t))
            x_tmax = float(x[i_peak])
            xtmax_penalty = w_xtmax * (x_tmax - xtmax_target)**2 if abs(x_tmax - xtmax_target) > xtmax_tolerance else (w_xtmax * 0.1) * (x_tmax - xtmax_target)**2
            
            min_t = float(np.min(t))
            thickness_penalty = w_thickness * max(0, t_min - min_t)**2
            thin_points = t[t < t_min_strict]
            strict_thin_penalty = w_min_thickness_strict * np.sum((t_min_strict - thin_points)**2) if thin_points.size else 0.0
            
            max_t = float(np.max(t))
            adaptive_tmax_target = tmax_target + min(0.03, abs(CL_target) * 0.01)
            tmax_penalty = w_tmax * (max_t - adaptive_tmax_target)**2 if abs(max_t - adaptive_tmax_target) > tmax_tolerance else 0.0
            tmax_cap_penalty = w_tmax_cap * max(0, max_t - tmax_cap)**2
            
            dt_dx = np.diff(t)
            thickness_gradient_penalty = w_thickness_gradient * np.sum(dt_dx**2)
            
            mask_front = x < 0.4
            if np.count_nonzero(mask_front) > 10:
                t_front = t[mask_front]
                d2t_front = np.diff(t_front, n=2)
                thickness_smoothness_penalty = w_thickness_smoothness * np.sum(d2t_front**2)
            else:
                thickness_smoothness_penalty = 0.0
            
            d2yu = np.diff(yu, n=2)
            d2yl = np.diff(yl, n=2)
            smoothness_penalty = w_smooth * (np.sum(d2yu**2) + np.sum(d2yl**2))
            
            te_gap = float(abs(yu[-1] - yl[-1]))
            te_gap_penalty = w_te_gap * te_gap**2
            
            idx_le = np.argmin(np.abs(x - x_le_check))
            le_round = t[idx_le]
            le_penalty = w_le_round * (le_round - le_round_target)**2
            
            mask_mid = (x > 0.2) & (x < 0.7)
            if np.count_nonzero(mask_mid) > 5:
                yl_mid = yl[mask_mid]
                d2yl_mid = np.diff(yl_mid, n=2)
                lower_flat_penalty = w_lower_flat * np.sum(d2yl_mid**2)
                yu_mid = yu[mask_mid]
                d2yu_mid = np.diff(yu_mid, n=2)
                upper_curv_penalty = w_upper_curvature * np.sum(d2yu_mid**2)
            else:
                lower_flat_penalty = 0.0
                upper_curv_penalty = 0.0
            
            geometry_loss = (
                thickness_penalty + strict_thin_penalty + tmax_penalty + 
                tmax_cap_penalty + xtmax_penalty + thickness_gradient_penalty +
                thickness_smoothness_penalty + smoothness_penalty + 
                te_gap_penalty + le_penalty + lower_flat_penalty + upper_curv_penalty
            )
            
            design_loss = aero_loss_design + CL_penalty + cm_penalty + symmetry_penalty + geometry_loss

        # ========================================
        # OFF-DESIGN POINTS evaluation
        # ========================================
        offdesign_penalty = 0.0
        
        # CRITICAL: Always enforce minimum thickness even in off-design optimization
        min_t = float(np.min(t))
        if min_t < t_min_strict:
            # Strong penalty that applies regardless of stage
            offdesign_penalty += 500.0 * (t_min_strict - min_t)**2
        
        if off_design_points and stage == 2:  # Only in Stage 2
            n_offdesign = len(off_design_points)
            
            for alpha_off, Re_off in off_design_points:
                try:
                    aero_off = nf.get_aero_from_airfoil(
                        airfoil=airfoil,
                        alpha=alpha_off,
                        Re=Re_off
                    )
                    CL_off = correct_cl(float(aero_off["CL"][0]), mach)
                    CD_off = correct_cd(float(aero_off["CD"][0]), mach)
                    LD_off = CL_off / CD_off if CD_off > 1e-6 else 0.0

                    if offdesign_mode == 'stability':
                        # Penalize excessive CD increase (but gently)
                        cd_increase = CD_off - CD_design
                        if cd_increase > max_cd_increase:
                            offdesign_penalty += 0.5 * ((cd_increase - max_cd_increase) ** 2)  # Gentler

                        # Penalize negative lift (stall indicator)
                        if CL_off < 0 and alpha_off > 0:
                            offdesign_penalty += 5.0 * (CL_off ** 2)  # Reduced from 10.0

                    elif offdesign_mode == 'performance':
                        # Maintain L/D ratio
                        ld_ratio = LD_off / LD_design if LD_design > 0 else 0.0
                        if ld_ratio < min_ld_ratio:
                            offdesign_penalty += ((min_ld_ratio - ld_ratio) ** 2)

                except Exception:
                    # Penalize if evaluation fails at off-design point
                    offdesign_penalty += 5.0
            
            # Average over off-design points
            offdesign_penalty = offdesign_penalty / n_offdesign if n_offdesign > 0 else 0.0

        # ========================================
        # TOTAL LOSS
        # ========================================
        total_loss = (
            w_design * design_loss +
            w_offdesign * offdesign_penalty +
            intersection_penalty  # Always strong
        )
        
        return total_loss

    except Exception as e:
        return 1e7


# ================================================================
# STAGE 2 CONSTRAINT-DRIVEN OPTIMIZATION (SLSQP)
# ================================================================
# These functions split the monolithic objective_multipoint into:
#   - A clean objective: minimize CD + soft geometry preferences
#   - Hard constraints: CL target, thickness bounds, no intersection
# This forces the optimizer to hit CL exactly instead of trading
# it off against drag in a weighted sum.
# ================================================================


def _get_cached_aero(cst, design_point, aero_cache):
    """
    Compute airfoil geometry + NeuralFoil evaluation with caching.

    Both the objective and constraint functions need the same aero data
    for the same CST vector. This avoids redundant NeuralFoil calls
    (SLSQP evaluates objective and constraints at each point).

    design_point: (CL_target, alpha, Re) or (CL_target, alpha, Re, mach)
        If mach is provided and > 0, Prandtl-Glauert corrections are applied.

    Returns:
        dict with keys: airfoil, x, yu, yl, t, camber, CL, CD, CM, LD
        or None if evaluation fails
    """
    # Support both 3-tuple (legacy) and 4-tuple (with mach) design_point
    if len(design_point) == 4:
        CL_target, alpha, Re, mach = design_point
    else:
        CL_target, alpha, Re = design_point
        mach = 0.0

    # Cache key: hash of the CST array bytes
    cache_key = cst.tobytes()
    if cache_key in aero_cache:
        return aero_cache[cache_key]

    n_coef = len(cst) // 2
    upper = cst[:n_coef]
    lower = cst[n_coef:]

    try:
        airfoil, x, yu, yl = airfoil_from_cst(upper, lower, return_surfaces=True)
        t = yu - yl
        camber = 0.5 * (yu + yl)

        aero = nf.get_aero_from_airfoil(airfoil=airfoil, alpha=alpha, Re=Re)
        CL = float(aero["CL"][0])
        CD = float(aero["CD"][0])
        CM = float(aero["CM"][0])

        # Apply compressibility corrections if Mach > 0
        CL = correct_cl(CL, mach)
        CD = correct_cd(CD, mach)
        CM = correct_cm(CM, mach)

        LD = CL / CD if CD > 1e-6 else 0.0

        result = {
            'airfoil': airfoil, 'x': x, 'yu': yu, 'yl': yl,
            't': t, 'camber': camber,
            'CL': CL, 'CD': CD, 'CM': CM, 'LD': LD,
        }

        # Keep cache small: only store last entry to avoid memory growth
        aero_cache.clear()
        aero_cache[cache_key] = result
        return result

    except Exception:
        return None


def objective_stage2_clean(
    cst,
    design_point,
    off_design_points,
    airfoil_type,
    Cm_target,
    offdesign_mode,
    aero_cache,

    # Weights (same defaults as objective_multipoint Stage 2)
    w_CD=1.5,
    w_CM=150.0,
    w_symmetry=800.0,
    w_offdesign=0.15,

    # Off-design thresholds
    max_cd_increase=0.002,
    min_ld_ratio=0.7,

    # Soft geometry penalty weights (preferences, not hard constraints)
    w_xtmax=800.0,
    xtmax_target=0.30,
    xtmax_tolerance=0.10,
    w_thickness=300.0,
    t_min=0.05,
    w_tmax=150.0,
    tmax_target=0.12,
    tmax_tolerance=0.04,
    w_min_thickness_strict=1200.0,
    t_min_strict=0.003,
    w_smooth=8.0,
    w_te_gap=200.0,
    w_le_round=150.0,
    le_round_target=0.015,
    x_le_check=0.01,
    w_lower_flat=100.0,
    w_upper_curvature=80.0,
    w_thickness_gradient=200.0,
    w_thickness_smoothness=150.0,

    # Small CL shortfall penalty for unreachable targets
    w_cl_shortfall=2.0,

    # Geometry penalty scaling for SLSQP
    # With CL as a hard constraint, geometry penalties no longer compete
    # with CL penalty weights (w_CL_s2=150). Without scaling, geometry
    # penalties (weights 100-800) dominate over CD (weight 1.5) and
    # SLSQP optimizes for geometry quality instead of drag.
    # Hard constraints handle worst-case geometry, so soft penalties
    # can be gentle preferences.
    w_geometry_scale=0.1,
):
    """
    Clean Stage 2 objective for SLSQP: minimize CD + soft geometry preferences.

    CL targeting is handled by formal constraints (constraint_lift),
    NOT by penalty weights in this function. The small w_cl_shortfall
    only kicks in as a fallback when the CL target is physically unreachable.
    """
    data = _get_cached_aero(cst, design_point, aero_cache)
    if data is None:
        return 1e3

    CL_target = design_point[0]
    x, yu, yl, t = data['x'], data['yu'], data['yl'], data['t']
    camber = data['camber']
    CD_design = data['CD']
    CL_design = data['CL']
    CM_design = data['CM']
    LD_design = data['LD']
    airfoil = data['airfoil']

    # ========================================
    # PRIMARY: Drag minimization
    # ========================================
    aero_loss = w_CD * CD_design

    # Small CL shortfall penalty (fallback for unreachable targets only)
    cl_shortfall = w_cl_shortfall * max(0, CL_target - CL_design) ** 2

    # ========================================
    # CM penalty (preserved from original)
    # ========================================
    cm_penalty = 0.0
    symmetry_penalty = 0.0

    if airfoil_type == 'symmetric':
        cm_penalty = w_CM * (CM_design ** 2)
        mask_mid = (x > 0.2) & (x < 0.8)
        camber_mid = camber[mask_mid]
        symmetry_penalty = w_symmetry * np.sum(camber_mid ** 2)
    elif airfoil_type == 'cambered':
        cm_min = max(-0.20, -0.05 - 0.08 * abs(CL_target))
        cm_max = 0.05
        if CM_design < cm_min:
            cm_penalty = w_CM * ((CM_design - cm_min) ** 2)
        elif CM_design > cm_max:
            cm_penalty = w_CM * ((CM_design - cm_max) ** 2)
    elif airfoil_type == 'custom' and Cm_target is not None:
        cm_penalty = w_CM * ((CM_design - Cm_target) ** 2)

    # ========================================
    # SOFT geometry penalties (all 12 preserved)
    # ========================================
    i_peak = int(np.argmax(t))
    x_tmax = float(x[i_peak])
    xtmax_penalty = w_xtmax * (x_tmax - xtmax_target)**2 if abs(x_tmax - xtmax_target) > xtmax_tolerance else (w_xtmax * 0.1) * (x_tmax - xtmax_target)**2

    min_t = float(np.min(t))
    thickness_penalty = w_thickness * max(0, t_min - min_t)**2
    thin_points = t[t < t_min_strict]
    strict_thin_penalty = w_min_thickness_strict * np.sum((t_min_strict - thin_points)**2) if thin_points.size else 0.0

    max_t = float(np.max(t))
    adaptive_tmax_target = tmax_target + min(0.03, abs(CL_target) * 0.01)
    tmax_penalty = w_tmax * (max_t - adaptive_tmax_target)**2 if abs(max_t - adaptive_tmax_target) > tmax_tolerance else 0.0

    dt_dx = np.diff(t)
    thickness_gradient_penalty = w_thickness_gradient * np.sum(dt_dx**2)

    mask_front = x < 0.4
    if np.count_nonzero(mask_front) > 10:
        t_front = t[mask_front]
        d2t_front = np.diff(t_front, n=2)
        thickness_smoothness_penalty = w_thickness_smoothness * np.sum(d2t_front**2)
    else:
        thickness_smoothness_penalty = 0.0

    d2yu = np.diff(yu, n=2)
    d2yl = np.diff(yl, n=2)
    smoothness_penalty = w_smooth * (np.sum(d2yu**2) + np.sum(d2yl**2))

    te_gap = float(abs(yu[-1] - yl[-1]))
    te_gap_penalty = w_te_gap * te_gap**2

    idx_le = np.argmin(np.abs(x - x_le_check))
    le_round = t[idx_le]
    le_penalty = w_le_round * (le_round - le_round_target)**2

    mask_mid = (x > 0.2) & (x < 0.7)
    if np.count_nonzero(mask_mid) > 5:
        yl_mid = yl[mask_mid]
        d2yl_mid = np.diff(yl_mid, n=2)
        lower_flat_penalty = w_lower_flat * np.sum(d2yl_mid**2)
        yu_mid = yu[mask_mid]
        d2yu_mid = np.diff(yu_mid, n=2)
        upper_curv_penalty = w_upper_curvature * np.sum(d2yu_mid**2)
    else:
        lower_flat_penalty = 0.0
        upper_curv_penalty = 0.0

    geometry_loss = w_geometry_scale * (
        thickness_penalty + strict_thin_penalty + tmax_penalty +
        xtmax_penalty + thickness_gradient_penalty +
        thickness_smoothness_penalty + smoothness_penalty +
        te_gap_penalty + le_penalty + lower_flat_penalty + upper_curv_penalty
    )

    # ========================================
    # OFF-DESIGN evaluation (preserved from original)
    # ========================================
    offdesign_penalty = 0.0

    # Extract mach from design_point for off-design corrections
    _mach = design_point[3] if len(design_point) == 4 else 0.0

    if off_design_points:
        n_offdesign = len(off_design_points)

        for alpha_off, Re_off in off_design_points:
            try:
                aero_off = nf.get_aero_from_airfoil(
                    airfoil=airfoil, alpha=alpha_off, Re=Re_off
                )
                CL_off = correct_cl(float(aero_off["CL"][0]), _mach)
                CD_off = correct_cd(float(aero_off["CD"][0]), _mach)
                LD_off = CL_off / CD_off if CD_off > 1e-6 else 0.0

                if offdesign_mode == 'stability':
                    cd_increase = CD_off - CD_design
                    if cd_increase > max_cd_increase:
                        offdesign_penalty += 0.5 * ((cd_increase - max_cd_increase) ** 2)
                    if CL_off < 0 and alpha_off > 0:
                        offdesign_penalty += 5.0 * (CL_off ** 2)

                elif offdesign_mode == 'performance':
                    ld_ratio = LD_off / LD_design if LD_design > 0 else 0.0
                    if ld_ratio < min_ld_ratio:
                        offdesign_penalty += ((min_ld_ratio - ld_ratio) ** 2)

            except Exception:
                offdesign_penalty += 5.0

        offdesign_penalty = offdesign_penalty / n_offdesign if n_offdesign > 0 else 0.0

    # ========================================
    # TOTAL (no CL penalty weight — that's a hard constraint now)
    # ========================================
    total = (
        aero_loss +
        cl_shortfall +
        cm_penalty +
        symmetry_penalty +
        geometry_loss +
        w_offdesign * offdesign_penalty
    )

    return total


def constraint_lift_lower(cst, design_point, aero_cache):
    """
    Hard lift constraint (lower bound): CL_achieved >= CL_target - tolerance.

    Combined with constraint_lift_upper, this creates a tight band
    around the target CL, preventing both undershoot and overshoot.
    """
    CL_target = design_point[0]
    data = _get_cached_aero(cst, design_point, aero_cache)
    if data is None:
        return -1.0  # Infeasible
    return data['CL'] - (CL_target - 0.01)


def constraint_lift_upper(cst, design_point, aero_cache):
    """
    Hard lift constraint (upper bound): CL_achieved <= CL_target + tolerance.

    Prevents the optimizer from overshooting the CL target.
    """
    CL_target = design_point[0]
    data = _get_cached_aero(cst, design_point, aero_cache)
    if data is None:
        return -1.0  # Infeasible
    return (CL_target + 0.01) - data['CL']


def constraint_geometry(cst):
    """
    Hard geometry constraints for SLSQP.

    Checks INTERIOR points only (x in [0.01, 0.99]) because CST
    airfoils naturally have zero thickness at LE (x=0) and TE (x=1)
    by construction — this is physically correct, not an error.

    Returns an array where each element must be >= 0 for feasibility:
      [0]: min_interior_thickness - 1e-4   (no self-intersection)
      [1]: 0.18 - max(thickness)           (thickness cap)
    """
    n_coef = len(cst) // 2
    upper = cst[:n_coef]
    lower = cst[n_coef:]

    try:
        _, x, yu, yl = airfoil_from_cst(upper, lower, return_surfaces=True)
        t = yu - yl

        # Interior points only (exclude LE/TE where t=0 by design)
        interior_mask = (x > 0.01) & (x < 0.99)
        t_interior = t[interior_mask]
        min_t_interior = float(np.min(t_interior)) if t_interior.size > 0 else 0.0
        max_t = float(np.max(t))

        return np.array([
            min_t_interior - 1e-4,  # No self-intersection (interior only)
            0.18 - max_t,           # Thickness cap
        ])
    except Exception:
        return np.array([-1.0, -1.0])  # All infeasible


def evaluate_polar(cst, alpha_range, Re, n_points=15):
    """
    Evaluate airfoil across alpha range to generate polar.
    
    Parameters:
    -----------
    cst : array
        CST coefficients
    alpha_range : tuple
        (alpha_min, alpha_max) in degrees
    Re : float
        Reynolds number
    n_points : int
        Number of alpha points to evaluate
    
    Returns:
    --------
    polar_data : dict
        {'alpha': [...], 'CL': [...], 'CD': [...], 'CM': [...], 'LD': [...]}
    """
    n_coef = len(cst) // 2
    upper = cst[:n_coef]
    lower = cst[n_coef:]
    
    try:
        airfoil = airfoil_from_cst(upper, lower)
        
        alphas = np.linspace(alpha_range[0], alpha_range[1], n_points)
        CLs, CDs, CMs, LDs = [], [], [], []
        
        for alpha in alphas:
            try:
                aero = nf.get_aero_from_airfoil(airfoil=airfoil, alpha=alpha, Re=Re)
                CL = float(aero["CL"][0])
                CD = float(aero["CD"][0])
                CM = float(aero["CM"][0])
                LD = CL / CD if CD > 1e-6 else 0.0
                
                CLs.append(CL)
                CDs.append(CD)
                CMs.append(CM)
                LDs.append(LD)
            except:
                CLs.append(np.nan)
                CDs.append(np.nan)
                CMs.append(np.nan)
                LDs.append(np.nan)
        
        return {
            'alpha': alphas,
            'CL': np.array(CLs),
            'CD': np.array(CDs),
            'CM': np.array(CMs),
            'LD': np.array(LDs)
        }
    except:
        return None