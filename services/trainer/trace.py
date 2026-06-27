"""Python side of the uniform trace layer.

Mirrors packages/synth-core/src/trace.ts so a Modal function attaches to the same trace a
TS agent or the `synth` CLI started. Inbound trace headers arrive with the job payload;
spans are posted back to core-api /v1/trace through the same uniform endpoint.
"""

from __future__ import annotations

import os
import time
import json
import urllib.request
from contextlib import contextmanager
from dataclasses import dataclass

TRACE_HEADERS = {
    "trace": "x-synth-trace-id",
    "span": "x-synth-span-id",
    "parent": "x-synth-parent-span",
    "actor": "x-synth-actor",
}


@dataclass
class TraceContext:
    trace_id: str
    span_id: str
    parent_span: str | None
    actor: str

    @classmethod
    def from_payload(cls, p: dict, actor: str = "trainer") -> "TraceContext":
        return cls(
            trace_id=p.get("traceId", "tr_orphan"),
            span_id=p.get("spanId", "sp_orphan"),
            parent_span=p.get("parentSpan"),
            actor=actor,
        )


def _record(ctx: TraceContext, target: str, action: str, status: str, duration_ms: int, detail=None):
    base = os.environ.get("SYNTH_API_BASE_URL", "http://localhost:8000")
    body = json.dumps({
        "ctx": {"traceId": ctx.trace_id, "spanId": ctx.span_id,
                "parentSpan": ctx.parent_span, "actor": ctx.actor},
        "target": target, "action": action, "status": status,
        "durationMs": duration_ms, "detail": detail,
    }).encode()
    try:
        req = urllib.request.Request(f"{base}/v1/trace", data=body,
                                     headers={"content-type": "application/json"}, method="POST")
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:  # tracing must never break the job
        print(f"[trace] post failed: {e}; span={ctx.trace_id} {target}.{action} {status} {duration_ms}ms")


@contextmanager
def span(ctx: TraceContext, target: str, action: str):
    t0 = time.time()
    try:
        yield
        _record(ctx, target, action, "ok", int((time.time() - t0) * 1000))
    except Exception as e:
        _record(ctx, target, action, "error", int((time.time() - t0) * 1000), str(e))
        raise
