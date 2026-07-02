"""LLM-free SmartSearch-inspired retrieval — parse, recall, rank, truncate."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Iterable


@dataclass
class SearchHit:
    doc_id: str
    text: str
    score: float
    matched_terms: list[str]


_PROPER = re.compile(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b")
_WORD = re.compile(r"\b[a-zA-Z]{3,}\b")
_STOP = frozenset(
    "the and for with from this that have will been were are was has into over under".split()
)


def extract_terms(query: str) -> list[tuple[str, float]]:
    """Weight terms: proper noun=3, noun=2, verb-ish=1 (heuristic without spaCy)."""
    terms: dict[str, float] = {}
    for m in _PROPER.finditer(query):
        t = m.group().lower()
        terms[t] = max(terms.get(t, 0), 3.0)
    for m in _WORD.finditer(query):
        t = m.group().lower()
        if t in _STOP:
            continue
        if t not in terms:
            terms[t] = 2.0
    if not terms:
        for w in query.lower().split():
            if len(w) > 2 and w not in _STOP:
                terms[w] = 1.0
    return sorted(terms.items(), key=lambda x: -x[1])


def _overlap_score(text: str, weighted_terms: list[tuple[str, float]]) -> tuple[float, list[str]]:
    lower = text.lower()
    score = 0.0
    matched: list[str] = []
    for term, weight in weighted_terms:
        if term in lower:
            score += weight
            matched.append(term)
    return score, matched


def smart_search(
    query: str,
    documents: Iterable[dict[str, str]],
    *,
    alpha: float = 0.35,
    min_hits: int = 1,
) -> list[SearchHit]:
    """
    Recall via substring match; rank by weighted overlap; truncate at τ = α · max(score).
    """
    weighted = extract_terms(query)
    hits: list[SearchHit] = []
    for doc in documents:
        text = doc.get("text", "")
        doc_id = doc.get("id", "")
        score, matched = _overlap_score(text, weighted)
        if score > 0:
            hits.append(SearchHit(doc_id=doc_id, text=text, score=score, matched_terms=matched))
    hits.sort(key=lambda h: -h.score)
    if not hits:
        return []
    max_score = hits[0].score
    tau = alpha * max_score
    return [h for h in hits if h.score >= tau][: max(min_hits, len(hits))]


def reciprocal_rank_fusion(rank_lists: list[list[str]], k: int = 60) -> dict[str, float]:
    """RRF fusion for multi-list retrieval (e.g. grep + rules)."""
    scores: dict[str, float] = {}
    for rlist in rank_lists:
        for rank, doc_id in enumerate(rlist, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
    return scores
