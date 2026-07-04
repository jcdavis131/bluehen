"""RECO-002 (Spec 0023/0025): the recommendations API — the semantic
surface of Recommend Everything. Text-to-item rides the search path;
item-to-item rides the stored embedding of the anchor item directly
(no re-embedding). Every response says WHY (matched snippet as reason)."""

from __future__ import annotations

import uuid

from sqlalchemy import text

from app.database import db_session
from app.services.search import _enrich_payload, search_chunks


def _shape(hits: list[dict], model_version: str | None) -> dict:
    recs = []
    for h in hits:
        p = h.get("payload") or {}
        recs.append({
            "id": h["id"],
            "title": p.get("title") or p.get("docId") or h["id"],
            "score": round(float(h["score"]), 4),
            "reason": (p.get("text") or "")[:200],
            "url": p.get("url"),
            "metadata": {k: v for k, v in p.items()
                         if k not in ("text", "title", "url")},
        })
    return {"modelVersion": model_version, "recommendations": recs}


def recommend_by_text(workspace_id: uuid.UUID, query_text: str, k: int = 5) -> dict:
    out = search_chunks(workspace_id, query_text, k=k)
    return _shape(out.get("hits", []), out.get("modelVersion"))


def recommend_by_item(workspace_id: uuid.UUID, item_id: str, k: int = 5) -> dict:
    """Nearest neighbors of a known item, excluding itself, using its
    stored vector — the item's own trained-space position is the query."""
    with db_session(workspace_id) as session:
        # Anchor in the DEPLOYED model's space; stale index rows from other
        # versions persist and must not win by lexicographic accident.
        anchor = session.execute(text("""
            SELECT dc.chunk_id, dc.embedding, dc.model_version
            FROM document_chunks dc
            JOIN model_versions mv
              ON mv.workspace_id = dc.workspace_id
             AND mv.version = dc.model_version AND mv.deployed
            WHERE dc.workspace_id = :wid AND dc.chunk_id = :cid
            LIMIT 1
        """), {"wid": str(workspace_id), "cid": item_id}).mappings().first()
        if anchor is None:
            anchor = session.execute(text("""
                SELECT chunk_id, embedding, model_version
                FROM document_chunks
                WHERE workspace_id = :wid AND chunk_id = :cid
                ORDER BY model_version DESC LIMIT 1
            """), {"wid": str(workspace_id), "cid": item_id}).mappings().first()
        if anchor is None:
            raise LookupError(f"item {item_id!r} not found in the index")
        rows = session.execute(text("""
            SELECT chunk_id, text, payload,
                   1 - (embedding <=> :avec) AS score
            FROM document_chunks
            WHERE workspace_id = :wid AND model_version = :mv
              AND chunk_id != :cid
            ORDER BY embedding <=> :avec LIMIT :k
        """), {"wid": str(workspace_id), "avec": anchor["embedding"],
               "mv": anchor["model_version"], "cid": item_id, "k": k}).mappings().all()
    hits = [{"id": r["chunk_id"], "score": r["score"],
             "payload": _enrich_payload(r["payload"], r["text"])} for r in rows]
    return _shape(hits, anchor["model_version"])
