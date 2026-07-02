"""API key hashing and FastAPI dependency for tenant resolution."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select

from app.config import API_SECRET_KEY
from app.database import db_session
from app.models import Workspace


def hash_api_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_api_key() -> str:
    return f"synth_{secrets.token_urlsafe(32)}"


@dataclass
class TenantCtx:
    workspace_id: UUID
    site_id: str | None
    actor: str


def _admin_ok(authorization: str | None) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        return False
    token = authorization.removeprefix("Bearer ").strip()
    return hmac.compare_digest(token, API_SECRET_KEY)


async def require_admin(authorization: Annotated[str | None, Header()] = None) -> None:
    if not _admin_ok(authorization):
        raise HTTPException(status_code=401, detail="Admin API key required")


async def require_tenant(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
) -> TenantCtx:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing workspace API key")
    raw = authorization.removeprefix("Bearer ").strip()
    if _admin_ok(authorization):
        wid = request.headers.get("x-synth-workspace-id")
        if not wid:
            raise HTTPException(status_code=400, detail="Admin calls need x-synth-workspace-id")
        return TenantCtx(workspace_id=UUID(wid), site_id=None, actor=request.headers.get("x-synth-actor", "admin"))

    key_hash = hash_api_key(raw)
    with db_session() as session:
        ws = session.scalar(select(Workspace).where(Workspace.api_key_hash == key_hash))
        if ws is None:
            raise HTTPException(status_code=401, detail="Invalid API key")
        return TenantCtx(
            workspace_id=ws.id,
            site_id=ws.site_id,
            actor=request.headers.get("x-synth-actor", "unknown"),
        )


def trace_from_request(request: Request) -> dict:
    h = request.headers
    return {
        "traceId": h.get("x-synth-trace-id"),
        "spanId": h.get("x-synth-span-id"),
        "parentSpan": h.get("x-synth-parent-span"),
        "actor": h.get("x-synth-actor", "unknown"),
    }
