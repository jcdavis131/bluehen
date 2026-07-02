"""Vector search over indexed document chunks."""

from __future__ import annotations

import math
import uuid

from sqlalchemy import text

from app.database import db_session
from app.services.models_svc import apply_serving_tier, embed_texts


def _parse_embedding(raw) -> list[float]:
    if raw is None:
        return []
    if isinstance(raw, (list, tuple)):
        return [float(x) for x in raw]
    s = str(raw).strip()
    if s.startswith("[") and s.endswith("]"):
        s = s[1:-1]
    if not s:
        return []
    return [float(x) for x in s.split(",")]


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


def search_chunks(
    workspace_id: uuid.UUID,
    query: str,
    *,
    k: int = 10,
    collection_id: str | None = None,
    truncate_dims: int | None = None,
    quant: str | None = None,
) -> dict:
    embed_out = embed_texts(workspace_id, [query], truncate=False)
    q_full = embed_out["vectors"][0]
    tiered = truncate_dims is not None or quant is not None

    if not tiered:
        vec_literal = "[" + ",".join(str(x) for x in q_full) + "]"
        sql = """
            SELECT chunk_id, text, payload, model_version,
                   1 - (embedding <=> CAST(:qvec AS vector)) AS score
            FROM document_chunks
            WHERE workspace_id = :wid
        """
        params: dict = {"wid": str(workspace_id), "qvec": vec_literal, "k": k}
        if collection_id:
            sql += " AND collection_id = :cid"
            params["cid"] = collection_id
        sql += " ORDER BY embedding <=> CAST(:qvec AS vector) LIMIT :k"

        with db_session(workspace_id) as session:
            rows = session.execute(text(sql), params).mappings().all()

        hits = [
            {
                "id": r["chunk_id"],
                "score": float(r["score"]),
                "payload": r["payload"] or {"text": r["text"]},
            }
            for r in rows
        ]
        return {
            "query": query,
            "hits": hits,
            "modelVersion": embed_out["modelVersion"],
            "backend": "pgvector",
            "tier": {"truncateDims": None, "quant": None, "label": "full"},
        }

    # Edge / MRL tier: ANN pool on full vectors, re-rank with Matryoshka + quant applied.
    pool_k = max(k * 12, 64)
    vec_literal = "[" + ",".join(str(x) for x in q_full) + "]"
    sql = """
        SELECT chunk_id, text, payload, model_version, embedding,
               1 - (embedding <=> CAST(:qvec AS vector)) AS full_score
        FROM document_chunks
        WHERE workspace_id = :wid
    """
    params = {"wid": str(workspace_id), "qvec": vec_literal, "k": pool_k}
    if collection_id:
        sql += " AND collection_id = :cid"
        params["cid"] = collection_id
    sql += " ORDER BY embedding <=> CAST(:qvec AS vector) LIMIT :k"

    q_tier = apply_serving_tier(q_full, truncate_dims, quant)
    scored: list[dict] = []
    with db_session(workspace_id) as session:
        rows = session.execute(text(sql), params).mappings().all()
        for r in rows:
            doc_full = _parse_embedding(r["embedding"])
            doc_tier = apply_serving_tier(doc_full, truncate_dims, quant)
            scored.append(
                {
                    "id": r["chunk_id"],
                    "score": _cosine(q_tier, doc_tier),
                    "fullScore": float(r["full_score"]),
                    "payload": r["payload"] or {"text": r["text"]},
                }
            )

    scored.sort(key=lambda h: h["score"], reverse=True)
    hits = [
        {"id": h["id"], "score": h["score"], "payload": h["payload"], "fullScore": h["fullScore"]}
        for h in scored[:k]
    ]
    label = f"edge-d{truncate_dims or 'full'}" + ("-int8" if quant == "int8" else "")
    return {
        "query": query,
        "hits": hits,
        "modelVersion": embed_out["modelVersion"],
        "backend": "pgvector+tier_rerank",
        "tier": {"truncateDims": truncate_dims, "quant": quant, "label": label},
    }
