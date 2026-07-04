"""Entitlement checks (Spec 0021): the payment-agnostic access layer.

SKU convention: `dataset:<slug>` (full-corpus access, MON-005) and
`notes:signals` (premium research notes, MON-007). Grants come from the
admin endpoint today and checkout webhooks when commerce attaches — the
check itself never knows the difference.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.database import db_session
from app.models import Entitlement


def has(workspace_id: uuid.UUID, sku: str) -> bool:
    with db_session(workspace_id) as session:
        row = session.scalar(
            select(Entitlement).where(
                Entitlement.workspace_id == workspace_id,
                Entitlement.sku == sku,
            ).limit(1)
        )
        if row is None:
            return False
        if row.expires_at is not None and row.expires_at < datetime.now(timezone.utc):
            return False
        return True


def grant(workspace_id: uuid.UUID, sku: str, granted_by: str = "admin",
          expires_at: datetime | None = None) -> dict:
    with db_session() as session:
        session.add(Entitlement(
            workspace_id=workspace_id, sku=sku[:128], granted_by=granted_by,
            expires_at=expires_at,
        ))
    return {"workspaceId": str(workspace_id), "sku": sku, "grantedBy": granted_by}


def list_for(workspace_id: uuid.UUID) -> dict:
    with db_session(workspace_id) as session:
        rows = session.scalars(
            select(Entitlement).where(Entitlement.workspace_id == workspace_id)
        ).all()
        return {"entitlements": [{
            "sku": r.sku, "grantedBy": r.granted_by,
            "expiresAt": r.expires_at.isoformat() if r.expires_at else None,
        } for r in rows]}
