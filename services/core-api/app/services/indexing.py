"""Index collection chunks into pgvector on deploy."""

from __future__ import annotations

import json
import uuid

from sqlalchemy import select, text

from app.database import db_session
from app.models import Collection, ModelVersion, TrainingJob
from app.services.models_svc import embed_texts


def index_collection_for_model(
    workspace_id: uuid.UUID,
    model_version: str,
    collection_id: uuid.UUID | None = None,
) -> dict:
    with db_session(workspace_id) as session:
        mv = session.scalar(
            select(ModelVersion).where(
                ModelVersion.workspace_id == workspace_id,
                ModelVersion.version == model_version,
            )
        )
        if mv is None:
            raise ValueError("model version not found")

        if collection_id is None:
            job = session.scalar(
                select(TrainingJob)
                .where(
                    TrainingJob.workspace_id == workspace_id,
                    TrainingJob.model_version == model_version,
                )
                .order_by(TrainingJob.created_at.desc())
            )
            collection_id = job.collection_id if job else None

        if collection_id is None:
            return {"indexed": 0, "reason": "no collection linked"}

        col = session.scalar(
            select(Collection).where(Collection.id == collection_id, Collection.workspace_id == workspace_id)
        )
        if col is None:
            raise ValueError("collection not found")

        chunks = (col.meta or {}).get("chunks") or []
        session.execute(
            text(
                "DELETE FROM document_chunks WHERE workspace_id = :wid AND collection_id = :cid AND model_version = :mv"
            ),
            {"wid": str(workspace_id), "cid": str(collection_id), "mv": model_version},
        )

    indexed = 0
    for chunk in chunks:
        vec = embed_texts(workspace_id, [chunk["text"]], truncate=False)["vectors"][0]
        payload = {k: v for k, v in chunk.items() if k != "text"}
        with db_session(workspace_id) as session:
            session.execute(
                text(
                    """
                    INSERT INTO document_chunks
                      (workspace_id, collection_id, chunk_id, text, model_version, embedding, payload)
                    VALUES
                      (:wid, :cid, :chunk_id, :text, :mv, :emb, CAST(:payload AS jsonb))
                    ON CONFLICT (workspace_id, collection_id, chunk_id, model_version)
                    DO UPDATE SET embedding = EXCLUDED.embedding, text = EXCLUDED.text, payload = EXCLUDED.payload
                    """
                ),
                {
                    "wid": str(workspace_id),
                    "cid": str(collection_id),
                    "chunk_id": chunk["id"],
                    "text": chunk["text"],
                    "mv": model_version,
                    "emb": str(vec),
                    "payload": json.dumps(payload),
                },
            )
        indexed += 1

    return {"indexed": indexed, "collectionId": str(collection_id), "modelVersion": model_version}
