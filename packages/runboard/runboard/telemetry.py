"""ASN telemetry: variance-based Shannon-entropy effective rank and R2D curvature.

Numpy implementations so trackers and evaluation scripts can compute
telemetry without a torch dependency. The definition matches
``asn_engine.spectral.effective_rank`` (entropy of the normalized
singular-value spectrum, exponentiated).
"""

from __future__ import annotations

from typing import Any, Callable, Sequence

import numpy as np


def effective_rank(x: np.ndarray, eps: float = 1e-12) -> float:
    """Shannon-entropy effective rank of a (n_samples, dim) embedding matrix.

    exp(H(p)) where p is the singular-value energy distribution of the
    mean-centered matrix. Ranges from 1.0 (fully collapsed) to min(n, dim).
    """
    x = np.asarray(x, dtype=np.float64)
    if x.ndim != 2 or min(x.shape) < 2:
        return 1.0
    x = x - x.mean(axis=0, keepdims=True)
    s = np.linalg.svd(x, compute_uv=False)
    p = (s**2) / max((s**2).sum(), eps)
    p = p[p > eps]
    h = -(p * np.log(p)).sum()
    return float(np.exp(h))


def r2d_curvature(layer_ranks: Sequence[float]) -> list[float]:
    """Representational-to-Depth curvature: discrete second difference of
    effective rank across network depth.

    Near-zero curvature over a span of blocks marks a flat, redundant
    transition region — a pruning candidate. Returns len(layer_ranks) - 2
    values (curvature is undefined at the endpoints).
    """
    r = np.asarray(layer_ranks, dtype=np.float64)
    if r.size < 3:
        return []
    return list(r[2:] - 2.0 * r[1:-1] + r[:-2])


class RankMonitor:
    """Streaming collapse detector.

    Feed it the effective rank each eval step; it reports a collapse alert
    when the rank falls below an absolute floor or drops sharply relative
    to its recent history (the trigger condition for spectral surgery /
    heterosynaptic decay in the ASN loop).
    """

    def __init__(
        self,
        floor: float = 12.0,
        drop_ratio: float = 0.5,
        window: int = 10,
        on_alert: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self.floor = floor
        self.drop_ratio = drop_ratio
        self.window = window
        self.on_alert = on_alert
        self.history: list[float] = []

    def update(self, rank: float) -> dict[str, Any] | None:
        """Record a rank observation; return an alert dict if collapse is detected."""
        recent = self.history[-self.window :]
        baseline = float(np.median(recent)) if recent else None
        self.history.append(float(rank))

        alert: dict[str, Any] | None = None
        if rank < self.floor:
            alert = {"reason": "below_floor", "rank": rank, "floor": self.floor}
        elif baseline is not None and baseline > 0 and rank < baseline * self.drop_ratio:
            alert = {
                "reason": "sharp_drop",
                "rank": rank,
                "baseline": baseline,
                "dropRatio": self.drop_ratio,
            }
        if alert and self.on_alert:
            self.on_alert(alert)
        return alert
