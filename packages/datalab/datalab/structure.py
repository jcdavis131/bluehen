"""Structured extraction: markdown → validated Pydantic models.

Ladder: Instructor + LiteLLM (any provider, incl. local Ollama) with
automatic validation-retry; heuristic regex extractor as the deterministic
fallback. Fallback results are explicitly low-confidence (≤ 0.3) so
downstream consumers can filter on provenance quality.
"""

from __future__ import annotations

import os
import re
from typing import TypeVar

from pydantic import BaseModel

from datalab.observe import Trace
from datalab.schemas import FinancialMetrics

M = TypeVar("M", bound=BaseModel)

DEFAULT_MODEL = os.environ.get("DATALAB_MODEL", "ollama/llama3")


def extract_structured(
    text: str,
    response_model: type[M],
    *,
    model: str | None = None,
    trace: Trace | None = None,
    max_retries: int = 2,
) -> M:
    """Extract a validated ``response_model`` instance from free text."""
    model = model or DEFAULT_MODEL
    trace = trace or Trace.noop()
    with trace.span("extract_structured", {"model": model, "schema": response_model.__name__}) as span:
        try:
            result = _instructor_extract(text, response_model, model, max_retries)
            span.note({"adapter": "instructor"})
            return result
        except ImportError:
            pass
        except Exception as e:  # provider offline, auth, etc. — degrade, don't crash the pipeline
            span.note({"adapter": "instructor", "error": str(e)[:200]})
        if response_model is FinancialMetrics:
            span.note({"adapter": "heuristic"})
            return heuristic_financials(text)  # type: ignore[return-value]
        raise RuntimeError(
            f"no extractor available for {response_model.__name__}; "
            "run `uv pip install litellm instructor` and set DATALAB_MODEL"
        )


def _instructor_extract(text: str, response_model: type[M], model: str, max_retries: int) -> M:
    import instructor  # type: ignore[import-not-found]
    from litellm import completion  # type: ignore[import-not-found]

    client = instructor.from_litellm(completion)
    return client.chat.completions.create(
        model=model,
        response_model=response_model,
        max_retries=max_retries,
        messages=[
            {
                "role": "system",
                "content": "Extract the requested fields exactly as evidenced in the text. "
                "Use null for anything not stated. Never invent numbers.",
            },
            {"role": "user", "content": text[:24000]},
        ],
    )


_TICKER = re.compile(r"\(?(?:NYSE|NASDAQ|AMEX|OTC)[:\s]+([A-Z]{1,5})\)?")
_REVENUE = re.compile(
    r"revenue[s]?\s+(?:of|was|were|totaled|came in at)?\s*\$?([\d,.]+)\s*(billion|million|thousand)?",
    re.IGNORECASE,
)
_EPS = re.compile(r"(?:diluted\s+)?(?:EPS|earnings per share)\s+(?:of|was|at)?\s*\$?(-?[\d.]+)", re.IGNORECASE)
_POS = ("beat", "record", "growth", "exceeded", "strong", "raised guidance", "outperform")
_NEG = ("miss", "decline", "loss", "weak", "lowered guidance", "underperform", "impairment")
_SCALE = {"billion": 1e9, "million": 1e6, "thousand": 1e3, None: 1.0}


def heuristic_financials(text: str) -> FinancialMetrics:
    """Deterministic regex extraction — the no-LLM fallback path."""
    ticker_m = _TICKER.search(text)
    rev_m = _REVENUE.search(text)
    eps_m = _EPS.search(text)
    low = text.lower()
    pos = sum(low.count(w) for w in _POS)
    neg = sum(low.count(w) for w in _NEG)
    total = pos + neg
    revenue = None
    if rev_m:
        revenue = float(rev_m.group(1).replace(",", "")) * _SCALE[
            rev_m.group(2).lower() if rev_m.group(2) else None
        ]
    return FinancialMetrics(
        ticker=ticker_m.group(1) if ticker_m else "UNKNOWN",
        revenue_usd=revenue,
        eps=float(eps_m.group(1)) if eps_m else None,
        sentiment_score=round((pos - neg) / total, 3) if total else 0.0,
        confidence=0.3 if (ticker_m or rev_m or eps_m) else 0.1,
    )
