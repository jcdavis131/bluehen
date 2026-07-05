"""Self-serve signup (Spec 0034 §2): workspace + API key issued
instantly on the Free tier — the zero-involvement front door. Abuse
rails: per-IP daily cap here; metering/budget ceilings downstream."""

from __future__ import annotations

import re
import time
import uuid

FREE_COST_CEILING_USD = 0.50   # per-day training/compute ceiling
_SIGNUPS_BY_IP: dict[str, list[float]] = {}
MAX_PER_IP_PER_DAY = 3


def _ip_allowed(ip: str) -> bool:
    now = time.time()
    window = [t for t in _SIGNUPS_BY_IP.get(ip, []) if now - t < 86_400]
    _SIGNUPS_BY_IP[ip] = window
    if len(window) >= MAX_PER_IP_PER_DAY:
        return False
    window.append(now)
    if len(_SIGNUPS_BY_IP) > 10_000:
        _SIGNUPS_BY_IP.clear()
    return True


def create_free_workspace(name: str | None, email: str | None, ip: str) -> dict:
    if not _ip_allowed(ip):
        raise PermissionError("signup limit reached for today — try tomorrow")
    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise ValueError("that email doesn't look valid")
    label = (re.sub(r"[^\w\s-]", "", name or "").strip() or "self-serve")[:48]

    from app.services import governance

    ws = governance.create_workspace(
        f"{label} (free tier)", None, FREE_COST_CEILING_USD)
    out = {
        "workspaceId": ws["workspaceId"],
        "apiKey": ws["apiKey"],
        "tier": "free",
        "limits": {
            "meteredCallsPerMonth": 1_000,
            "corpora": 1,
            "corpusDocs": 50,
            "trainingBudgetUsdPerDay": FREE_COST_CEILING_USD,
        },
        "docs": "https://bhenre.com/developers",
        "upgrade": "paid tiers activate when payments go live — usage is metered now, honestly",
    }
    if email:
        try:
            from app.database import db_session
            from app.models import Lead

            with db_session(uuid.UUID(ws["workspaceId"])) as session:
                session.add(Lead(
                    workspace_id=uuid.UUID(ws["workspaceId"]),
                    email=email, source="signup", interest="free-tier",
                    message=f"self-serve signup ws={ws['workspaceId']}"))
        except Exception:
            pass  # key issuance never fails on lead recording
    return out
