import numpy as np
import aerosandbox as asb
from math import comb


# -------------------------
# Bernstein polynomial
# -------------------------
def bernstein(n, i, x):
    """
    Bernstein basis polynomial.
    
    Parameters:
    -----------
    n : int
        Polynomial degree
    i : int
        Basis function index (0 to n)
    x : array
        Evaluation points [0, 1]
    
    Returns:
    --------
    B : array
        Bernstein polynomial values
    """
    return comb(n, i) * x**i * (1 - x)**(n - i)


# -------------------------
# CST surface (vectorized)
# -------------------------
def cst_surface(x, weights, N1=0.5, N2=1.0):
    """
    Compute CST surface y(x) for a vector x.
    
    The CST (Class-Shape Transformation) method represents airfoil
    surfaces as:
        y(x) = C(x) * S(x)
    where:
        C(x) = x^N1 * (1-x)^N2  [class function]
        S(x) = Σ w_i * B_i(x)   [shape function, Bernstein polynomials]
    
    Parameters:
    -----------
    x : array
        Chordwise positions [0, 1]
    weights : array
        CST coefficients (length = n+1 for degree n)
    N1 : float
        Leading edge exponent (default: 0.5 for airfoils)
    N2 : float
        Trailing edge exponent (default: 1.0 for airfoils)
    
    Returns:
    --------
    y : array
        Surface coordinates
    
    Notes:
    ------
    - For airfoils: N1=0.5, N2=1.0 (standard)
    - C(x) naturally creates LE roundness and TE closure
    - Shape function S(x) modifies the basic airfoil shape
    """
    n = len(weights) - 1
    
    # Class function (airfoil-type with LE/TE characteristics)
    # Using clip to avoid numerical issues at boundaries
    x_safe = np.clip(x, 1e-10, 1.0 - 1e-10)
    C = x_safe**N1 * (1 - x_safe)**N2
    
    # Handle exact boundaries
    C[x <= 0] = 0.0
    C[x >= 1] = 0.0
    
    # Shape function (Bernstein polynomial expansion)
    S = np.zeros_like(x)
    for i in range(n + 1):
        S += weights[i] * bernstein(n, i, x)
    
    return C * S


def validate_cst_coefficients(upper, lower, strict=False):
    """
    Validate CST coefficients for physical realizability.
    
    Parameters:
    -----------
    upper : array
        Upper surface CST coefficients
    lower : array
        Lower surface CST coefficients
    strict : bool
        If True, apply stricter bounds
    
    Returns:
    --------
    valid : bool
        True if coefficients are valid
    message : str
        Description of any issues
    """
    issues = []
    
    # Check for finite values
    if not (np.all(np.isfinite(upper)) and np.all(np.isfinite(lower))):
        return False, "Non-finite CST coefficients detected"
    
    # Check magnitude (prevent extreme values)
    max_coef = 1.0 if strict else 2.0
    if np.any(np.abs(upper) > max_coef) or np.any(np.abs(lower) > max_coef):
        issues.append(f"Coefficients exceed ±{max_coef}")
    
    # Check for monotonic decrease (typical for airfoils)
    # First few coefficients should generally decrease
    if strict and len(upper) >= 3:
        if not (upper[0] > upper[1] > upper[2] - 0.05):
            issues.append("Upper surface lacks typical monotonic decrease")
    
    # Warn if lower surface has unusual pattern
    if strict and len(lower) >= 2:
        if lower[0] > 0.3:  # Lower surface first coef usually smaller
            issues.append("Lower surface first coefficient unusually large")
    
    if issues:
        return False, "; ".join(issues)
    
    return True, "Valid"


def check_self_intersection(x, yu, yl, tolerance=1e-4):
    """
    Check for self-intersection between upper and lower surfaces.
    
    Parameters:
    -----------
    x : array
        Chordwise positions
    yu : array
        Upper surface y-coordinates
    yl : array
        Lower surface y-coordinates
    tolerance : float
        Minimum allowed thickness
    
    Returns:
    --------
    valid : bool
        True if no intersection
    min_thickness : float
        Minimum thickness found
    """
    t = yu - yl
    min_t = float(np.min(t))
    
    if min_t < -tolerance:
        return False, min_t
    
    return True, min_t


# -------------------------
# Airfoil builder
# -------------------------
def airfoil_from_cst(upper, lower, N=200, return_surfaces=False, validate=True):
    """
    Create an AeroSandbox Airfoil from CST coefficients.
    
    Parameters:
    -----------
    upper : array
        Upper surface CST coefficients
    lower : array
        Lower surface CST coefficients
    N : int
        Number of points (default: 200)
    return_surfaces : bool
        If True, return (airfoil, x, yu, yl)
    validate : bool
        If True, perform validation checks (default: True)
    
    Returns:
    --------
    airfoil : asb.Airfoil
        AeroSandbox airfoil object
    x, yu, yl : arrays (optional)
        Coordinate arrays if return_surfaces=True
    
    Raises:
    -------
    ValueError
        If coefficients are invalid or airfoil has self-intersection
    
    Notes:
    ------
    - Uses cosine spacing for better resolution at LE/TE
    - Enforces LE and TE closure
    - All geometry constraints should be handled in the objective function
    - This function focuses on robustness and validity
    
    CST Method Reference:
    Kulfan, B. M., "Universal Parametric Geometry Representation Method",
    Journal of Aircraft, Vol. 45, No. 1, 2008.
    """
    
    # Validate inputs
    if validate:
        valid, msg = validate_cst_coefficients(upper, lower, strict=False)
        if not valid:
            raise ValueError(f"Invalid CST coefficients: {msg}")
    
    if len(upper) != len(lower):
        raise ValueError(f"Upper ({len(upper)}) and lower ({len(lower)}) must have same length")
    
    if N < 50:
        raise ValueError(f"N={N} too small, use at least 50 points")
    
    # Cosine-spaced chord grid (better clustering at LE/TE)
    # This provides more resolution where curvature is highest
    beta = np.linspace(0.0, np.pi, N)
    x = 0.5 * (1 - np.cos(beta))  # Maps [0, π] -> [0, 1]
    
    # Generate upper and lower surfaces using CST method
    yu = cst_surface(x, upper)
    yl = cst_surface(x, lower)
    
    # CRITICAL: Enforce LE and TE closure
    # CST naturally tends toward closure but may have numerical errors
    yu[0] = yl[0] = 0.0   # Leading edge (x=0)
    yu[-1] = yl[-1] = 0.0  # Trailing edge (x=1)
    
    # Validation: Check for self-intersection
    if validate:
        valid, min_t = check_self_intersection(x, yu, yl, tolerance=1e-5)
        if not valid:
            raise ValueError(f"Self-intersection detected: min thickness = {min_t:.6f}")
    
    # Additional numerical safety checks
    if not np.all(np.isfinite(yu)) or not np.all(np.isfinite(yl)):
        raise ValueError("Non-finite coordinates in CST surface generation")
    
    # Check for reasonable coordinate magnitudes
    if np.max(np.abs(yu)) > 1.0 or np.max(np.abs(yl)) > 1.0:
        raise ValueError(f"Unreasonable coordinate magnitudes: max(|yu|)={np.max(np.abs(yu)):.3f}, max(|yl|)={np.max(np.abs(yl)):.3f}")
    
    # Assemble coordinates for AeroSandbox
    # Convention: Start at TE, go around upper surface to LE, 
    #            then around lower surface back to TE
    # Upper surface: TE → LE (reversed)
    # Lower surface: LE → TE (forward, skip duplicate LE point)
    coords = np.vstack([
        np.column_stack([x[::-1], yu[::-1]]),  # Upper: TE to LE
        np.column_stack([x[1:], yl[1:]])       # Lower: LE to TE (skip duplicate LE)
    ])
    
    # Final sanity check
    if coords.shape[0] != 2*N - 1:
        raise ValueError(f"Coordinate array size mismatch: expected {2*N-1}, got {coords.shape[0]}")
    
    # Create AeroSandbox airfoil
    try:
        airfoil = asb.Airfoil(coordinates=coords)
    except Exception as e:
        raise ValueError(f"Failed to create AeroSandbox Airfoil: {str(e)}")
    
    if return_surfaces:
        return airfoil, x, yu, yl
    
    return airfoil


def export_airfoil_dat(airfoil, filename, name=None):
    """
    Export airfoil to Selig format (.dat file).
    
    Parameters:
    -----------
    airfoil : asb.Airfoil
        AeroSandbox airfoil object
    filename : str
        Output filename (should end in .dat)
    name : str, optional
        Airfoil name (default: filename without extension)
    """
    if name is None:
        name = filename.replace('.dat', '')
    
    coords = airfoil.coordinates
    
    with open(filename, 'w') as f:
        f.write(f"{name}\n")
        for x, y in coords:
            f.write(f"{x:10.6f}  {y:10.6f}\n")
    
    print(f"✓ Airfoil exported to {filename}")


def cst_derivatives(x, weights, N1=0.5, N2=1.0):
    """
    Compute derivatives of CST surface (for curvature analysis).
    
    Parameters:
    -----------
    x : array
        Chordwise positions [0, 1]
    weights : array
        CST coefficients
    N1, N2 : float
        Class function exponents
    
    Returns:
    --------
    dy_dx : array
        First derivative dy/dx
    """
    n = len(weights) - 1
    x_safe = np.clip(x, 1e-10, 1.0 - 1e-10)
    
    # Class function and its derivative
    C = x_safe**N1 * (1 - x_safe)**N2
    dC_dx = N1 * x_safe**(N1-1) * (1-x_safe)**N2 - N2 * x_safe**N1 * (1-x_safe)**(N2-1)
    
    # Shape function and its derivative
    S = np.zeros_like(x)
    dS_dx = np.zeros_like(x)
    
    for i in range(n + 1):
        B = bernstein(n, i, x)
        S += weights[i] * B
        
        # Derivative of Bernstein polynomial
        if i > 0:
            dB_dx = n * (bernstein(n-1, i-1, x) - bernstein(n-1, i, x) if i < n else -bernstein(n-1, i-1, x))
        else:
            dB_dx = -n * bernstein(n-1, 0, x)
        
        dS_dx += weights[i] * dB_dx
    
    # Product rule: d(CS)/dx = C'S + CS'
    dy_dx = dC_dx * S + C * dS_dx
    
    return dy_dx