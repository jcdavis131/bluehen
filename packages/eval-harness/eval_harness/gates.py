"""Evaluation gates — must pass before deploy.

Every predicate is measured, never stubbed. A missing measurement fails the
gate closed (returns False) rather than silently passing, so a model cannot
reach production serving on an unmeasured dimension.
"""

from __future__ import annotations

BASELINE_EFFECTIVE_RANK = 8.0
MIN_NDCG10 = 0.35

# Matryoshka (MRL) truncation gate. The org embed is served in two tiers:
# full-dim (accurate) and a truncated/int8 edge variant. The edge variant
# must still retrieve well enough to be sellable.
MRL_TRUNCATE_DIMS = 8
MRL_FLOOR = 0.30        # roadmap Phase 3 criterion 3: truncated retrieval floor
MRL_TOLERANCE = 0.05    # max acceptable drop from full -> truncated retrieval


def compute_gates(
    *,
    effective_rank: float,
    ndcg10: float,
    baseline_rank: float = BASELINE_EFFECTIVE_RANK,
    mrl_knn_full: float | None = None,
    mrl_knn_truncated: float | None = None,
    mrl_floor: float = MRL_FLOOR,
    mrl_tolerance: float = MRL_TOLERANCE,
) -> dict:
    if mrl_knn_full is not None and mrl_knn_truncated is not None:
        drop = mrl_knn_full - mrl_knn_truncated
        mrl_ok = mrl_knn_truncated >= mrl_floor and drop <= mrl_tolerance
    else:
        # No MRL measurement available -> fail closed. Never stub True.
        mrl_ok = False
    return {
        "rankAboveBaseline": effective_rank > baseline_rank,
        "ndcgNonRegression": ndcg10 >= MIN_NDCG10,
        "mrlWithinTolerance": mrl_ok,
    }
