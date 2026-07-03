"""Usage metering (Spec 0021 P1 — the Stripe-independent half).

Every billable call records an event; rollups serve the tenant usage view
and the future Stripe reconciliation webhook. Recording is best-effort:
metering must never fail a customer request.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.database import db_session
from app.models import UsageEvent

log = logging.getLogger("synthaembed.usage")

BILLABLE_KINDS = ("search", "embed", "diagnose")


def record(workspace_id: uuid.UUID, kind: str, units: int = 1) -> None:
    """Best-effort event append — swallows errors by design (metering must
    never take down serving; missed events under-bill, never over-bill)."""
    try:
        with db_session() as session:
            session.add(UsageEvent(
                workspace_id=workspace_id, kind=kind, units=max(1, int(units)),
                ts=datetime.now(timezone.utc),
            ))
    except Exception as exc:
        log.warning("usage record failed (request unaffected): %s", exc)


def month_window() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def workspace_usage(workspace_id: uuid.UUID) -> dict:
    since = month_window()
    with db_session(workspace_id) as session:
        rows = session.execute(
            select(UsageEvent.kind, func.sum(UsageEvent.units))
            .where(UsageEvent.workspace_id == workspace_id, UsageEvent.ts >= since)
            .group_by(UsageEvent.kind)
        ).all()
    return {
        "since": since.isoformat(),
        "byKind": {k: int(v) for k, v in rows},
        "total": int(sum(v for _, v in rows)),
        "billing": "metering active; Stripe reconciliation pending (Spec 0021 gate)",
    }


def admin_rollup(days: int = 31) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    with db_session() as session:
        rows = session.execute(
            select(UsageEvent.workspace_id, UsageEvent.kind, func.sum(UsageEvent.units))
            .where(UsageEvent.ts >= since)
            .group_by(UsageEvent.workspace_id, UsageEvent.kind)
        ).all()
    out: dict[str, dict] = {}
    for ws, kind, units in rows:
        out.setdefault(str(ws), {})[kind] = int(units)
    return {"sinceDays": days, "workspaces": out}
