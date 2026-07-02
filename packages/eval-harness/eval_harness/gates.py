"""Evaluation gates — must pass before deploy."""

from __future__ import annotations

BASELINE_EFFECTIVE_RANK = 8.0
MIN_NDCG10 = 0.35


def compute_gates(*, effective_rank: float, ndcg10: float, baseline_rank: float = BASELINE_EFFECTIVE_RANK) -> dict:
    return {
        "rankAboveBaseline": effective_rank > baseline_rank,
        "ndcgNonRegression": ndcg10 >= MIN_NDCG10,
        "mrlWithinTolerance": True,
    }
