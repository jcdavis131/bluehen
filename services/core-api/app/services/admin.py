"""Operator/admin views across the fleet."""

from __future__ import annotations

from sqlalchemy import select, text

from app.database import db_session
from app.models import ModelVersion, TrainingJob, Workspace


def fleet_status() -> dict:
    with db_session() as session:
        workspaces = session.scalars(select(Workspace).order_by(Workspace.site_id)).all()
        orgs = []
        for ws in workspaces:
            if not ws.site_id:
                continue
            latest_job = session.scalar(
                select(TrainingJob)
                .where(TrainingJob.workspace_id == ws.id)
                .order_by(TrainingJob.created_at.desc())
            )
            deployed = session.scalar(
                select(ModelVersion)
                .where(ModelVersion.workspace_id == ws.id, ModelVersion.deployed.is_(True))
                .order_by(ModelVersion.created_at.desc())
            )
            latest_model = session.scalar(
                select(ModelVersion)
                .where(ModelVersion.workspace_id == ws.id)
                .order_by(ModelVersion.created_at.desc())
            )
            chunk_count = session.execute(
                text("SELECT count(*) FROM document_chunks WHERE workspace_id = :wid"),
                {"wid": str(ws.id)},
            ).scalar_one()

            gates = (latest_model.meta or {}).get("gates") if latest_model else None
            orgs.append(
                {
                    "siteId": ws.site_id,
                    "workspaceId": str(ws.id),
                    "name": ws.name,
                    "latestJob": {
                        "status": latest_job.status if latest_job else None,
                        "modelVersion": latest_job.model_version if latest_job else None,
                        "effectiveRank": latest_job.effective_rank if latest_job else None,
                    },
                    "latestModel": {
                        "version": latest_model.version if latest_model else None,
                        "effectiveRank": latest_model.effective_rank if latest_model else None,
                        "ndcg10": latest_model.ndcg10 if latest_model else None,
                        "gates": gates,
                    },
                    "deployedModel": deployed.version if deployed else None,
                    "indexedChunks": int(chunk_count or 0),
                    "budgetRemaining": ws.cost_ceiling_usd - ws.spent_usd_today,
                }
            )
        return {"orgs": orgs, "count": len(orgs)}
