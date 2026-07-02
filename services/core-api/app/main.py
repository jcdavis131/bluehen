"""FastAPI application — production Postgres backend with tenant auth."""

from __future__ import annotations

import time
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field

from app.auth import TenantCtx, require_admin, require_tenant, trace_from_request
from app.config import ARTIFACTS_DIR, CORPORA_DIR, USE_MEMORY
from app.database import ensure_schema
from app.errors import http_exception_handler, validation_exception_handler
from app.services import admin, data, governance, jobs, models_svc, omni
from app.services.lifecycle import hill_climb
from app.services.search import search_chunks

app = FastAPI(title="SynthaEmbed Core API", version="0.3.0")
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


@app.on_event("startup")
def on_startup() -> None:
    """Ensure schema exists; run `pnpm db:migrate` for RLS policies."""
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    CORPORA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        ensure_schema()
    except Exception:
        pass  # Postgres may be offline during import-only contexts


@app.get("/healthz")
def healthz():
    return {"status": "ok", "ts": time.time(), "storage": "memory" if USE_MEMORY else "postgres"}


@app.get("/readyz")
def readyz():
    """Readiness per spec 0004: Postgres ping; 503 if the DB is down."""
    from app.database import db_ping

    if USE_MEMORY or db_ping():
        return {"status": "ready", "storage": "memory" if USE_MEMORY else "postgres"}
    raise HTTPException(status_code=503, detail="database unreachable")


class SpanIn(BaseModel):
    ctx: dict
    target: str
    action: str
    status: str
    durationMs: int
    detail: Any | None = None


class WorkspaceIn(BaseModel):
    name: str
    siteId: str | None = None
    costCeilingUsd: float | None = None


@app.post("/v1/workspaces", status_code=201)
def post_workspace(body: WorkspaceIn, _: Annotated[None, Depends(require_admin)]):
    return governance.create_workspace(body.name, body.siteId, body.costCeilingUsd)


@app.post("/v1/trace", status_code=204)
def post_trace(span: SpanIn, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    governance.record_span(tenant.workspace_id, span.model_dump())
    return


@app.get("/v1/trace/{trace_id}")
def get_trace(trace_id: str, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    return governance.get_trace(tenant.workspace_id, trace_id)


@app.get("/v1/budget")
def get_budget(tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    return governance.get_budget(tenant.workspace_id)


@app.post("/v1/ledger", status_code=201)
def post_ledger(entry: dict, request: Request, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    return governance.record_ledger(tenant.workspace_id, entry, trace_from_request(request))


@app.get("/v1/ledger")
def get_ledger(limit: int = 50, tenant: Annotated[TenantCtx, Depends(require_tenant)] = None):
    return governance.list_ledger(tenant.workspace_id, limit)


@app.post("/v1/data/ingest")
def data_ingest(body: dict, request: Request, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    try:
        out = data.ingest(tenant.workspace_id, body["corpusUri"], tenant.site_id)
        return {**out, **trace_from_request(request)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.post("/v1/data/chunk")
def data_chunk(body: dict, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    doc_id = body.get("docId") or body.get("collectionId")
    try:
        return data.chunk_collection(tenant.workspace_id, doc_id, float(body.get("simThreshold", 0.7)))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.post("/v1/data/pairs")
def data_pairs(body: dict, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    try:
        return data.synth_pairs(tenant.workspace_id, body["collectionId"], int(body.get("n", 1000)))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


class TrainLaunchIn(BaseModel):
    recipe: dict = Field(default_factory=dict)
    collectionId: str | None = None


@app.post("/v1/train/launch")
def train_launch(body: TrainLaunchIn, request: Request, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    trace = trace_from_request(request)
    try:
        return jobs.launch_train(tenant.workspace_id, body.recipe, body.collectionId, trace.get("traceId"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/v1/train/{job_id}")
def train_status(job_id: str, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    try:
        return jobs.job_status(tenant.workspace_id, job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.post("/v1/eval/run")
def eval_run(body: dict, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    from app.services.eval import run_eval_for_workspace

    try:
        return run_eval_for_workspace(tenant.workspace_id, body.get("modelVersion"), body.get("slice", "rotating"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/v1/eval/{model_version}/gates")
def eval_gates(model_version: str, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    from app.services.eval import gates_for_model

    return gates_for_model(tenant.workspace_id, model_version)


@app.post("/v1/model/deploy")
def model_deploy(body: dict, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    try:
        return models_svc.deploy_model(
            tenant.workspace_id,
            body["modelVersion"],
            body.get("truncateDims"),
            body.get("quant", "int8"),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.get("/v1/models")
def models_list(tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    return models_svc.list_models(tenant.workspace_id)


class DiagnoseIn(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=64)
    consent: bool = False


@app.post("/v1/diagnose")
def diagnose(body: DiagnoseIn, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    """Embedding health check (Spec 0015): measured diagnostics on a
    user-submitted sample; consented submissions feed the datalab inbox."""
    from app.services.diagnose import diagnose_corpus

    try:
        return diagnose_corpus(
            tenant.workspace_id, body.texts, consent=body.consent, site_id=tenant.site_id
        )
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


EMBED_MAX_INPUTS = 64
EMBED_MAX_CHARS = 2000


@app.post("/v1/embed")
def embed(body: dict, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    try:
        inputs = body.get("inputs", [])
        if not isinstance(inputs, list) or len(inputs) > EMBED_MAX_INPUTS:
            raise HTTPException(
                status_code=400,
                detail=f"inputs must be a list of at most {EMBED_MAX_INPUTS} texts",
            )
        body["inputs"] = [str(t)[:EMBED_MAX_CHARS] for t in inputs]
        truncate = body.get("truncate")
        if truncate is not None and not isinstance(truncate, bool):
            truncate = bool(truncate)
        td = body.get("truncateDims")
        return models_svc.embed_texts(
            tenant.workspace_id,
            body.get("inputs", []),
            truncate=truncate,
            truncate_dims=int(td) if td is not None else None,
            quant=body.get("quant"),
        )
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/v1/admin/fleet")
def admin_fleet(_: Annotated[None, Depends(require_admin)]):
    return admin.fleet_status()


@app.get("/v1/bd/queue")
def bd_queue(tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    from app.services import handoffs

    queue = handoffs.load_bd_queue()
    bd_console = tenant.site_id == "validation"
    return {
        "candidates": handoffs.list_queue_candidates(tenant.site_id, bd_console=bd_console),
        "siteId": tenant.site_id,
        "updated": queue.get("updated"),
    }


@app.get("/v1/admin/bd/queue")
def admin_bd_queue(_: Annotated[None, Depends(require_admin)]):
    from app.services import handoffs

    return handoffs.load_bd_queue()


class BdScorecardIn(BaseModel):
    siteId: str
    candidateId: str
    passed: bool
    exams: list[dict] = Field(default_factory=list)
    notes: str | None = None
    recordedBy: str = "operator"


@app.post("/v1/admin/bd/scorecard", status_code=201)
def admin_bd_scorecard(body: BdScorecardIn, _: Annotated[None, Depends(require_admin)]):
    from app.services import handoffs

    return handoffs.record_scorecard(
        site_id=body.siteId,
        candidate_id=body.candidateId,
        passed=body.passed,
        exams=body.exams,
        notes=body.notes,
        recorded_by=body.recordedBy,
    )


class BdCharterIn(BaseModel):
    siteId: str
    modelVersion: str
    recipe: dict = Field(default_factory=dict)
    candidateId: str | None = None
    scorecardRef: str | None = None
    rollbackCriteria: str | None = None
    issuedBy: str = "operator"


def _record_charter_ledger(site_id: str, model_version: str) -> None:
    ws = governance.get_workspace_by_site_id(site_id)
    if ws is None:
        return
    governance.record_ledger(
        ws.id,
        {
            "stage": "charter",
            "siteId": site_id,
            "modelVersion": model_version,
            "notes": "BD execution charter issued",
        },
        {},
    )


@app.post("/v1/admin/bd/charter", status_code=201)
def admin_bd_charter(body: BdCharterIn, _: Annotated[None, Depends(require_admin)]):
    from app.services import handoffs

    out = handoffs.issue_charter(
        site_id=body.siteId,
        model_version=body.modelVersion,
        recipe=body.recipe,
        issued_by=body.issuedBy,
        scorecard_ref=body.scorecardRef,
        rollback_criteria=body.rollbackCriteria,
        candidate_id=body.candidateId,
    )
    _record_charter_ledger(body.siteId, body.modelVersion)
    return out


class AdminHillClimbIn(BaseModel):
    siteId: str
    corpusUri: str = "corpus.jsonl"


@app.post("/v1/admin/hill-climb")
def admin_hill_climb(body: AdminHillClimbIn, request: Request, _: Annotated[None, Depends(require_admin)]):
    ws = governance.get_workspace_by_site_id(body.siteId)
    if ws is None:
        raise HTTPException(status_code=404, detail=f"no workspace for siteId={body.siteId}")
    trace = trace_from_request(request)
    try:
        return hill_climb(ws.id, ws.site_id, body.corpusUri, trace)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/v1/admin/deploy")
def admin_deploy(body: dict, _: Annotated[None, Depends(require_admin)]):
    """Deploy after charter issued — operator promotion path."""
    ws = governance.get_workspace_by_site_id(body["siteId"])
    if ws is None:
        raise HTTPException(status_code=404, detail="workspace not found")
    try:
        out = models_svc.deploy_model(
            ws.id,
            body["modelVersion"],
            body.get("truncateDims"),
            body.get("quant", "int8"),
            site_id=ws.site_id,
        )
        governance.record_ledger(
            ws.id,
            {"stage": "deploy", "siteId": ws.site_id, "modelVersion": body["modelVersion"], "notes": "operator promotion"},
            {},
        )
        index_info = out.get("index") or {}
        governance.record_ledger(
            ws.id,
            {
                "stage": "index",
                "siteId": ws.site_id,
                "modelVersion": body["modelVersion"],
                "notes": f"indexed {index_info.get('chunks', 0)} chunks",
            },
            {},
        )
        return out
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/v1/search")
def search(body: dict, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    try:
        td = body.get("truncateDims")
        return search_chunks(
            tenant.workspace_id,
            body.get("query", ""),
            k=int(body.get("k", 10)),
            collection_id=body.get("collectionId"),
            truncate_dims=int(td) if td is not None else None,
            quant=body.get("quant"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.post("/v1/research/hill-climb")
def research_hill_climb(body: dict, request: Request, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    trace = trace_from_request(request)
    try:
        return hill_climb(tenant.workspace_id, tenant.site_id, body.get("corpusUri", "corpus.jsonl"), trace)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


# Telemetry endpoints are ADMIN-ONLY: the filesystem run/dataset stores are
# platform-wide (not tenant-namespaced), so a workspace key must not be able
# to enumerate them (knowledge/reviews/security.md SEC-001/002). Tenant-scoped
# stores need a spec before these can open up to workspace keys.
@app.get("/v1/runs")
def runs_list(project: str | None = None, limit: int = 100, _: Annotated[None, Depends(require_admin)] = None):
    from app.services import telemetry

    return telemetry.list_runs(project=project, limit=min(limit, 500))


@app.get("/v1/runs/{run_id}")
def runs_get(run_id: str, _: Annotated[None, Depends(require_admin)] = None):
    from app.services import telemetry

    try:
        manifest = telemetry.get_run(run_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if manifest is None:
        raise HTTPException(status_code=404, detail=f"run not found: {run_id}")
    return manifest


@app.get("/v1/runs/{run_id}/metrics")
def runs_metrics(run_id: str, after: int = 0, limit: int = 5000, _: Annotated[None, Depends(require_admin)] = None):
    from app.services import telemetry

    try:
        out = telemetry.get_metrics(run_id, after=max(after, 0), limit=min(limit, 20000))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if out is None:
        raise HTTPException(status_code=404, detail=f"run not found: {run_id}")
    return out


@app.get("/v1/runs/{run_id}/events")
def runs_events(run_id: str, after: int = 0, _: Annotated[None, Depends(require_admin)] = None):
    from app.services import telemetry

    try:
        out = telemetry.get_events(run_id, after=max(after, 0))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if out is None:
        raise HTTPException(status_code=404, detail=f"run not found: {run_id}")
    return out


@app.get("/v1/datalab/datasets")
def datalab_datasets(_: Annotated[None, Depends(require_admin)] = None):
    from app.services import telemetry

    return telemetry.list_datasets()


class OmniSimulateIn(BaseModel):
    platformId: str
    strategyId: str = "baseline-momentum"
    corpusId: str = "omni-fixtures"
    skillPath: str | None = None
    liveCapital: bool = False


@app.get("/v1/omni/platforms")
def omni_platforms(tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    return omni.platforms()


@app.post("/v1/omni/simulate")
def omni_simulate(body: OmniSimulateIn, request: Request, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    if body.liveCapital:
        raise HTTPException(status_code=403, detail="live capital execution blocked (Spec 0013 simulation only)")
    try:
        report = omni.simulate(
            body.platformId,
            strategy_id=body.strategyId,
            corpus_id=body.corpusId,
            skill_path=body.skillPath,
            live_capital=body.liveCapital,
        )
    except (ValueError, PermissionError) as e:
        msg = str(e)
        code = 403 if "live capital" in msg.lower() or "blocked" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg) from e
    trace = trace_from_request(request)
    governance.record_ledger(
        tenant.workspace_id,
        {
            "stage": "omni_sim",
            "siteId": tenant.site_id,
            "platformId": body.platformId,
            "strategyId": body.strategyId,
            "sharpe": report.get("sharpe"),
            "mode": report.get("mode"),
            "notes": "omni-market paper simulation",
        },
        trace,
    )
    return {**report, **trace}
