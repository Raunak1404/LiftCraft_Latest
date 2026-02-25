"""
Flow Visualization Module
Computes streamlines and velocity field around airfoil using panel method
"""

import numpy as np


def compute_flow_field(x_coords, y_coords, alpha_deg, n_panels=150, 
                       grid_resolution=50, field_extent=2.0):
    """
    Compute flow field (streamlines + velocity) around an airfoil.
    
    Parameters:
    -----------
    x_coords : array-like
        Airfoil x coordinates
    y_coords : array-like
        Airfoil y coordinates
    alpha_deg : float
        Angle of attack in degrees
    n_panels : int
        Number of panels for panel method
    grid_resolution : int
        Resolution of velocity field grid
    field_extent : float
        How far around airfoil to compute (in chord lengths)
    
    Returns:
    --------
    dict with:
        'streamlines': List of streamline coordinates
        'velocity_field': Grid of velocity magnitudes
        'x_grid': X coordinates of grid
        'y_grid': Y coordinates of grid
        'stagnation_point': (x, y) location
    """
    
    # Import panel method components
    from panel_method import (
        _resample_airfoil, 
        _create_panels, 
        _solve_panel_method,
        _vortex_influence_tangent
    )
    
    # Validate and convert inputs
    x_coords = np.asarray(x_coords, dtype=float)
    y_coords = np.asarray(y_coords, dtype=float)
    
    if isinstance(alpha_deg, (list, tuple, np.ndarray)):
        alpha_deg = float(alpha_deg[0]) if len(alpha_deg) > 0 else 0.0
    else:
        alpha_deg = float(alpha_deg)
    
    alpha_rad = np.deg2rad(alpha_deg)
    
    # Resample airfoil for panel method
    x_panel, y_panel = _resample_airfoil(x_coords, y_coords, n_panels)
    
    # Create panels
    panels = _create_panels(x_panel, y_panel)
    
    # Solve for vortex strengths
    gamma = _solve_panel_method(panels, alpha_rad)
    
    # Create grid for flow field
    x_min, x_max = -0.5, 1.5
    y_min, y_max = -field_extent/2, field_extent/2
    
    x_grid = np.linspace(x_min, x_max, grid_resolution)
    y_grid = np.linspace(y_min, y_max, grid_resolution)
    X, Y = np.meshgrid(x_grid, y_grid)
    
    # Compute velocity field
    U = np.zeros_like(X)
    V = np.zeros_like(Y)
    
    # Freestream velocity
    V_inf = 1.0
    u_inf = V_inf * np.cos(alpha_rad)
    v_inf = V_inf * np.sin(alpha_rad)
    
    # Add freestream
    U[:, :] = u_inf
    V[:, :] = v_inf
    
    # Add induced velocities from panels
    for i in range(X.shape[0]):
        for j in range(X.shape[1]):
            xi, yi = X[i, j], Y[i, j]
            
            # Check if point is inside airfoil (skip if so)
            if _is_inside_airfoil(xi, yi, x_panel, y_panel):
                U[i, j] = 0
                V[i, j] = 0
                continue
            
            # Sum contributions from all panels
            for k, panel in enumerate(panels):
                u_induced, v_induced = _vortex_influence_tangent(panel, xi, yi)
                U[i, j] += gamma[k] * u_induced
                V[i, j] += gamma[k] * v_induced
    
    # Compute velocity magnitude
    velocity_magnitude = np.sqrt(U**2 + V**2)
    
    # Generate streamlines
    streamlines = _generate_streamlines(X, Y, U, V, x_panel, y_panel,
                                       alpha_rad, n_streamlines=20)
    
    # Find stagnation point (on airfoil surface where velocity ≈ 0)
    stag_idx = _find_stagnation_point(panels, gamma, alpha_rad)
    stag_point = (panels[stag_idx]['x_mid'], panels[stag_idx]['y_mid'])
    
    return {
        'streamlines': streamlines,
        'velocity_magnitude': velocity_magnitude.tolist(),
        'x_grid': x_grid.tolist(),
        'y_grid': y_grid.tolist(),
        'stagnation_point': stag_point,
        'U': U.tolist(),
        'V': V.tolist()
    }


def _is_inside_airfoil(x, y, x_airfoil, y_airfoil):
    """
    Check if point (x, y) is inside airfoil using ray casting algorithm.
    """
    n = len(x_airfoil)
    inside = False
    
    p1x, p1y = x_airfoil[0], y_airfoil[0]
    for i in range(1, n + 1):
        p2x, p2y = x_airfoil[i % n], y_airfoil[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    
    return inside


def _distance_to_airfoil(x, y, x_airfoil, y_airfoil):
    """
    Minimum distance from point (x, y) to the airfoil polygon boundary.
    Uses point-to-segment projection for each polygon edge.
    """
    min_dist_sq = float('inf')
    n = len(x_airfoil)
    for i in range(n - 1):
        ax, ay = x_airfoil[i], y_airfoil[i]
        bx, by = x_airfoil[i + 1], y_airfoil[i + 1]
        dx, dy = bx - ax, by - ay
        seg_len_sq = dx * dx + dy * dy
        if seg_len_sq < 1e-20:
            dist_sq = (x - ax) ** 2 + (y - ay) ** 2
        else:
            t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / seg_len_sq))
            proj_x = ax + t * dx
            proj_y = ay + t * dy
            dist_sq = (x - proj_x) ** 2 + (y - proj_y) ** 2
        if dist_sq < min_dist_sq:
            min_dist_sq = dist_sq
    return np.sqrt(min_dist_sq)


def _outward_normal_at(x, y, x_airfoil, y_airfoil):
    """
    Return unit vector pointing from nearest airfoil surface point toward (x, y).
    Used to deflect streamlines away from the surface.
    """
    min_dist_sq = float('inf')
    closest_px, closest_py = x_airfoil[0], y_airfoil[0]
    n = len(x_airfoil)
    for i in range(n - 1):
        ax, ay = x_airfoil[i], y_airfoil[i]
        bx, by = x_airfoil[i + 1], y_airfoil[i + 1]
        dx, dy = bx - ax, by - ay
        seg_len_sq = dx * dx + dy * dy
        if seg_len_sq < 1e-20:
            proj_x, proj_y = ax, ay
        else:
            t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / seg_len_sq))
            proj_x = ax + t * dx
            proj_y = ay + t * dy
        dist_sq = (x - proj_x) ** 2 + (y - proj_y) ** 2
        if dist_sq < min_dist_sq:
            min_dist_sq = dist_sq
            closest_px, closest_py = proj_x, proj_y

    nx_raw = x - closest_px
    ny_raw = y - closest_py
    mag = np.sqrt(nx_raw ** 2 + ny_raw ** 2)
    if mag < 1e-12:
        return 0.0, 1.0  # Default: push upward
    return nx_raw / mag, ny_raw / mag


def _generate_streamlines(X, Y, U, V, x_airfoil, y_airfoil, alpha_rad, n_streamlines=20):
    """
    Generate streamlines by integrating velocity field using RK4.
    """
    streamlines = []

    # Starting points for streamlines (above and below airfoil)
    y_starts = np.linspace(-0.9, 0.9, n_streamlines)
    x_start = -0.45

    for y_start in y_starts:
        # Skip if starting point is too close to airfoil
        if _is_inside_airfoil(x_start, y_start, x_airfoil, y_airfoil):
            continue

        # Integrate streamline using RK4 with adaptive stepping
        streamline = _integrate_streamline(
            x_start, y_start, X, Y, U, V,
            x_airfoil, y_airfoil
        )

        if len(streamline) > 3:  # Only keep substantial streamlines
            streamlines.append(streamline)

    return streamlines


def _integrate_streamline(x0, y0, X, Y, U, V, x_airfoil, y_airfoil,
                          max_steps=500, dt_base=0.008, min_surface_dist=0.015):
    """
    Integrate a single streamline from starting point (x0, y0) using RK4
    with adaptive step sizing and surface proximity buffer.
    """
    streamline = [[x0, y0]]
    x, y = x0, y0

    x_min, x_max = X.min(), X.max()
    y_min, y_max = Y.min(), Y.max()

    for _ in range(max_steps):
        # Adaptive step size based on proximity to airfoil
        dist = _distance_to_airfoil(x, y, x_airfoil, y_airfoil)

        # If inside the proximity buffer, deflect outward
        if dist < min_surface_dist:
            nx, ny = _outward_normal_at(x, y, x_airfoil, y_airfoil)
            push = min_surface_dist - dist + 0.002
            x = x + nx * push
            y = y + ny * push
            dist = _distance_to_airfoil(x, y, x_airfoil, y_airfoil)

        # Shrink dt when close to airfoil (linear ramp below 0.1 chord)
        if dist < 0.1:
            dt = dt_base * max(0.1, dist / 0.1)
        else:
            dt = dt_base

        # RK4 stage 1
        try:
            k1u, k1v = _get_velocity(x, y, X, Y, U, V)
        except ValueError:
            break

        vel_mag = np.sqrt(k1u ** 2 + k1v ** 2)
        if vel_mag < 0.01 or vel_mag > 15:
            break

        # RK4 stages 2-4
        try:
            k2u, k2v = _get_velocity(x + 0.5 * dt * k1u, y + 0.5 * dt * k1v, X, Y, U, V)
            k3u, k3v = _get_velocity(x + 0.5 * dt * k2u, y + 0.5 * dt * k2v, X, Y, U, V)
            k4u, k4v = _get_velocity(x + dt * k3u, y + dt * k3v, X, Y, U, V)
        except ValueError:
            break

        # RK4 weighted average
        x_new = x + (dt / 6.0) * (k1u + 2 * k2u + 2 * k3u + k4u)
        y_new = y + (dt / 6.0) * (k1v + 2 * k2v + 2 * k3v + k4v)

        # Domain bounds check
        if x_new < x_min or x_new > x_max:
            break
        if y_new < y_min or y_new > y_max:
            break

        # Airfoil collision check (endpoint)
        if _is_inside_airfoil(x_new, y_new, x_airfoil, y_airfoil):
            break

        # Anti-tunneling: check midpoint for thin trailing edge crossings
        x_mid = 0.5 * (x + x_new)
        y_mid = 0.5 * (y + y_new)
        if _is_inside_airfoil(x_mid, y_mid, x_airfoil, y_airfoil):
            break

        streamline.append([x_new, y_new])
        x, y = x_new, y_new
    
    return streamline


def _interpolate_grid(x, y, X, Y, Z):
    """
    Bilinear interpolation on grid.
    """
    # Find grid indices
    x_grid = X[0, :]
    y_grid = Y[:, 0]
    
    # Find nearest indices
    i = np.searchsorted(x_grid, x) - 1
    j = np.searchsorted(y_grid, y) - 1
    
    # Bounds check
    if i < 0 or i >= len(x_grid) - 1 or j < 0 or j >= len(y_grid) - 1:
        raise ValueError("Point outside grid")
    
    # Bilinear interpolation
    x1, x2 = x_grid[i], x_grid[i + 1]
    y1, y2 = y_grid[j], y_grid[j + 1]
    
    Q11 = Z[j, i]
    Q12 = Z[j + 1, i]
    Q21 = Z[j, i + 1]
    Q22 = Z[j + 1, i + 1]
    
    # Weights
    wx = (x - x1) / (x2 - x1)
    wy = (y - y1) / (y2 - y1)
    
    # Interpolate
    result = (Q11 * (1 - wx) * (1 - wy) +
              Q21 * wx * (1 - wy) +
              Q12 * (1 - wx) * wy +
              Q22 * wx * wy)
    
    return result


def _get_velocity(x, y, X, Y, U, V):
    """Interpolate velocity (u, v) at point (x, y) from the grid."""
    u = _interpolate_grid(x, y, X, Y, U)
    v = _interpolate_grid(x, y, X, Y, V)
    return u, v


def _find_stagnation_point(panels, gamma, alpha_rad):
    """
    Find panel with minimum velocity (stagnation point).
    """
    V_inf = 1.0
    u_inf = V_inf * np.cos(alpha_rad)
    v_inf = V_inf * np.sin(alpha_rad)
    
    min_vel = float('inf')
    stag_idx = 0
    
    for i, panel in enumerate(panels):
        xi, yi = panel['x_mid'], panel['y_mid']
        tx, ty = panel['tx'], panel['ty']
        
        # Compute tangential velocity
        u_total = u_inf
        v_total = v_inf
        
        # Add induced velocities (simplified)
        for j in range(len(panels)):
            from panel_method import _vortex_influence_tangent
            u_j, v_j = _vortex_influence_tangent(panels[j], xi, yi)
            u_total += gamma[j] * u_j
            v_total += gamma[j] * v_j
        
        # Tangential velocity
        v_tang = u_total * tx + v_total * ty
        vel_mag = abs(v_tang)
        
        if vel_mag < min_vel:
            min_vel = vel_mag
            stag_idx = i
    
    return stag_idx