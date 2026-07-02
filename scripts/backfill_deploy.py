#!/usr/bin/env python3
"""Deploy latest trained models and index chunks (direct DB, no running API required)."""

from __future__ import annotations

from sqlalchemy import select

from app.database import db_session
from app.models import ModelVersion, Workspace
from app.services.models_svc import deploy_model


def main() -> None:
    with db_session() as session:
        orgs = [(ws.id, ws.site_id) for ws in session.scalars(select(Workspace).where(Workspace.site_id.is_not(None))).all()]

    for wid, site_id in orgs:
        with db_session(wid) as session:
            mv = session.scalar(
                select(ModelVersion)
                .where(ModelVersion.workspace_id == wid)
                .order_by(ModelVersion.created_at.desc())
            )
            if mv is None:
                print(f"[skip] {site_id}: no model")
                continue
            version = mv.version
            deployed = session.scalar(
                select(ModelVersion).where(ModelVersion.workspace_id == wid, ModelVersion.deployed.is_(True))
            )
            from sqlalchemy import text

            indexed = session.execute(
                text("SELECT count(*) FROM document_chunks WHERE workspace_id = :wid"),
                {"wid": str(wid)},
            ).scalar_one()
            if deployed and deployed.version == version and indexed > 0:
                print(f"[ok] {site_id}: {version} already deployed + indexed={indexed}")
                continue

        out = deploy_model(wid, version, truncate_dims=256, quant="int8")
        indexed = out.get("index", {}).get("indexed", "?")
        print(f"[deploy] {site_id}: {version} indexed={indexed}")


if __name__ == "__main__":
    main()
