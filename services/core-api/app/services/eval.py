"""Stage 3 eval — uses eval-harness gates on trained checkpoints."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.database import db_session
from app.models import ModelVersion, TrainingJob
from app.services.artifacts import open_checkpoint
from app.services.models_svc import get_collection_pairs


def run_eval_for_workspace(workspace_id: uuid.UUID, model_version: str | None, slice_name: str) -> dict:
    with db_session(workspace_id) as session:
        if model_version:
            mv = session.scalar(
                select(ModelVersion).where(
                    ModelVersion.workspace_id == workspace_id,
                    ModelVersion.version == model_version,
                )
            )
        else:
            mv = session.scalar(
                select(ModelVersion)
                .where(ModelVersion.workspace_id == workspace_id)
                .order_by(ModelVersion.created_at.desc())
            )
        if mv is None:
            raise ValueError("no model to evaluate")

        job = session.scalar(
            select(TrainingJob).where(
                TrainingJob.workspace_id == workspace_id,
                TrainingJob.model_version == mv.version,
            )
        )
        collection_id = job.collection_id if job else None
        version = mv.version
        checkpoint_path = mv.checkpoint_path

    pairs = get_collection_pairs(workspace_id, collection_id) if collection_id else []
    if len(pairs) < 5:
        pairs = _default_eval_pairs()

    from eval_harness.runner import evaluate_checkpoint

    with open_checkpoint(checkpoint_path) as ckpt:
        metrics = evaluate_checkpoint(ckpt, pairs, eval_slice=slice_name)
    gates = metrics["gates"]

    with db_session(workspace_id) as session:
        row = session.scalar(
            select(ModelVersion).where(
                ModelVersion.workspace_id == workspace_id,
                ModelVersion.version == version,
            )
        )
        if row:
            row.ndcg10 = metrics["ndcg10"]
            row.effective_rank = metrics["effectiveRank"]
            row.meta = {**(row.meta or {}), "gates": gates, "slice": slice_name}

    return {"modelVersion": version, "metrics": metrics, "gates": gates, "allPassed": metrics["allPassed"]}


def gates_for_model(workspace_id: uuid.UUID, model_version: str) -> dict:
    with db_session(workspace_id) as session:
        mv = session.scalar(
            select(ModelVersion).where(
                ModelVersion.workspace_id == workspace_id,
                ModelVersion.version == model_version,
            )
        )
        if mv is None:
            raise ValueError("model version not found")
        gates = (mv.meta or {}).get("gates")
        if gates is None:
            result = run_eval_for_workspace(workspace_id, model_version, "rotating")
            gates = result["gates"]
            all_passed = result["allPassed"]
        else:
            all_passed = all(v is True for v in gates.values())
        return {"modelVersion": model_version, "allPassed": all_passed, "gates": gates}


def _default_eval_pairs() -> list[dict]:
    return [
        {"anchor": "effective rank collapse in contrastive learning", "positive": "encoder outputs concentrate on a low-dimensional cone", "negative": "paper trading with live brokerage orders"},
        {"anchor": "Matryoshka truncation at the edge", "positive": "quantized int8 serving makes org models cheap", "negative": "spectral collapse in contrastive learning"},
        {"anchor": "multi-hop RAG failure modes", "positive": "HyDE-style augmentation recovers nDCG on multi-hop benchmarks", "negative": "Matryoshka truncation at the edge"},
    ]
