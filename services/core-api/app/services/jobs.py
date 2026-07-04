"""Training job queue — persisted in Postgres, processed by services/worker."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update

from app.database import db_session
from app.models import Collection, ModelVersion, TrainingJob


def launch_train(
    workspace_id: uuid.UUID,
    recipe: dict,
    collection_id: str | None,
    trace_id: str | None,
) -> dict:
    with db_session(workspace_id) as session:
        col_uuid = uuid.UUID(collection_id) if collection_id else None
        if col_uuid:
            col = session.scalar(
                select(Collection).where(Collection.id == col_uuid, Collection.workspace_id == workspace_id)
            )
            if col is None:
                raise ValueError("collection not found")
            if col.pair_count < 10:
                raise ValueError("synthesize pairs first (need >= 10)")

        job = TrainingJob(
            workspace_id=workspace_id,
            collection_id=col_uuid,
            recipe=recipe,
            status="pending",
            trace_id=trace_id,
        )
        session.add(job)
        session.flush()
        return {"jobId": str(job.id), "queued": True, "status": "pending"}


def job_status(workspace_id: uuid.UUID, job_id: str) -> dict:
    with db_session(workspace_id) as session:
        job = session.scalar(
            select(TrainingJob).where(TrainingJob.id == uuid.UUID(job_id), TrainingJob.workspace_id == workspace_id)
        )
        if job is None:
            raise ValueError("job not found")
        return {
            "jobId": str(job.id),
            "status": job.status,
            "modelVersion": job.model_version,
            "effectiveRank": job.effective_rank,
            "error": job.error,
        }


STALE_RUNNING_MINUTES = 30


def claim_next_job() -> dict | None:
    """Worker claims one pending job (shared stale-requeue machinery)."""
    from app.services.queueing import claim_next

    with db_session() as session:
        job = claim_next(session, TrainingJob)
        if job is None:
            return None
        return {
            "id": job.id,
            "workspace_id": job.workspace_id,
            "collection_id": job.collection_id,
            "recipe": job.recipe,
            "trace_id": job.trace_id,
        }


def complete_job(
    job_id: uuid.UUID,
    workspace_id: uuid.UUID,
    *,
    model_version: str,
    effective_rank: float,
    checkpoint_path: str,
    cost_usd: float = 0.0,
    artifact_bytes: bytes | None = None,
) -> None:
    with db_session(workspace_id) as session:
        job = session.get(TrainingJob, job_id)
        if job is None:
            return
        job.status = "completed"
        job.model_version = model_version
        job.effective_rank = effective_rank
        job.checkpoint_path = checkpoint_path
        job.cost_usd = cost_usd
        job.updated_at = datetime.now(timezone.utc)
        mv = ModelVersion(
            workspace_id=workspace_id,
            version=model_version,
            checkpoint_path=checkpoint_path,
            effective_rank=effective_rank,
            meta={"jobId": str(job_id)},
            artifact=artifact_bytes,
        )
        session.add(mv)


def fail_job(job_id: uuid.UUID, workspace_id: uuid.UUID, error: str) -> None:
    with db_session(workspace_id) as session:
        job = session.get(TrainingJob, job_id)
        if job is None:
            return
        job.status = "failed"
        job.error = error[:2000]
        job.updated_at = datetime.now(timezone.utc)
