"""Pydantic schemas shared across the pipeline.

Instructor/Outlines extraction targets and the point-in-time dataset
manifest. Point-in-time discipline: every record carries ``as_of`` and
``retrieved_at`` so training data can never leak future information.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SourceDoc(BaseModel):
    """A single ingested document, normalized to markdown."""

    doc_id: str
    uri: str
    kind: Literal["html", "pdf", "text", "filing", "transcript"] = "text"
    title: str | None = None
    markdown: str
    as_of: datetime | None = None       # point-in-time validity of the content
    retrieved_at: datetime = Field(default_factory=_now)
    meta: dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def from_content(cls, uri: str, markdown: str, **kwargs: Any) -> "SourceDoc":
        doc_id = hashlib.sha256(f"{uri}\n{markdown}".encode("utf-8")).hexdigest()[:16]
        return cls(doc_id=doc_id, uri=uri, markdown=markdown, **kwargs)


class Chunk(BaseModel):
    """A retrieval unit derived from a SourceDoc."""

    chunk_id: str
    doc_id: str
    ordinal: int
    text: str
    token_estimate: int
    strategy: str = "sentence"
    meta: dict[str, Any] = Field(default_factory=dict)


class FinancialMetrics(BaseModel):
    """Structured extraction target for filings / transcripts / news."""

    ticker: str = Field(description="Primary ticker symbol, uppercase")
    period: str | None = Field(default=None, description="Fiscal period, e.g. FY2025-Q4")
    revenue_usd: float | None = Field(default=None, description="Reported revenue in USD")
    eps: float | None = Field(default=None, description="Diluted earnings per share")
    guidance: str | None = Field(default=None, description="Forward guidance, verbatim summary")
    sentiment_score: float = Field(
        default=0.0, ge=-1.0, le=1.0, description="Document-level sentiment in [-1, 1]"
    )
    confidence: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Extractor self-reported confidence; heuristic fallback caps this at 0.3",
    )


class DatasetManifest(BaseModel):
    """Point-in-time record of one collection run — the unit of provenance."""

    dataset_id: str
    name: str
    created_at: datetime = Field(default_factory=_now)
    sources: list[str] = Field(default_factory=list)
    doc_count: int = 0
    chunk_count: int = 0
    chunk_strategy: str = "sentence"
    extractor: str = "heuristic"        # heuristic | instructor:<model>
    vector_store: str | None = None     # local | qdrant:<collection>
    okf_card: str | None = None         # bundle-relative path of the dataset card
    stats: dict[str, Any] = Field(default_factory=dict)
