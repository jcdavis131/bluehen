"""Data Refinery catalog (Spec 0018) — public dataset reads, datalab sync,
consented submissions. Every number served here is measured from rows."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func, select

from app.config import REPO_ROOT
from app.database import db_session
from app.models import CatalogDataset, RefinerySubmission

# Baked, read-only card seeds (repo knowledge/) + runtime datalab store.
import os

DATALAB_DIR = Path(os.getenv("DATALAB_DIR", str(REPO_ROOT / "data" / "datalab")))
CARDS_DIRS = [
    Path(os.getenv("OKF_DATASETS_DIR", str(REPO_ROOT / "knowledge" / "datasets"))),
]

MAX_SAMPLE_CHUNKS = 20
SAMPLE_CHUNK_CHARS = 400


def _iso(dt_str: str | None) -> datetime:
    if not dt_str:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)


def sync_from_datalab() -> dict:
    """Upsert catalog rows from datalab manifests (+ their OKF cards).

    Idempotent: keyed by dataset slug; safe to run at boot, after ticks,
    or from the admin endpoint. Reads chunks.jsonl for a sanitized sample.
    """
    synced, skipped = 0, 0
    seed = Path(os.getenv("DATALAB_SEED_DIR", "/nonexistent"))
    manifests = sorted(DATALAB_DIR.glob("*/manifest.json")) + (
        sorted(seed.glob("*/manifest.json")) if seed.is_dir() else []
    )
    with db_session() as session:
        for mf in manifests:
            try:
                m = json.loads(mf.read_text(encoding="utf-8"))
            except Exception:
                skipped += 1
                continue
            slug = m.get("dataset_id") or mf.parent.name
            row = session.scalar(select(CatalogDataset).where(CatalogDataset.slug == slug))
            card_md = None
            card_rel = m.get("okf_card")
            if card_rel:
                for base in CARDS_DIRS + [DATALAB_DIR.parent / "knowledge"]:
                    p = (base.parent / card_rel) if card_rel.startswith("datasets/") else (base / card_rel)
                    cand = base / Path(card_rel).name
                    for c in (p, cand):
                        if c.exists():
                            card_md = c.read_text(encoding="utf-8")
                            break
                    if card_md:
                        break
            sample = None
            chunks_file = mf.parent / "chunks.jsonl"
            if chunks_file.exists():
                sample = []
                with chunks_file.open(encoding="utf-8") as fh:
                    for i, line in enumerate(fh):
                        if i >= MAX_SAMPLE_CHUNKS:
                            break
                        try:
                            c = json.loads(line)
                            sample.append({
                                "text": str(c.get("text", ""))[:SAMPLE_CHUNK_CHARS],
                                "docId": c.get("doc_id") or c.get("docId"),
                            })
                        except Exception:
                            continue
            stats = m.get("stats") or {}
            fields = dict(
                name=m.get("name") or slug,
                doc_count=int(m.get("doc_count") or 0),
                chunk_count=int(m.get("chunk_count") or 0),
                token_estimate=int(stats.get("token_estimate") or stats.get("tokens") or 0),
                tags=list(m.get("tags") or []),
                card_md=card_md,
                provenance={
                    "sources": m.get("sources"),
                    "extractor": m.get("extractor"),
                    "chunkStrategy": m.get("chunk_strategy"),
                    "manifest": str(mf.parent.name),
                },
                source_id=(m.get("sources") or [{}])[0].get("id") if isinstance(m.get("sources"), list) and m.get("sources") else None,
                sample=sample,
                updated_at=datetime.now(timezone.utc),
            )
            if row is None:
                session.add(CatalogDataset(
                    slug=slug, created_at=_iso(m.get("created_at")), **fields))
            else:
                for k, v in fields.items():
                    setattr(row, k, v)
            synced += 1
    return {"synced": synced, "skipped": skipped, "manifests": len(manifests)}


def list_datasets(cursor: str | None, limit: int, tag: str | None, q: str | None) -> dict:
    limit = max(1, min(int(limit or 20), 50))
    with db_session() as session:
        stmt = select(CatalogDataset).order_by(
            CatalogDataset.created_at.desc(), CatalogDataset.id.desc()
        )
        if tag:
            stmt = stmt.where(CatalogDataset.tags.contains([tag]))
        if q:
            stmt = stmt.where(CatalogDataset.name.ilike(f"%{q}%"))
        if cursor:
            try:
                ts, cid = cursor.split("_", 1)
                cdt = datetime.fromisoformat(ts)
                stmt = stmt.where(
                    (CatalogDataset.created_at < cdt)
                    | ((CatalogDataset.created_at == cdt) & (CatalogDataset.id < uuid.UUID(cid)))
                )
            except Exception:
                pass
        rows = session.scalars(stmt.limit(limit + 1)).all()
        items = [_summary(r) for r in rows[:limit]]
        next_cursor = None
        if len(rows) > limit:
            last = rows[limit - 1]
            next_cursor = f"{last.created_at.isoformat()}_{last.id}"
        return {"items": items, "nextCursor": next_cursor}


def _summary(r: CatalogDataset) -> dict:
    return {
        "id": str(r.id),
        "slug": r.slug,
        "name": r.name,
        "docCount": r.doc_count,
        "chunkCount": r.chunk_count,
        "tokenEstimate": r.token_estimate,
        "tags": r.tags or [],
        "createdAt": r.created_at.isoformat(),
    }


def get_dataset(slug_or_id: str) -> dict | None:
    with db_session() as session:
        row = session.scalar(select(CatalogDataset).where(CatalogDataset.slug == slug_or_id))
        if row is None:
            try:
                row = session.get(CatalogDataset, uuid.UUID(slug_or_id))
            except ValueError:
                row = None
        if row is None:
            return None
        out = _summary(row)
        out.update({
            "cardMd": row.card_md,
            "provenance": row.provenance,
            "sourceId": row.source_id,
            "sampleAvailable": bool(row.sample),
        })
        return out


def get_sample(slug_or_id: str) -> dict | None:
    with db_session() as session:
        row = session.scalar(select(CatalogDataset).where(CatalogDataset.slug == slug_or_id))
        if row is None or not row.sample:
            return None
        return {"slug": row.slug, "chunks": row.sample[:MAX_SAMPLE_CHUNKS]}


def stats() -> dict:
    with db_session() as session:
        datasets, docs, chunks = session.execute(
            select(
                func.count(CatalogDataset.id),
                func.coalesce(func.sum(CatalogDataset.doc_count), 0),
                func.coalesce(func.sum(CatalogDataset.chunk_count), 0),
            )
        ).one()
        last = session.scalar(select(func.max(CatalogDataset.updated_at)))
        return {
            "datasets": int(datasets),
            "docs": int(docs),
            "chunks": int(chunks),
            "lastSyncAt": last.isoformat() if last else None,
        }


def submit(workspace_id: uuid.UUID, texts: list[str], consent: bool, tags: list[str]) -> dict:
    """Consented contribution → inbox JSONL + receipt row. Consent required."""
    if not consent:
        raise ValueError("consent is required to store submissions")
    if not texts or len(texts) > 64:
        raise ValueError("provide 1-64 texts")
    texts = [str(t)[:4000] for t in texts if str(t).strip()]
    inbox = DATALAB_DIR / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    receipt = uuid.uuid4()
    ref = inbox / "refinery-submissions.jsonl"
    with ref.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({
            "receipt": str(receipt),
            "workspaceId": str(workspace_id),
            "texts": texts,
            "tags": tags,
            "consent": True,
            "ts": datetime.now(timezone.utc).isoformat(),
        }) + "\n")
    with db_session(workspace_id) as session:
        session.add(RefinerySubmission(
            workspace_id=workspace_id, consent=True, receipt=receipt,
            text_count=len(texts), text_ref=str(ref), tags=tags or [],
        ))
    return {"receipt": str(receipt), "stored": len(texts), "status": "pending-review"}
