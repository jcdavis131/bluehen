"""Shared claim/requeue machinery (WIRE-204): one implementation of the
stale-requeue + skip-locked claim pattern that jobs/harvest/certify each
carried a near-verbatim copy of."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update

STALE_MINUTES = 30


def claim_next(session, model, *, status_col="status", stale_minutes: int = STALE_MINUTES):
    """Requeue stale 'running' rows, then claim the oldest 'pending' row
    (FOR UPDATE SKIP LOCKED). Returns the ORM row (attrs read inside the
    caller's session) or None. Caller owns the session/transaction."""
    status = getattr(model, status_col)
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)
    session.execute(
        update(model)
        .where(status == "running", model.updated_at < cutoff)
        .values(**{status_col: "pending", "updated_at": datetime.now(timezone.utc)})
    )
    row = session.scalar(
        select(model).where(status == "pending")
        .order_by(model.created_at)
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    if row is not None:
        setattr(row, status_col, "running")
        row.updated_at = datetime.now(timezone.utc)
    return row
