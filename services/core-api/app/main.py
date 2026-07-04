"""FastAPI application — production Postgres backend with tenant auth."""

from __future__ import annotations

import time
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.auth import TenantCtx, require_admin, require_tenant, trace_from_request
from app.ratelimit import rate_limit
from app.config import ARTIFACTS_DIR, CORPORA_DIR, USE_MEMORY
from app.database import db_session, ensure_schema
from app.errors import http_exception_handler, validation_exception_handler
from app.models import Lead
from app.services import admin, data, governance, jobs, models_svc, omni
from app.services.lifecycle import hill_climb
from app.services.search import search_chunks
from sqlalchemy import select

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
    _maybe_start_inproc_worker()


def _maybe_start_inproc_worker() -> None:
    """SYNTH_INPROC_WORKER=1: run the training worker as a daemon thread in
    THIS process. One Python + one torch stack is what fits a 1 GB plan
    container — two full runtimes duplicated ~500 MB and OOM'd on every
    training attempt (see docs/STATUS.md 2026-07-03). Torch kernels release
    the GIL, so serving stays responsive during training."""
    import os

    if os.environ.get("SYNTH_INPROC_WORKER") != "1":
        return
    import importlib.util
    import threading
    from pathlib import Path as _P

    worker_path = os.environ.get(
        "SYNTH_WORKER_MAIN",
        str(_P(__file__).resolve().parents[2] / "worker" / "main.py"),
    )
    spec = importlib.util.spec_from_file_location("synth_worker_main", worker_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    threading.Thread(target=mod.run_forever, name="inproc-worker", daemon=True).start()


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
def diagnose(body: DiagnoseIn, tenant: Annotated[TenantCtx, Depends(require_tenant)],
             _rl: Annotated[None, Depends(rate_limit("diagnose", 12))] = None):
    """Embedding health check (Spec 0015): measured diagnostics on a
    user-submitted sample; consented submissions feed the datalab inbox."""
    from app.services.diagnose import diagnose_corpus

    try:
        out = diagnose_corpus(
            tenant.workspace_id, body.texts, consent=body.consent, site_id=tenant.site_id
        )
        from app.services.usage import record as _record_usage

        _record_usage(tenant.workspace_id, "diagnose", units=len(body.texts))
        return out
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


# ── Data Refinery catalog (Spec 0018) — public reads, consented writes ──

CATALOG_CACHE = "public, s-maxage=60, stale-while-revalidate=300"


@app.get("/v1/catalog/stats")
def catalog_stats(response: Response, _rl: Annotated[None, Depends(rate_limit("catalog", 120))] = None):
    from app.services import catalog

    response.headers["Cache-Control"] = CATALOG_CACHE
    return catalog.stats()


@app.get("/v1/catalog/datasets")
def catalog_list(response: Response, cursor: str | None = None, limit: int = 20,
                 tag: str | None = None, q: str | None = None,
                 _rl: Annotated[None, Depends(rate_limit("catalog", 120))] = None):
    from app.services import catalog

    response.headers["Cache-Control"] = CATALOG_CACHE
    return catalog.list_datasets(cursor, limit, tag, q)


@app.get("/v1/catalog/datasets/{slug}")
def catalog_get(slug: str, response: Response, _rl: Annotated[None, Depends(rate_limit("catalog", 120))] = None):
    from app.services import catalog

    out = catalog.get_dataset(slug)
    if out is None:
        raise HTTPException(status_code=404, detail="dataset not found")
    response.headers["Cache-Control"] = CATALOG_CACHE
    return out


@app.get("/v1/catalog/datasets/{slug}/sample")
def catalog_sample(slug: str, response: Response, _rl: Annotated[None, Depends(rate_limit("sample", 30))] = None):
    from app.services import catalog

    out = catalog.get_sample(slug)
    if out is None:
        raise HTTPException(status_code=404, detail="no sample for this dataset")
    response.headers["Cache-Control"] = CATALOG_CACHE
    return out


class CatalogFulfillIn(BaseModel):
    orderId: str
    datasetSlug: str
    email: str = ""
    paymentStatus: str = "pending-gate"


class CatalogDownloadIn(BaseModel):
    orderId: str


@app.post("/v1/admin/catalog/fulfill", status_code=201)
def catalog_fulfill(body: CatalogFulfillIn, _: Annotated[None, Depends(require_admin)]):
    from app.services import catalog

    try:
        return catalog.grant_entitlement(
            body.orderId, body.datasetSlug, body.email, body.paymentStatus)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/v1/catalog/datasets/{slug}/download")
def catalog_download(slug: str, body: CatalogDownloadIn, request: Request,
                     _rl: Annotated[None, Depends(rate_limit("download", 20))] = None):
    from app.services import catalog

    base = str(request.base_url).rstrip("/")
    try:
        return catalog.issue_download(slug, body.orderId, base)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.get("/v1/catalog/datasets/{slug}/artifact")
def catalog_artifact(slug: str, orderId: str, expiresAt: int, token: str,
                       _rl: Annotated[None, Depends(rate_limit("artifact", 30))] = None):
    from app.services import catalog

    if not catalog.verify_download_token(slug, orderId, expiresAt, token):
        raise HTTPException(status_code=403, detail="invalid or expired download token")
    path = catalog.resolve_artifact_path(slug)
    if path is None:
        raise HTTPException(status_code=404, detail="artifact not found")
    return FileResponse(path, media_type="application/x-ndjson", filename=f"{slug}-chunks.jsonl")


class RefinerySubmitIn(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=64)
    consent: bool = False
    tags: list[str] = Field(default_factory=list, max_length=8)


@app.post("/v1/datalab/submit", status_code=201)
def refinery_submit(body: RefinerySubmitIn, tenant: Annotated[TenantCtx, Depends(require_tenant)],
                    _rl: Annotated[None, Depends(rate_limit("submit", 10))] = None):
    from app.services import catalog

    try:
        return catalog.submit(tenant.workspace_id, body.texts, body.consent, body.tags)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


class HarvestIn(BaseModel):
    sourceId: str


@app.post("/v1/admin/datalab/harvest", status_code=201)
def harvest_enqueue(body: HarvestIn, _: Annotated[None, Depends(require_admin)]):
    import uuid as _uuid

    from app.models import HarvestJob

    with db_session() as session:
        job = HarvestJob(id=_uuid.uuid4(), source_id=body.sourceId, requested_by="admin")
        session.add(job)
        jid = job.id
    return {"jobId": str(jid), "status": "pending"}


@app.get("/v1/admin/refinery/submissions")
def submissions_list(_: Annotated[None, Depends(require_admin)], status: str = "pending", limit: int = 50):
    from app.models import RefinerySubmission
    from sqlalchemy import select as _select

    with db_session() as session:
        rows = session.scalars(
            _select(RefinerySubmission).where(RefinerySubmission.status == status)
            .order_by(RefinerySubmission.created_at.desc()).limit(min(limit, 200))
        ).all()
        return {"items": [{
            "id": str(r.id), "receipt": str(r.receipt), "textCount": r.text_count,
            "tags": r.tags, "status": r.status, "createdAt": r.created_at.isoformat(),
        } for r in rows]}


class ReviewIn(BaseModel):
    action: str  # approve | reject


@app.post("/v1/admin/refinery/submissions/{sid}/review")
def submission_review(sid: str, body: ReviewIn, _: Annotated[None, Depends(require_admin)]):
    import uuid as _uuid

    from app.models import RefinerySubmission

    if body.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be approve|reject")
    with db_session() as session:
        row = session.get(RefinerySubmission, _uuid.UUID(sid))
        if row is None:
            raise HTTPException(status_code=404, detail="submission not found")
        row.status = "approved" if body.action == "approve" else "rejected"
        return {"id": sid, "status": row.status}


@app.get("/v1/admin/datalab/sources")
def datalab_sources(_: Annotated[None, Depends(require_admin)]):
    import json as _json
    import os as _os
    from pathlib import Path as _P

    from app.config import REPO_ROOT as _ROOT
    from app.models import HarvestJob
    from sqlalchemy import select as _select

    registry_path = _ROOT / "config" / "datalab_sources.json"
    try:
        raw = _json.loads(registry_path.read_text(encoding="utf-8"))
        sources = raw.get("sources", [])
    except Exception:
        sources = []
    state = {}
    state_path = _P(_os.getenv("DATALAB_DIR", str(_ROOT / "data" / "datalab"))) / "watch_state.json"
    try:
        state = _json.loads(state_path.read_text(encoding="utf-8"))
    except Exception:
        pass
    src_state = state.get("sources", state) if isinstance(state, dict) else {}
    with db_session() as session:
        jobs = session.scalars(
            _select(HarvestJob).order_by(HarvestJob.created_at.desc()).limit(10)
        ).all()
        recent = [{
            "id": str(j.id), "sourceId": j.source_id, "status": j.status,
            "error": j.error, "updatedAt": j.updated_at.isoformat(),
        } for j in jobs]
    return {
        "sources": [{
            "id": s.get("id"), "name": s.get("name"),
            "intervalMinutes": s.get("intervalMinutes"),
            "kind": "urls" if s.get("urls") else "glob",
            "state": src_state.get(s.get("id"), {}),
        } for s in sources],
        "recentJobs": recent,
    }


@app.get("/v1/wiki")
def wiki_list(response: Response, _rl: Annotated[None, Depends(rate_limit("wiki", 120))] = None):
    from app.services import wiki

    response.headers["Cache-Control"] = CATALOG_CACHE
    return wiki.list_pages()


@app.get("/v1/wiki/{slug}")
def wiki_page(slug: str, response: Response, _rl: Annotated[None, Depends(rate_limit("wiki", 120))] = None):
    from app.services import wiki

    out = wiki.get_page(slug)
    if out is None:
        raise HTTPException(status_code=404, detail="wiki page not found")
    response.headers["Cache-Control"] = CATALOG_CACHE
    return out


class CertifyIn(BaseModel):
    endpointUrl: str


@app.post("/v1/certify", status_code=201)
def certify_submit(body: CertifyIn, tenant: Annotated[TenantCtx, Depends(require_tenant)],
                   _rl: Annotated[None, Depends(rate_limit("certify", 6))] = None):
    from app.services import certify

    try:
        return certify.submit(tenant.workspace_id, body.endpointUrl)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/v1/certify/{sid}")
def certify_status(sid: str, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    from app.services import certify

    out = certify.get_submission(tenant.workspace_id, sid)
    if out is None:
        raise HTTPException(status_code=404, detail="submission not found")
    return out


@app.get("/v1/catalog/datasets/{slug}/full")
def catalog_full(slug: str, tenant: Annotated[TenantCtx, Depends(require_tenant)],
                 _rl: Annotated[None, Depends(rate_limit("full-corpus", 10))] = None):
    """MON-005 paid tier: entitled workspaces download the full corpus."""
    from app.services import catalog, entitlements

    sku = f"dataset:{slug}"
    if not entitlements.has(tenant.workspace_id, sku):
        raise HTTPException(
            status_code=403,
            detail=f"no entitlement for {sku} — request access via the Data Refinery (payment attaches at the commerce gate)",
        )
    out = catalog.get_full_corpus(tenant.workspace_id, slug)
    if out is None:
        raise HTTPException(status_code=404, detail="full corpus unavailable for this dataset")
    filename, body = out
    from app.services.usage import record as _record_usage

    _record_usage(tenant.workspace_id, "dataset-download")
    return Response(content=body, media_type="application/jsonl",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/v1/entitlements")
def entitlements_view(tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    from app.services import entitlements

    return entitlements.list_for(tenant.workspace_id)


class GrantIn(BaseModel):
    workspaceId: str
    sku: str


@app.post("/v1/admin/entitlements/grant", status_code=201)
def entitlement_grant(body: GrantIn, _: Annotated[None, Depends(require_admin)]):
    import uuid as _uuid

    from app.services import entitlements

    return entitlements.grant(_uuid.UUID(body.workspaceId), body.sku, granted_by="admin")


class RecommendIn(BaseModel):
    text: str | None = None
    itemId: str | None = None
    k: int = 5


@app.post("/v1/recommend")
def recommend(body: RecommendIn, tenant: Annotated[TenantCtx, Depends(require_tenant)],
              _rl: Annotated[None, Depends(rate_limit("recommend", 60))] = None):
    """Recommendations over the tenant's deployed model (RECO-002):
    text-to-item or item-to-item, with a reason on every result."""
    from app.services import recommend as rec_svc
    from app.services.usage import record as record_usage

    k = max(1, min(body.k, 25))
    if bool(body.text) == bool(body.itemId):
        raise HTTPException(status_code=400,
                            detail="provide exactly one of 'text' or 'itemId'")
    record_usage(tenant.workspace_id, "recommend")
    try:
        if body.text:
            return rec_svc.recommend_by_text(tenant.workspace_id, body.text, k)
        return rec_svc.recommend_by_item(tenant.workspace_id, body.itemId, k)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


class CorpusDoc(BaseModel):
    id: str | None = None
    title: str | None = None
    text: str
    metadata: dict | None = None


class CorpusUploadIn(BaseModel):
    name: str
    documents: list[CorpusDoc]
    train: bool = True


@app.post("/v1/corpus", status_code=201)
def upload_corpus(body: CorpusUploadIn, tenant: Annotated[TenantCtx, Depends(require_tenant)],
                  _rl: Annotated[None, Depends(rate_limit("corpus", 6))] = None):
    """Out-of-the-box entry point (RECO-001): documents in, gated
    recommender out — the loop handles train/eval/deploy from here."""
    from app.services import corpus_upload

    try:
        return corpus_upload.upload_and_train(
            tenant.workspace_id, body.name,
            [d.model_dump() for d in body.documents], body.train,
        )
    except ValueError as e:
        detail = str(e)
        raise HTTPException(status_code=409 if "ceiling" in detail else 400,
                            detail=detail) from e


class ExhaustIn(BaseModel):
    source: str
    kind: str
    consent: bool = False
    payload: dict | None = None


@app.post("/v1/exhaust", status_code=201)
def exhaust(body: ExhaustIn, tenant: Annotated[TenantCtx, Depends(require_tenant)],
            _rl: Annotated[None, Depends(rate_limit("exhaust", 120))] = None):
    """Unified data-exhaust intake (Spec 0022): every consumer surface emits
    through this one schema; consent gates storage, always."""
    from app.services import exhaust as exhaust_svc

    try:
        return exhaust_svc.ingest(
            tenant.workspace_id, body.source, body.kind, body.consent, body.payload
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/v1/usage")
def usage_view(tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    from app.services.usage import workspace_usage

    return workspace_usage(tenant.workspace_id)


@app.get("/v1/admin/usage")
def usage_admin(_: Annotated[None, Depends(require_admin)], days: int = 31):
    from app.services.usage import admin_rollup

    return admin_rollup(days)


@app.post("/v1/admin/wiki/rebuild")
def wiki_rebuild(_: Annotated[None, Depends(require_admin)]):
    from app.services.wiki import rebuild_wiki

    return rebuild_wiki()


@app.post("/v1/admin/catalog/sync")
def catalog_sync(_: Annotated[None, Depends(require_admin)]):
    from app.services import catalog

    out = catalog.sync_from_datalab()
    try:
        from app.services.wiki import rebuild_wiki

        out["wiki"] = rebuild_wiki()
    except Exception as exc:  # keep sync usable even if wiki fails
        out["wiki"] = f"rebuild failed: {exc}"
    return out


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
        from app.services.usage import record as _record_usage

        _record_usage(tenant.workspace_id, "embed", units=len(body["inputs"]))
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


@app.post("/v1/leads", status_code=201)
def create_lead(body: dict, tenant: Annotated[TenantCtx, Depends(require_tenant)]):
    """Durable lead capture (REV-904). Persists to the Postgres `leads` table
    so customer contact/waitlist signups survive Vercel's ephemeral filesystem.
    Validates email + a required message-or-interest field, truncates fields,
    and scopes the row to the caller's workspace via RLS."""
    max_field = 2000

    def clean(v) -> str:
        return str(v or "").strip()[:max_field]

    email = clean(body.get("email"))
    if not email or "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="valid email required")
    message = clean(body.get("message"))
    interest = clean(body.get("interest"))
    if not message and not interest:
        raise HTTPException(status_code=400, detail="message or interest required")

    lead = Lead(
        workspace_id=tenant.workspace_id,
        name=clean(body.get("name")),
        email=email,
        company=clean(body.get("company")),
        topic=clean(body.get("topic")) or "general",
        message=message or interest,
        source=clean(body.get("source")) or "site",
    )
    with db_session(tenant.workspace_id) as session:
        session.add(lead)
        session.flush()
        lead_id = lead.id

    return {"ok": True, "id": lead_id}


@app.get("/v1/leads")
def list_leads(
    tenant: Annotated[TenantCtx, Depends(require_tenant)],
    limit: int = 100,
):
    """List this workspace's leads (newest first). Tenant-scoped via RLS."""
    with db_session(tenant.workspace_id) as session:
        rows = session.scalars(
            select(Lead).order_by(Lead.received_at.desc()).limit(min(max(limit, 1), 500))
        ).all()
        return {
            "leads": [
                {
                    "id": r.id,
                    "name": r.name,
                    "email": r.email,
                    "company": r.company,
                    "topic": r.topic,
                    "message": r.message,
                    "source": r.source,
                    "receivedAt": r.received_at.isoformat() if r.received_at else None,
                }
                for r in rows
            ]
        }


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
        out = search_chunks(
            tenant.workspace_id,
            body.get("query", ""),
            k=int(body.get("k", 10)),
            collection_id=body.get("collectionId"),
            truncate_dims=int(td) if td is not None else None,
            quant=body.get("quant"),
        )
        from app.services.usage import record as _record_usage

        _record_usage(tenant.workspace_id, "search")
        return out
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
