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
from app.models import CatalogDataset, DatasetEntitlement, RefinerySubmission

# Baked, read-only card seeds (repo knowledge/) + runtime datalab store.
import os

DATALAB_DIR = Path(os.getenv("DATALAB_DIR", str(REPO_ROOT / "data" / "datalab")))
CARDS_DIRS = [
    Path(os.getenv("OKF_DATASETS_DIR", str(REPO_ROOT / "knowledge" / "datasets"))),
]

MAX_SAMPLE_CHUNKS = 20
SAMPLE_CHUNK_CHARS = 400
DOWNLOAD_TTL_S = 3600


def _iso(dt_str: str | None) -> datetime:
    if not dt_str:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)


def _first_source_id(sources) -> str | None:
    """Manifests store sources as dicts OR plain strings — accept both."""
    if not isinstance(sources, list) or not sources:
        return None
    first = sources[0]
    if isinstance(first, dict):
        return str(first.get("id") or first.get("url") or "")[:128] or None
    return str(first)[:128]


def sync_from_datalab() -> dict:
    """Upsert catalog rows from datalab manifests (+ their OKF cards).

    Idempotent: keyed by dataset slug; safe to run at boot, after ticks,
    or from the admin endpoint. Reads chunks.jsonl for a sanitized sample.
    """
    synced, skipped = 0, 0
    seed = Path(os.getenv("DATALAB_SEED_DIR", "/app/seed/datalab"))
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
                source_id=_first_source_id(m.get("sources")),
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


_STATS_CACHE: dict = {"at": 0.0, "value": None}
_STATS_TTL_S = 60.0  # matches the route's s-maxage


def stats() -> dict:
    """Aggregates behind a short in-process cache (spec §5.1: no full-table
    scans on hot paths — the CDN caches 60s, so origin recomputes at most
    once per window per instance)."""
    import time as _time

    now = _time.time()
    if _STATS_CACHE["value"] is not None and now - _STATS_CACHE["at"] < _STATS_TTL_S:
        return _STATS_CACHE["value"]
    with db_session() as session:
        datasets, docs, chunks = session.execute(
            select(
                func.count(CatalogDataset.id),
                func.coalesce(func.sum(CatalogDataset.doc_count), 0),
                func.coalesce(func.sum(CatalogDataset.chunk_count), 0),
            )
        ).one()
        last = session.scalar(select(func.max(CatalogDataset.updated_at)))
        out = {
            "datasets": int(datasets),
            "docs": int(docs),
            "chunks": int(chunks),
            "lastSyncAt": last.isoformat() if last else None,
        }
    _STATS_CACHE.update(at=now, value=out)
    return out


def get_full_corpus(workspace_id: "uuid.UUID", slug: str) -> tuple[str, str] | None:
    """MON-005 paid tier: full chunks.jsonl for an entitled workspace.
    Returns (filename, jsonl_text) or None when the dataset/file is absent.
    Entitlement is checked by the caller (route) so the 403 carries the SKU."""
    with db_session() as session:
        row = session.scalar(select(CatalogDataset).where(CatalogDataset.slug == slug))
        if row is None or not row.provenance:
            return None
        manifest_dir = (row.provenance or {}).get("manifest")
    if not manifest_dir:
        return None
    import os as _os

    for base in (DATALAB_DIR, Path(_os.getenv("DATALAB_SEED_DIR", "/app/seed/datalab"))):
        f = base / manifest_dir / "chunks.jsonl"
        if f.exists():
            return (f"{slug}.chunks.jsonl", f.read_text(encoding="utf-8"))
    return None


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


def _manifest_dirs() -> list[Path]:
    seed = Path(os.getenv("DATALAB_SEED_DIR", "/app/seed/datalab"))
    dirs = [DATALAB_DIR]
    if seed.is_dir():
        dirs.append(seed)
    return dirs


def resolve_artifact_path(slug: str) -> Path | None:
    """Locate full-corpus chunks.jsonl for a catalog slug."""
    for base in _manifest_dirs():
        for mf in base.glob("*/manifest.json"):
            try:
                m = json.loads(mf.read_text(encoding="utf-8"))
            except Exception:
                continue
            ds_slug = m.get("dataset_id") or mf.parent.name
            if ds_slug != slug and mf.parent.name != slug:
                continue
            chunks = mf.parent / "chunks.jsonl"
            if chunks.exists():
                return chunks
    prov_manifest = None
    with db_session() as session:
        row = session.scalar(select(CatalogDataset).where(CatalogDataset.slug == slug))
        if row and row.provenance:
            prov_manifest = row.provenance.get("manifest")
    if prov_manifest:
        for base in _manifest_dirs():
            chunks = base / str(prov_manifest) / "chunks.jsonl"
            if chunks.exists():
                return chunks
    return None


def grant_entitlement(order_id: str, dataset_slug: str, email: str = "",
                      payment_status: str = "pending-gate") -> dict:
    order_id = order_id.strip()[:128]
    dataset_slug = dataset_slug.strip()[:256]
    if not order_id or not dataset_slug:
        raise ValueError("order_id and dataset_slug required")
    if get_dataset(dataset_slug) is None:
        raise ValueError("dataset not found")
    with db_session() as session:
        row = session.scalar(
            select(DatasetEntitlement).where(
                DatasetEntitlement.order_id == order_id,
                DatasetEntitlement.dataset_slug == dataset_slug,
            ))
        if row is None:
            row = DatasetEntitlement(
                order_id=order_id,
                dataset_slug=dataset_slug,
                email=email[:320],
                payment_status=payment_status,
            )
            session.add(row)
        else:
            if email:
                row.email = email[:320]
            row.payment_status = payment_status
    return {
        "orderId": order_id,
        "datasetSlug": dataset_slug,
        "paymentStatus": payment_status,
    }


def _has_entitlement(order_id: str, dataset_slug: str) -> bool:
    with db_session() as session:
        row = session.scalar(
            select(DatasetEntitlement).where(
                DatasetEntitlement.order_id == order_id,
                DatasetEntitlement.dataset_slug == dataset_slug,
            ))
        return row is not None


def _sign_download_token(slug: str, order_id: str, expires_at: int) -> str:
    import hashlib
    import hmac

    from app.config import API_SECRET_KEY

    payload = f"{slug}:{order_id}:{expires_at}"
    return hmac.new(API_SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()


def verify_download_token(slug: str, order_id: str, expires_at: int, token: str) -> bool:
    import hmac

    if expires_at < int(datetime.now(timezone.utc).timestamp()):
        return False
    expected = _sign_download_token(slug, order_id, expires_at)
    return hmac.compare_digest(expected, token)


def issue_download(slug: str, order_id: str, base_url: str) -> dict:
    order_id = order_id.strip()[:128]
    if not _has_entitlement(order_id, slug):
        raise PermissionError("no entitlement for this order and dataset")
    artifact = resolve_artifact_path(slug)
    if artifact is None:
        raise FileNotFoundError("full corpus artifact not found on disk")
    expires_at = int(datetime.now(timezone.utc).timestamp()) + DOWNLOAD_TTL_S
    token = _sign_download_token(slug, order_id, expires_at)
    base = base_url.rstrip("/")
    url = (
        f"{base}/v1/catalog/datasets/{slug}/artifact"
        f"?orderId={order_id}&expiresAt={expires_at}&token={token}"
    )
    return {
        "url": url,
        "expiresAt": datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat(),
        "format": "jsonl",
        "artifact": "chunks",
    }
