"""Small scoring helpers shared by the speech analysis modules."""
import math
from typing import Iterable, Optional, Tuple


def clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def clean(x) -> Optional[float]:
    """Return a JSON-safe float (NaN/inf -> None)."""
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else f


def lower_better(x: Optional[float], good: float, bad: float) -> Optional[float]:
    """100 when x <= good, 0 when x >= bad, linear in between."""
    if x is None:
        return None
    if x <= good:
        return 100.0
    if x >= bad:
        return 0.0
    return 100.0 * (bad - x) / (bad - good)


def higher_better(x: Optional[float], good: float, bad: float) -> Optional[float]:
    """100 when x >= good, 0 when x <= bad."""
    if x is None:
        return None
    if x >= good:
        return 100.0
    if x <= bad:
        return 0.0
    return 100.0 * (x - bad) / (good - bad)


def band(x: Optional[float], lo: float, hi: float, zero_lo: float, zero_hi: float) -> Optional[float]:
    """100 inside [lo, hi], falling linearly to 0 at zero_lo / zero_hi."""
    if x is None:
        return None
    if lo <= x <= hi:
        return 100.0
    if x < lo:
        return 0.0 if x <= zero_lo else 100.0 * (x - zero_lo) / (lo - zero_lo)
    return 0.0 if x >= zero_hi else 100.0 * (zero_hi - x) / (zero_hi - hi)


def weighted(parts: Iterable[Tuple[Optional[float], float]]) -> Optional[float]:
    """Weighted mean that skips unavailable (None) components and renormalizes."""
    num = den = 0.0
    for value, weight in parts:
        if value is None:
            continue
        num += value * weight
        den += weight
    return None if den == 0 else num / den
