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


RETENTION_DAYS = 45
_last_rollup_day: str | None = None


def rollup_and_purge(retention_days: int = RETENTION_DAYS) -> dict:
    """Archive raw events older than the retention window into usage_daily,
    deleting them in the same transaction (idempotent: rows either exist raw
    OR are archived — never both, never double-counted)."""
    from sqlalchemy import delete, text

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    with db_session() as session:
        session.execute(text("""
            INSERT INTO usage_daily (workspace_id, kind, day, units)
            SELECT workspace_id, kind, date(ts), sum(units)
            FROM usage_events WHERE ts < :cutoff
            GROUP BY workspace_id, kind, date(ts)
            ON CONFLICT ON CONSTRAINT uq_usage_daily_ws_kind_day
            DO UPDATE SET units = usage_daily.units + EXCLUDED.units
        """), {"cutoff": cutoff})
        purged = session.execute(
            delete(UsageEvent).where(UsageEvent.ts < cutoff)).rowcount
    return {"purgedRaw": int(purged), "cutoff": cutoff.isoformat()}


def daily_tick() -> dict | None:
    """Cheap once-per-day guard for the worker loop (restart-safe: the
    rollup itself is idempotent)."""
    global _last_rollup_day
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _last_rollup_day == today:
        return None
    _last_rollup_day = today
    out = rollup_and_purge()
    log.info("usage retention: %s", out)
    return out
