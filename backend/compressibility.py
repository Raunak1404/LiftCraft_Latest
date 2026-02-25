"""
Compressibility Corrections Module
Applies Prandtl-Glauert and Karman-Tsien corrections to incompressible aerodynamic data.
Valid for subsonic flow (M < ~0.7).
"""

import numpy as np


def prandtl_glauert_factor(mach):
    """
    Compute the Prandtl-Glauert compressibility correction factor.
    beta = 1 / sqrt(1 - M^2)

    Valid for M < 1.0 (subsonic only).
    """
    if mach < 0.0 or mach >= 1.0:
        raise ValueError(f"Mach number {mach} out of valid range [0, 1.0)")
    if mach < 0.01:
        return 1.0
    return 1.0 / np.sqrt(1.0 - mach ** 2)


def correct_cl(CL_inc, mach):
    """
    Apply Prandtl-Glauert correction to lift coefficient.
    CL_comp = CL_inc / sqrt(1 - M^2)
    """
    if mach < 0.01:
        return CL_inc
    return CL_inc * prandtl_glauert_factor(mach)


def correct_cd(CD_inc, mach):
    """
    Apply approximate compressibility correction to drag coefficient.
    Uses Prandtl-Glauert scaling (standard for preliminary design at M < 0.7).

    Note: This is approximate — it applies the same scaling to both pressure
    and friction drag components. More accurate methods would separate them.
    """
    if mach < 0.01:
        return CD_inc
    return CD_inc * prandtl_glauert_factor(mach)


def correct_cm(CM_inc, mach):
    """
    Apply Prandtl-Glauert correction to pitching moment coefficient.
    CM_comp = CM_inc / sqrt(1 - M^2)
    """
    if mach < 0.01:
        return CM_inc
    return CM_inc * prandtl_glauert_factor(mach)


def correct_cp_karman_tsien(Cp_inc, mach):
    """
    Apply Karman-Tsien correction to pressure coefficient distribution.
    More accurate than Prandtl-Glauert for Cp because it accounts for
    local Mach number effects.

    Cp_comp = Cp_inc / (beta + M^2 * Cp_inc / (2 * (1 + beta)))

    where beta = sqrt(1 - M^2)

    Parameters:
    -----------
    Cp_inc : float or array-like
        Incompressible pressure coefficient(s)
    mach : float
        Freestream Mach number (0 <= M < 1)

    Returns:
    --------
    Corrected Cp values
    """
    if mach < 0.01:
        return Cp_inc

    Cp_inc = np.asarray(Cp_inc, dtype=float)
    beta = np.sqrt(1.0 - mach ** 2)

    denominator = beta + (mach ** 2 * Cp_inc) / (2.0 * (1.0 + beta))

    # Avoid division by zero or near-zero
    denominator = np.where(np.abs(denominator) < 1e-10, 1e-10, denominator)

    return Cp_inc / denominator
