"""Retrieval and intrinsic metrics."""

from __future__ import annotations

import math


def ndcg_at_k(relevances: list[float], k: int = 10) -> float:
    rel = relevances[:k]
    if not rel:
        return 0.0
    dcg = sum((2**r - 1) / math.log2(i + 2) for i, r in enumerate(rel))
    ideal = sorted(relevances, reverse=True)[:k]
    idcg = sum((2**r - 1) / math.log2(i + 2) for i, r in enumerate(ideal))
    return dcg / idcg if idcg > 0 else 0.0


def retrieval_scores(query_vec: list[float], corpus: list[tuple[str, list[float]]]) -> list[tuple[str, float]]:
    def cosine(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x * x for x in a)) or 1.0
        nb = math.sqrt(sum(y * y for y in b)) or 1.0
        return dot / (na * nb)

    scored = [(doc_id, cosine(query_vec, vec)) for doc_id, vec in corpus]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored
