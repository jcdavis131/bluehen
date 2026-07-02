"""Workspace provisioning and budget tracking."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.auth import generate_api_key, hash_api_key
from app.config import DEFAULT_COST_CEILING
from app.database import db_session
from app.models import LedgerEntry, TraceSpan, Workspace


def create_workspace(name: str, site_id: str | None, cost_ceiling: float | None = None) -> dict:
    raw_key = generate_api_key()
    with db_session() as session:
        existing = None
        if site_id:
            existing = session.scalar(select(Workspace).where(Workspace.site_id == site_id))
        if existing:
            return {
                "workspaceId": str(existing.id),
                "siteId": existing.site_id,
                "name": existing.name,
                "existing": True,
                "apiKey": None,
                "message": "Workspace already exists; API key not re-revealed.",
            }
        ws = Workspace(
            name=name,
            site_id=site_id,
            api_key_hash=hash_api_key(raw_key),
            cost_ceiling_usd=cost_ceiling or DEFAULT_COST_CEILING,
        )
        session.add(ws)
        session.flush()
        return {
            "workspaceId": str(ws.id),
            "siteId": site_id,
            "name": name,
            "apiKey": raw_key,
            "costCeilingUsd": ws.cost_ceiling_usd,
        }


def get_budget(workspace_id: uuid.UUID) -> dict:
    with db_session(workspace_id) as session:
        ws = session.get(Workspace, workspace_id)
        if ws is None:
            raise ValueError("workspace not found")
        remaining = ws.cost_ceiling_usd - ws.spent_usd_today
        return {
            "ceilingUsd": ws.cost_ceiling_usd,
            "spentUsd": ws.spent_usd_today,
            "remainingUsd": max(0.0, remaining),
        }


def record_ledger(workspace_id: uuid.UUID, entry: dict, trace: dict) -> dict:
    cost = float(entry.get("costUsd", 0))
    with db_session(workspace_id) as session:
        rec = LedgerEntry(
            workspace_id=workspace_id,
            stage=str(entry.get("stage", "unknown")),
            site_id=entry.get("siteId"),
            notes=entry.get("notes"),
            model_version=entry.get("modelVersion"),
            metric_delta=entry.get("metricDelta"),
            hyperparameters=entry.get("hyperparameters"),
            cost_usd=cost,
            trace_id=trace.get("traceId"),
        )
        session.add(rec)
        session.flush()
        out = {"id": rec.id, "stage": rec.stage, "ts": rec.created_at.isoformat()}

    # Budget burn uses admin session — tenant role has SELECT-only on corporate_workspaces.
    if cost > 0:
        with db_session() as session:
            ws = session.get(Workspace, workspace_id)
            if ws:
                ws.spent_usd_today += cost

    return out


def record_span(workspace_id: uuid.UUID | None, span: dict) -> None:
    ctx = span.get("ctx") or {}
    with db_session(workspace_id) as session:
        session.add(
            TraceSpan(
                workspace_id=workspace_id,
                trace_id=ctx.get("traceId"),
                span_id=ctx.get("spanId"),
                parent_span=ctx.get("parentSpan"),
                actor=ctx.get("actor", "unknown"),
                target=span.get("target", ""),
                action=span.get("action", ""),
                status=span.get("status", "ok"),
                duration_ms=int(span.get("durationMs", 0)),
                detail=span.get("detail"),
            )
        )


def list_ledger(workspace_id: uuid.UUID, limit: int = 50) -> dict:
    with db_session(workspace_id) as session:
        rows = session.scalars(
            select(LedgerEntry)
            .where(LedgerEntry.workspace_id == workspace_id)
            .order_by(LedgerEntry.created_at.desc())
            .limit(limit)
        ).all()
        return {
            "entries": [
                {
                    "stage": r.stage,
                    "siteId": r.site_id,
                    "notes": r.notes,
                    "modelVersion": r.model_version,
                    "metricDelta": r.metric_delta,
                    "costUsd": r.cost_usd,
                    "ts": r.created_at.isoformat(),
                }
                for r in rows
            ]
        }


def get_workspace_by_site_id(site_id: str):
    """Detached-safe lookup: attributes are read inside the session (an ORM
    instance returned past the session raises DetachedInstanceError once
    expire_on_commit expires it)."""
    from types import SimpleNamespace

    with db_session() as session:
        ws = session.scalar(select(Workspace).where(Workspace.site_id == site_id))
        if ws is None:
            return None
        return SimpleNamespace(id=ws.id, site_id=ws.site_id, name=ws.name)


def site_id_for_workspace(workspace_id: uuid.UUID) -> str | None:
    with db_session(workspace_id) as session:
        ws = session.get(Workspace, workspace_id)
        return ws.site_id if ws else None


def get_trace(workspace_id: uuid.UUID, trace_id: str) -> dict:
    """Trace spans for one trace, scoped to the caller's workspace (RLS)."""
    with db_session(workspace_id) as session:
        spans = session.scalars(
            select(TraceSpan).where(
                TraceSpan.trace_id == trace_id,
                TraceSpan.workspace_id == workspace_id,
            )
        ).all()
        return {
            "traceId": trace_id,
            "spanCount": len(spans),
            "spans": [
                {
                    "ctx": {
                        "traceId": s.trace_id,
                        "spanId": s.span_id,
                        "parentSpan": s.parent_span,
                        "actor": s.actor,
                    },
                    "target": s.target,
                    "action": s.action,
                    "status": s.status,
                    "durationMs": s.duration_ms,
                    "detail": s.detail,
                }
                for s in spans
            ],
        }
