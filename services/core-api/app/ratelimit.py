"""Minimal in-process rate limiting (Spec 0018 §5.2 / REV-903).

Fixed-window per-key counters with a bounded store. Good enough for a
single-instance deployment; swap for Redis when replicas arrive — the
dependency signature stays the same.
"""

from __future__ import annotations

import os
import threading
import time

from fastapi import HTTPException, Request

_LOCK = threading.Lock()
_WINDOWS: dict[str, tuple[int, int]] = {}  # key -> (window_start_minute, count)
_MAX_KEYS = 10_000

# Deployment sits behind exactly one reverse proxy (Railway edge — ADR-002)
# that appends the connecting peer's address to X-Forwarded-For rather than
# replacing it. Trusting the leftmost entry lets any client set its own
# X-Forwarded-For header and mint a fresh identity on every request, which
# defeats both this limiter and the signup abuse cap (`services/signup.py`)
# for free. Walk in from the *right* by the number of trusted hops instead —
# those entries were appended by proxies we control, not the client.
TRUSTED_PROXY_HOPS = max(0, int(os.getenv("TRUSTED_PROXY_HOPS", "1")))


def client_ip(request: Request) -> str:
    """Best-effort caller IP, resistant to a spoofed X-Forwarded-For header.

    With N trusted hops in front of this process, the Nth-from-the-right
    entry in X-Forwarded-For is the address the last trusted proxy actually
    saw — everything to its left is attacker-controlled input the client can
    set arbitrarily. Falls back to the socket peer when the header is
    missing/short or no proxy is trusted (TRUSTED_PROXY_HOPS=0).
    """
    fwd = request.headers.get("x-forwarded-for")
    if fwd and TRUSTED_PROXY_HOPS > 0:
        hops = [h.strip() for h in fwd.split(",") if h.strip()]
        if len(hops) >= TRUSTED_PROXY_HOPS:
            return hops[-TRUSTED_PROXY_HOPS]
    return request.client.host if request.client else "unknown"


# Back-compat alias — keep the previously-private name importable.
_client_ip = client_ip


def rate_limit(bucket: str, per_minute: int):
    """FastAPI dependency: per-IP fixed-window limit for a route bucket."""

    def dep(request: Request) -> None:
        key = f"{bucket}:{_client_ip(request)}"
        minute = int(time.time() // 60)
        with _LOCK:
            if len(_WINDOWS) > _MAX_KEYS:
                _WINDOWS.clear()  # bounded memory beats precision here
            start, count = _WINDOWS.get(key, (minute, 0))
            if start != minute:
                start, count = minute, 0
            count += 1
            _WINDOWS[key] = (start, count)
        if count > per_minute:
            raise HTTPException(
                status_code=429,
                detail=f"rate limit exceeded ({per_minute}/min for {bucket})",
                headers={"Retry-After": "60"},
            )

    return dep
