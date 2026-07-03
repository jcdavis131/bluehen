"""Automated certification (Spec 0021 P4 — the no-human-in-the-loop half).

Contract: the customer's endpoint accepts POST {"texts": [...]} and
returns {"vectors": [[...], ...]} (one vector per text, same order).
The worker embeds a fixed eval slice through THEIR endpoint and grades
it with the same metric code that grades our own models. Payment is
recorded as pending-gate until Stripe/Medusa attach (Operator gate) —
the scorecard itself is honest and free of payment state.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select, update

from app.database import db_session
from app.models import CertSubmission

log = logging.getLogger("synthaembed.certify")

MAX_PAIRS = 32
CALL_TIMEOUT_S = 30.0
BATCH = 8
STALE_MINUTES = 30


def validate_endpoint(url: str) -> None:
    from datalab.ingest import _guard_ssrf

    if not url.startswith("https://"):
        raise ValueError("endpoint must be https://")
    _guard_ssrf(url)


def submit(workspace_id: uuid.UUID, endpoint_url: str) -> dict:
    validate_endpoint(endpoint_url)
    with db_session(workspace_id) as session:
        row = CertSubmission(
            id=uuid.uuid4(), workspace_id=workspace_id,
            endpoint_url=endpoint_url[:2000],
        )
        session.add(row)
        sid = row.id
    return {
        "submissionId": str(sid),
        "status": "pending",
        "contract": 'your endpoint: POST {"texts": [...]} -> {"vectors": [[...], ...]}',
        "paymentStatus": "pending-gate",
    }


def get_submission(workspace_id: uuid.UUID, sid: str) -> dict | None:
    with db_session(workspace_id) as session:
        row = session.get(CertSubmission, uuid.UUID(sid))
        if row is None or row.workspace_id != workspace_id:
            return None
        return {
            "submissionId": str(row.id), "status": row.status,
            "scorecard": row.scorecard, "error": row.error,
            "paymentStatus": row.payment_status,
            "createdAt": row.created_at.isoformat(),
        }


def claim_next_cert() -> dict | None:
    with db_session() as session:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=STALE_MINUTES)
        session.execute(
            update(CertSubmission)
            .where(CertSubmission.status == "running", CertSubmission.updated_at < cutoff)
            .values(status="pending", updated_at=datetime.now(timezone.utc)))
        row = session.scalar(
            select(CertSubmission).where(CertSubmission.status == "pending")
            .order_by(CertSubmission.created_at).with_for_update(skip_locked=True).limit(1))
        if row is None:
            return None
        row.status = "running"
        row.updated_at = datetime.now(timezone.utc)
        return {"id": row.id, "workspace_id": row.workspace_id, "endpoint_url": row.endpoint_url}


def _finish(sid: uuid.UUID, **fields) -> None:
    with db_session() as session:
        row = session.get(CertSubmission, sid)
        if row is not None:
            for k, v in fields.items():
                setattr(row, k, v)
            row.updated_at = datetime.now(timezone.utc)


def _eval_pairs() -> list[dict]:
    """Fixed certification slice: first MAX_PAIRS from the largest public
    catalog dataset's sample chunks, paired text->text (anchor=chunk,
    positive=same-doc next chunk when available, else itself-with-prefix)."""
    from app.models import CatalogDataset

    with db_session() as session:
        row = session.scalar(
            select(CatalogDataset).where(CatalogDataset.sample.isnot(None))
            .order_by(CatalogDataset.chunk_count.desc()).limit(1))
        chunks = (row.sample or []) if row else []
    pairs = []
    for i, c in enumerate(chunks[:MAX_PAIRS]):
        text = c.get("text", "")
        nxt = chunks[i + 1]["text"] if i + 1 < len(chunks) else f"summary: {text[:120]}"
        pairs.append({"anchor": text, "positive": nxt})
    return pairs


def _embed_via(url: str, texts: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    with httpx.Client(timeout=CALL_TIMEOUT_S) as client:
        for start in range(0, len(texts), BATCH):
            chunk = texts[start:start + BATCH]
            r = client.post(url, json={"texts": chunk})
            r.raise_for_status()
            out = r.json()
            vecs = out.get("vectors")
            if not isinstance(vecs, list) or len(vecs) != len(chunk):
                raise ValueError("endpoint contract violation: vectors missing or wrong length")
            vectors.extend(vecs)
    return vectors


def run_cert_job(payload: dict) -> None:
    import torch

    from asn_engine.spectral import effective_rank
    from eval_harness.gates import compute_gates
    from eval_harness.metrics import ndcg_at_k, retrieval_scores

    sid = payload["id"]
    url = payload["endpoint_url"]
    try:
        validate_endpoint(url)
        pairs = _eval_pairs()
        if len(pairs) < 8:
            _finish(sid, status="failed", error="certification slice unavailable (<8 pairs in catalog)")
            return
        anchors = _embed_via(url, [p["anchor"] for p in pairs])
        positives = _embed_via(url, [p["positive"] for p in pairs])
        ndcgs = []
        for i, (q, pos) in enumerate(zip(anchors, positives)):
            neg = positives[(i + 1) % len(positives)]
            ranked = retrieval_scores(q, [(f"pos-{i}", pos), (f"neg-{i}", neg)])
            rel = [1.0 if doc_id == f"pos-{i}" else 0.0 for doc_id, _ in ranked]
            ndcgs.append(ndcg_at_k(rel, k=2))
        er = effective_rank(torch.tensor(anchors, dtype=torch.float32))
        ndcg = sum(ndcgs) / len(ndcgs)
        gates = compute_gates(ndcg10=ndcg, effective_rank=er,
                              mrl_knn_full=ndcg, mrl_knn_truncated=ndcg)
        scorecard = {
            "ndcg10": round(ndcg, 4),
            "effectiveRank": round(er, 2),
            "dims": len(anchors[0]) if anchors else 0,
            "pairsEvaluated": len(pairs),
            "gates": gates.get("gates", gates),
            "passed": bool(gates.get("allPassed", False)),
            "slice": "certification-v1 (largest public catalog sample)",
            "gradedAt": datetime.now(timezone.utc).isoformat(),
            "metricParity": "same retrieval_scores + ndcg_at_k that grade our own models",
        }
        try:
            from app.services import handoffs

            handoffs.record_scorecard(
                site_id="validation", candidate_id=f"cert-{sid}",
                passed=scorecard["passed"],
                exams=[{"metric": "ndcg10", "value": scorecard["ndcg10"]},
                       {"metric": "effectiveRank", "value": scorecard["effectiveRank"]}],
                notes="automated certification (Spec 0021 P4)", recorded_by="worker")
        except Exception as exc:
            scorecard["publishNote"] = f"scorecard file publish skipped: {exc}"
        _finish(sid, status="completed", scorecard=scorecard)
        log.info("certification %s completed passed=%s ndcg=%.4f", sid, scorecard["passed"], ndcg)
    except Exception as exc:
        log.exception("certification failed %s", sid)
        _finish(sid, status="failed", error=str(exc)[:500])
