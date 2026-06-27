"""SynthaEmbed core-api — the single uniform access chokepoint.

Every agent, the `synth` CLI, CI, and the dashboard reach ALL services and databases through
these routes, carrying the x-synth-* trace headers. This file is a runnable in-memory
skeleton: route shapes, trace capture, ledger, and budget are real; data/train/eval/model
calls return stubs and are where the Neon + Modal integrations get wired (see specs/0004,
0005, 0006). Swap the in-memory stores for Neon + RLS per specs/0002.
"""

from __future__ import annotations

import time
from typing import Any
from fastapi import FastAPI, Header, Request
from pydantic import BaseModel

app = FastAPI(title="SynthaEmbed Core API", version="0.1.0")

# --- in-memory stores (replace with Neon + RLS) --------------------------------
TRACE: list[dict] = []
LEDGER: list[dict] = []
BUDGET = {"spentUsd": 0.0, "ceilingUsd": 50.0}


def trace_ctx(request: Request) -> dict:
    h = request.headers
    return {
        "traceId": h.get("x-synth-trace-id"),
        "spanId": h.get("x-synth-span-id"),
        "parentSpan": h.get("x-synth-parent-span"),
        "actor": h.get("x-synth-actor", "unknown"),
    }


@app.get("/healthz")
def healthz():
    return {"status": "ok", "ts": time.time()}


# --- uniform tracing -----------------------------------------------------------
class SpanIn(BaseModel):
    ctx: dict
    target: str
    action: str
    status: str
    durationMs: int
    detail: Any | None = None


@app.post("/v1/trace", status_code=204)
def post_trace(span: SpanIn):
    TRACE.append(span.model_dump())
    return


@app.get("/v1/trace/{trace_id}")
def get_trace(trace_id: str):
    spans = [s for s in TRACE if s.get("ctx", {}).get("traceId") == trace_id]
    return {"traceId": trace_id, "spanCount": len(spans), "spans": spans}


# --- governance ----------------------------------------------------------------
@app.get("/v1/budget")
def get_budget():
    return {**BUDGET, "remainingUsd": BUDGET["ceilingUsd"] - BUDGET["spentUsd"]}


@app.post("/v1/ledger", status_code=201)
def post_ledger(entry: dict, request: Request):
    rec = {**entry, **trace_ctx(request), "ts": time.time()}
    LEDGER.append(rec)
    return rec


@app.get("/v1/ledger")
def get_ledger(limit: int = 50):
    return {"entries": list(reversed(LEDGER[-limit:]))}


# --- lifecycle stages (stubs -> wire Neon + Modal) -----------------------------
@app.post("/v1/data/ingest")
def data_ingest(body: dict, request: Request):
    return {"collectionId": "col_demo", "ingested": True, **trace_ctx(request)}

@app.post("/v1/data/chunk")
def data_chunk(body: dict):
    return {"docId": body.get("docId"), "chunks": 0, "method": "lmar"}

@app.post("/v1/data/pairs")
def data_pairs(body: dict):
    return {"collectionId": body.get("collectionId"), "pairs": body.get("n", 0)}

@app.post("/v1/train/launch")
def train_launch(body: dict, request: Request):
    # TODO: invoke services/trainer Modal function via Vercel Connect, forwarding trace ctx.
    return {"jobId": "job_demo", "queued": True, **trace_ctx(request)}

@app.get("/v1/train/{job_id}")
def train_status(job_id: str):
    return {"jobId": job_id, "status": "running", "effectiveRank": None}

@app.post("/v1/eval/run")
def eval_run(body: dict):
    return {"modelVersion": body.get("modelVersion"), "metrics": {"ndcg@10": None, "effectiveRank": None}}

@app.get("/v1/eval/{model_version}/gates")
def eval_gates(model_version: str):
    return {"modelVersion": model_version, "allPassed": False,
            "gates": {"rankAboveBaseline": None, "ndcgNonRegression": None, "mrlWithinTolerance": None}}

@app.post("/v1/model/deploy")
def model_deploy(body: dict):
    return {"modelVersion": body.get("modelVersion"), "deployed": True,
            "truncateDims": body.get("truncateDims"), "quant": body.get("quant")}

@app.get("/v1/models")
def models_list():
    return {"models": []}

@app.post("/v1/embed")
def embed(body: dict):
    inputs = body.get("inputs", [])
    return {"vectors": [[0.0] for _ in inputs], "modelVersion": "demo"}

@app.post("/v1/search")
def search(body: dict):
    return {"query": body.get("query"), "hits": []}
