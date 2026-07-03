"""Harvest job execution (Spec 0018): run one datalab source collection
on demand, then sync the catalog. Called from the worker loop."""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select, update

from app.config import REPO_ROOT
from app.database import db_session
from app.models import HarvestJob

log = logging.getLogger("synthaembed.harvest")

STALE_MINUTES = 30


def claim_next_harvest() -> dict | None:
    with db_session() as session:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=STALE_MINUTES)
        session.execute(
            update(HarvestJob)
            .where(HarvestJob.status == "running", HarvestJob.updated_at < cutoff)
            .values(status="pending", updated_at=datetime.now(timezone.utc))
        )
        job = session.scalar(
            select(HarvestJob).where(HarvestJob.status == "pending")
            .order_by(HarvestJob.created_at).with_for_update(skip_locked=True).limit(1)
        )
        if job is None:
            return None
        job.status = "running"
        job.updated_at = datetime.now(timezone.utc)
        return {"id": job.id, "source_id": job.source_id}


def _finish(job_id: uuid.UUID, status: str, error: str | None = None) -> None:
    with db_session() as session:
        job = session.get(HarvestJob, job_id)
        if job is not None:
            job.status = status
            job.error = error
            job.updated_at = datetime.now(timezone.utc)


def run_harvest_job(payload: dict) -> None:
    """Collect one registry source regardless of its interval schedule."""
    from datalab.watch import WatchState, collect_source, load_registry

    job_id, source_id = payload["id"], payload["source_id"]
    try:
        registry = load_registry()
        source = next((s for s in registry if s.id == source_id), None)
        if source is None:
            _finish(job_id, "failed", f"unknown source: {source_id}")
            return
        data_root = os.getenv("DATALAB_DIR", str(REPO_ROOT / "data" / "datalab"))
        state = WatchState(Path(data_root) / "watch_state.json")
        report = collect_source(
            source, state,
            data_root=data_root,
            knowledge_root=os.getenv("OKF_DATASETS_DIR"),
        )
        state.save()
        from app.services.catalog import sync_from_datalab

        synced = sync_from_datalab()
        log.info("harvest %s source=%s report=%s sync=%s", job_id, source_id,
                 report.get("action"), synced.get("synced"))
        _finish(job_id, "completed")
    except Exception as exc:
        log.exception("harvest failed %s", job_id)
        _finish(job_id, "failed", str(exc)[:500])
