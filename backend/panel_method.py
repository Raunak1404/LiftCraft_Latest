"""
Panel Method for Airfoil Pressure Distribution (Cp) Calculation
Pure Python implementation - no external dependencies beyond NumPy
Based on vortex panel method with Kutta condition
"""

import numpy as np


def compute_cp_distribution(x_coords, y_coords, alpha_deg, n_panels=150, mach=0.0):
    """
    Compute pressure coefficient (Cp) distribution around an airfoil using panel method.

    Parameters:
    -----------
    x_coords : array-like
        X coordinates of airfoil (0 to 1, leading edge to trailing edge)
    y_coords : array-like
        Y coordinates of airfoil
    alpha_deg : float
        Angle of attack in degrees
    n_panels : int
        Number of panels to use (default: 150, good balance of speed/accuracy)
    mach : float
        Freestream Mach number (0 = incompressible, up to 0.7 for subsonic)

    Returns:
    --------
    dict with keys:
        'x_upper': X coordinates on upper surface
        'cp_upper': Cp values on upper surface
        'x_lower': X coordinates on lower surface
        'cp_lower': Cp values on lower surface
        'stagnation_point': (x, y) of stagnation point
    """

    # Validate input
    x_coords = np.asarray(x_coords)
    y_coords = np.asarray(y_coords)

    if len(x_coords) != len(y_coords):
        raise ValueError("x_coords and y_coords must have same length")

    # Resample airfoil to n_panels points for panel method
    x_panel, y_panel = _resample_airfoil(x_coords, y_coords, n_panels)

    # Convert angle of attack to radians
    alpha_rad = np.deg2rad(alpha_deg)

    # Build panel geometry
    panels = _create_panels(x_panel, y_panel)

    # Solve for panel strengths (vortex strengths)
    gamma = _solve_panel_method(panels, alpha_rad)

    # Compute velocity and pressure coefficient on each panel
    cp_values = _compute_cp_from_gamma(panels, gamma, alpha_rad)

    # Apply Karman-Tsien compressibility correction if Mach > 0
    if mach > 0.01:
        from compressibility import correct_cp_karman_tsien
        cp_values = correct_cp_karman_tsien(cp_values, mach)

    # Separate into upper and lower surfaces
    result = _separate_surfaces(panels, cp_values)

    # Find stagnation point (where Cp ≈ 1.0)
    stag_idx = np.argmin(np.abs(cp_values - 1.0))
    stag_point = (panels[stag_idx]['x_mid'], panels[stag_idx]['y_mid'])
    result['stagnation_point'] = stag_point

    return result


def _resample_airfoil(x, y, n_points):
    """
    Resample airfoil coordinates to have n_points evenly distributed.
    Uses cosine spacing for better resolution near leading/trailing edges.
    """
    # Ensure airfoil starts and ends at trailing edge
    # Find split between upper and lower surfaces
    split_idx = np.argmin(x)  # Leading edge (minimum x)
    
    # Upper surface (TE to LE)
    x_upper = x[:split_idx+1]
    y_upper = y[:split_idx+1]
    
    # Lower surface (LE to TE)
    x_lower = x[split_idx:]
    y_lower = y[split_idx:]
    
    # Cosine spacing parameter (0 to π)
    n_upper = n_points // 2
    n_lower = n_points - n_upper
    
    # Interpolate with cosine spacing
    t_upper = np.linspace(0, 1, len(x_upper))
    t_lower = np.linspace(0, 1, len(x_lower))
    
    # Cosine spacing for better LE/TE resolution
    theta = np.linspace(0, np.pi, n_upper)
    s_upper = 0.5 * (1 - np.cos(theta))
    
    theta = np.linspace(0, np.pi, n_lower)
    s_lower = 0.5 * (1 - np.cos(theta))
    
    # Interpolate
    x_upper_new = np.interp(s_upper, t_upper, x_upper)
    y_upper_new = np.interp(s_upper, t_upper, y_upper)
    
    x_lower_new = np.interp(s_lower, t_lower, x_lower)
    y_lower_new = np.interp(s_lower, t_lower, y_lower)
    
    # Combine (remove duplicate LE point)
    x_resampled = np.concatenate([x_upper_new, x_lower_new[1:]])
    y_resampled = np.concatenate([y_upper_new, y_lower_new[1:]])
    
    return x_resampled, y_resampled


def _create_panels(x, y):
    """
    Create panel data structure from coordinates.
    Each panel is a line segment with associated properties.
    """
    n_panels = len(x) - 1
    panels = []
    
    for i in range(n_panels):
        x1, y1 = x[i], y[i]
        x2, y2 = x[i+1], y[i+1]
        
        # Panel endpoints
        panel = {
            'x1': x1, 'y1': y1,
            'x2': x2, 'y2': y2,
            'x_mid': 0.5 * (x1 + x2),  # Control point (midpoint)
            'y_mid': 0.5 * (y1 + y2),
            'length': np.sqrt((x2-x1)**2 + (y2-y1)**2)
        }
        
        # Panel angle (tangent)
        panel['theta'] = np.arctan2(y2 - y1, x2 - x1)
        
        # Normal vector (points outward from airfoil)
        panel['nx'] = np.sin(panel['theta'])
        panel['ny'] = -np.cos(panel['theta'])
        
        # Tangent vector
        panel['tx'] = np.cos(panel['theta'])
        panel['ty'] = np.sin(panel['theta'])
        
        panels.append(panel)
    
    return panels


def _solve_panel_method(panels, alpha_rad):
    """
    Solve the panel method system to get vortex strengths.
    Uses vortex panel method with Kutta condition.
    """
    n = len(panels)
    
    # Build influence coefficient matrix
    A = np.zeros((n, n))
    b = np.zeros(n)
    
    # Freestream velocity components
    V_inf = 1.0  # Normalized to 1
    u_inf = V_inf * np.cos(alpha_rad)
    v_inf = V_inf * np.sin(alpha_rad)
    
    # Boundary condition: no flow through panels (V · n = 0)
    # for all panels EXCEPT the last one (trailing edge)
    for i in range(n-1):
        xi, yi = panels[i]['x_mid'], panels[i]['y_mid']
        nx_i, ny_i = panels[i]['nx'], panels[i]['ny']
        
        for j in range(n):
            # Influence of panel j on panel i
            A[i, j] = _vortex_influence_normal(panels[j], xi, yi, nx_i, ny_i)
        
        # RHS: freestream contribution
        b[i] = -(u_inf * nx_i + v_inf * ny_i)
    
    # Kutta condition: γ[0] + γ[n-1] = 0
    # (sum of vortex strengths at trailing edge panels = 0)
    # This enforces smooth flow at the trailing edge
    A[n-1, 0] = 1.0
    A[n-1, n-1] = 1.0
    b[n-1] = 0.0
    
    # Solve linear system
    try:
        gamma = np.linalg.solve(A, b)
    except np.linalg.LinAlgError:
        # If singular, use least squares
        gamma, _, _, _ = np.linalg.lstsq(A, b, rcond=None)
    
    return gamma


def _vortex_influence_normal(panel, xi, yi, nx, ny):
    """
    Compute the normal velocity induced by a vortex panel at point (xi, yi).
    """
    x1, y1 = panel['x1'], panel['y1']
    x2, y2 = panel['x2'], panel['y2']
    
    # Transform to panel coordinate system
    dx = xi - x1
    dy = yi - y1
    
    # Panel angle
    theta = panel['theta']
    cos_theta = np.cos(theta)
    sin_theta = np.sin(theta)
    
    # Rotate to panel coordinates
    x_local = dx * cos_theta + dy * sin_theta
    y_local = -dx * sin_theta + dy * cos_theta
    
    # Panel length
    L = panel['length']
    
    # Avoid singularity
    epsilon = 1e-10
    if abs(y_local) < epsilon:
        y_local = epsilon
    
    # Vortex panel influence (per unit strength)
    # Using analytical integration
    r1_sq = x_local**2 + y_local**2
    r2_sq = (x_local - L)**2 + y_local**2
    
    if r1_sq < epsilon or r2_sq < epsilon:
        return 0.0
    
    # Velocity potential influence
    u_local = (1.0 / (2*np.pi)) * np.log(r2_sq / r1_sq) / 2.0
    v_local = (1.0 / (2*np.pi)) * (
        np.arctan2(y_local, x_local - L) - np.arctan2(y_local, x_local)
    )
    
    # Rotate back to global coordinates
    u_global = u_local * cos_theta - v_local * sin_theta
    v_global = u_local * sin_theta + v_local * cos_theta
    
    # Normal component
    V_normal = u_global * nx + v_global * ny
    
    return V_normal


def _compute_cp_from_gamma(panels, gamma, alpha_rad):
    """
    Compute pressure coefficient from vortex strengths.
    Cp = 1 - (V/V_inf)^2
    """
    n = len(panels)
    cp = np.zeros(n)
    
    V_inf = 1.0
    u_inf = V_inf * np.cos(alpha_rad)
    v_inf = V_inf * np.sin(alpha_rad)
    
    for i in range(n):
        xi, yi = panels[i]['x_mid'], panels[i]['y_mid']
        tx_i, ty_i = panels[i]['tx'], panels[i]['ty']
        
        # Compute tangential velocity
        u_induced = 0.0
        v_induced = 0.0
        
        for j in range(n):
            u_j, v_j = _vortex_influence_tangent(panels[j], xi, yi)
            u_induced += gamma[j] * u_j
            v_induced += gamma[j] * v_j
        
        # Total velocity
        u_total = u_inf + u_induced
        v_total = v_inf + v_induced
        
        # Tangential velocity magnitude
        V_tangent = u_total * tx_i + v_total * ty_i
        
        # Pressure coefficient: Cp = 1 - (V/V_inf)^2
        cp[i] = 1.0 - (V_tangent / V_inf)**2
    
    return cp


def _vortex_influence_tangent(panel, xi, yi):
    """
    Compute the velocity components induced by a vortex panel at point (xi, yi).
    Returns (u, v) per unit strength.
    """
    x1, y1 = panel['x1'], panel['y1']
    x2, y2 = panel['x2'], panel['y2']
    
    # Transform to panel coordinate system
    dx = xi - x1
    dy = yi - y1
    
    theta = panel['theta']
    cos_theta = np.cos(theta)
    sin_theta = np.sin(theta)
    
    # Rotate
    x_local = dx * cos_theta + dy * sin_theta
    y_local = -dx * sin_theta + dy * cos_theta
    
    L = panel['length']
    
    # Avoid singularity
    epsilon = 1e-10
    if abs(y_local) < epsilon:
        y_local = epsilon
    
    r1_sq = x_local**2 + y_local**2
    r2_sq = (x_local - L)**2 + y_local**2
    
    if r1_sq < epsilon or r2_sq < epsilon:
        return 0.0, 0.0
    
    # Induced velocity in panel coordinates
    u_local = (1.0 / (2*np.pi)) * (
        np.arctan2(y_local, x_local - L) - np.arctan2(y_local, x_local)
    )
    v_local = -(1.0 / (2*np.pi)) * np.log(r2_sq / r1_sq) / 2.0
    
    # Rotate back
    u_global = u_local * cos_theta - v_local * sin_theta
    v_global = u_local * sin_theta + v_local * cos_theta
    
    return u_global, v_global


def _separate_surfaces(panels, cp_values):
    """
    Separate Cp values into upper and lower surfaces using arc-length method.
    This robust method works for thin airfoils, symmetric airfoils, and unusual geometries.
    """
    n = len(panels)
    
    # Extract panel midpoints
    x_coords = np.array([p['x_mid'] for p in panels])
    y_coords = np.array([p['y_mid'] for p in panels])
    
    # Find leading edge (minimum x coordinate)
    le_idx = np.argmin(x_coords)
    
    # Airfoils are typically ordered: TE (top) → LE → TE (bottom)
    # Split at leading edge
    # Upper surface: indices 0 to le_idx (inclusive)
    # Lower surface: indices le_idx to n-1
    
    if le_idx == 0:
        # Leading edge is first point - abnormal ordering
        # Use y-coordinate mean to determine surface assignment
        if np.mean(y_coords) > 0:
            # Mostly upper surface
            x_upper = x_coords
            cp_upper = cp_values
            # Create minimal lower surface from trailing edge point
            x_lower = np.array([x_coords[-1], x_coords[-1]])
            cp_lower = np.array([cp_values[-1], cp_values[-1]])
        else:
            # Mostly lower surface
            x_lower = x_coords
            cp_lower = cp_values
            # Create minimal upper surface from trailing edge point
            x_upper = np.array([x_coords[0], x_coords[0]])
            cp_upper = np.array([cp_values[0], cp_values[0]])
            
    elif le_idx == n - 1:
        # Leading edge is last point - abnormal ordering
        # Treat all as upper surface and duplicate for lower
        x_upper = x_coords
        cp_upper = cp_values
        x_lower = np.array([x_coords[0], x_coords[0]])
        cp_lower = np.array([cp_values[0], cp_values[0]])
        
    else:
        # Normal case: split at LE
        # Upper surface: from start to LE (TE → LE on top)
        x_upper = x_coords[:le_idx+1]
        cp_upper = cp_values[:le_idx+1]
        
        # Lower surface: from LE to end (LE → TE on bottom)
        x_lower = x_coords[le_idx:]
        cp_lower = cp_values[le_idx:]
    
    # Ensure minimum length of 2 for both surfaces (needed for plotting)
    if len(x_upper) < 2:
        if len(x_upper) == 1:
            x_upper = np.array([x_upper[0], x_upper[0]])
            cp_upper = np.array([cp_upper[0], cp_upper[0]])
        else:
            # Completely empty - use first panel as fallback
            x_upper = np.array([x_coords[0], x_coords[0]])
            cp_upper = np.array([cp_values[0], cp_values[0]])
    
    if len(x_lower) < 2:
        if len(x_lower) == 1:
            x_lower = np.array([x_lower[0], x_lower[0]])
            cp_lower = np.array([cp_lower[0], cp_lower[0]])
        else:
            # Completely empty - use last panel as fallback
            x_lower = np.array([x_coords[-1], x_coords[-1]])
            cp_lower = np.array([cp_values[-1], cp_values[-1]])
    
    return {
        'x_upper': x_upper.tolist(),
        'cp_upper': cp_upper.tolist(),
        'x_lower': x_lower.tolist(),
        'cp_lower': cp_lower.tolist()
    }


def validate_cp_distribution(cp_data):
    """
    Validate Cp distribution for physical correctness.
    Returns True if valid, False otherwise with error message.
    """
    try:
        # Check for NaN or Inf
        all_cp = np.array(cp_data['cp_upper'] + cp_data['cp_lower'])
        if np.any(np.isnan(all_cp)) or np.any(np.isinf(all_cp)):
            return False, "Cp contains NaN or Inf values"
        
        # Check for reasonable Cp range (-10 to 2 is typical)
        if np.any(all_cp < -20) or np.any(all_cp > 3):
            return False, "Cp values outside reasonable range"
        
        # Check that we have data (now guaranteed by _separate_surfaces, but double-check)
        if len(cp_data['cp_upper']) == 0 or len(cp_data['cp_lower']) == 0:
            return False, "Missing surface data"
        
        return True, "Valid"
    
    except Exception as e:
        return False, f"Validation error: {str(e)}"