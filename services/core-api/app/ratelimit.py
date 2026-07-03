"""Minimal in-process rate limiting (Spec 0018 §5.2 / REV-903).

Fixed-window per-key counters with a bounded store. Good enough for a
single-instance deployment; swap for Redis when replicas arrive — the
dependency signature stays the same.
"""

from __future__ import annotations

import threading
import time

from fastapi import HTTPException, Request

_LOCK = threading.Lock()
_WINDOWS: dict[str, tuple[int, int]] = {}  # key -> (window_start_minute, count)
_MAX_KEYS = 10_000


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


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
