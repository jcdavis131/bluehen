"""Embedding health check (Spec 0015, dumbmodel venture).

Embeds a user-submitted text sample with the workspace's serving model
and reports measured diagnostics: effective rank of the sample's
embedding matrix (variance-based Shannon entropy — same definition as
the training telemetry) and mean pairwise cosine similarity (redundancy).
Consented submissions land in the datalab inbox so the continuous
dataset builder can pick them up with provenance.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from runboard.telemetry import effective_rank

from app.services import models_svc

MIN_TEXTS = 3
MAX_TEXTS = 64
MAX_CHARS = 2000


def _inbox_dir() -> Path:
    root = os.environ.get("DATALAB_DIR")
    if root:
        return Path(root) / "inbox"
    from app.config import REPO_ROOT

    return REPO_ROOT / "data" / "datalab" / "inbox"


def diagnose_corpus(
    workspace_id: uuid.UUID,
    texts: list[str],
    *,
    consent: bool = False,
    site_id: str | None = None,
) -> dict:
    cleaned = [t.strip()[:MAX_CHARS] for t in texts if t and t.strip()]
    if len(cleaned) < MIN_TEXTS:
        raise ValueError(f"need at least {MIN_TEXTS} non-empty text samples")
    if len(cleaned) > MAX_TEXTS:
        raise ValueError(f"at most {MAX_TEXTS} samples per check")

    out = models_svc.embed_texts(workspace_id, cleaned, truncate=False)
    matrix = np.asarray(out["vectors"], dtype=np.float64)
    n, dims = matrix.shape

    er = effective_rank(matrix)
    normed = matrix / np.maximum(np.linalg.norm(matrix, axis=1, keepdims=True), 1e-9)
    sims = normed @ normed.T
    upper = sims[np.triu_indices(n, k=1)]
    mean_sim = float(upper.mean()) if upper.size else 0.0

    max_possible = float(min(n, dims))
    utilization = er / max_possible if max_possible > 0 else 0.0

    if consent:
        inbox = _inbox_dir()
        inbox.mkdir(parents=True, exist_ok=True)
        record = {
            "receivedAt": datetime.now(timezone.utc).isoformat(),
            "siteId": site_id,
            "texts": cleaned,
            "effectiveRank": round(er, 3),
            "modelVersion": out["modelVersion"],
        }
        with (inbox / "health-check-submissions.jsonl").open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")

    return {
        "samples": n,
        "dims": dims,
        "effectiveRank": round(er, 3),
        "maxPossibleRank": max_possible,
        "utilization": round(utilization, 4),
        "meanPairwiseSimilarity": round(mean_sim, 4),
        "modelVersion": out["modelVersion"],
        "consentStored": bool(consent),
    }
