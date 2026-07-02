"""Read-only HTTP surface over a RunStore.

Two consumption modes:

1. Mounted inside core-api (tenant-authenticated) via ``build_router``.
2. Standalone local dev server: ``uv run python -m runboard serve`` —
   binds 127.0.0.1:8100 with permissive CORS so the training console can
   poll it without a key. Local development only; production traffic goes
   through core-api.
"""

from __future__ import annotations

from typing import Any

from runboard.store import RunStore, default_store


def build_router(store: RunStore | None = None):  # -> fastapi.APIRouter
    from fastapi import APIRouter, HTTPException

    store = store or default_store()
    router = APIRouter(prefix="/v1/runs", tags=["runs"])

    @router.get("")
    def list_runs(project: str | None = None, limit: int = 100) -> dict[str, Any]:
        runs = []
        for rec in store.list_runs():
            if project and rec.manifest.get("project") != project:
                continue
            runs.append(rec.manifest)
            if len(runs) >= limit:
                break
        return {"runs": runs}

    @router.get("/{run_id}")
    def get_run(run_id: str) -> dict[str, Any]:
        manifest = _manifest_or_404(run_id)
        return manifest

    @router.get("/{run_id}/metrics")
    def get_metrics(run_id: str, after: int = 0, limit: int = 5000) -> dict[str, Any]:
        _manifest_or_404(run_id)
        rows = store.get_metrics(run_id, after=after, limit=limit)
        return {"runId": run_id, "after": after, "count": len(rows), "rows": rows}

    @router.get("/{run_id}/events")
    def get_events(run_id: str, after: int = 0) -> dict[str, Any]:
        _manifest_or_404(run_id)
        rows = store.get_events(run_id, after=after)
        return {"runId": run_id, "after": after, "count": len(rows), "rows": rows}

    def _manifest_or_404(run_id: str) -> dict[str, Any]:
        try:
            manifest = store.get_manifest(run_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        if manifest is None:
            raise HTTPException(status_code=404, detail=f"run not found: {run_id}")
        return manifest

    return router


def create_app(store: RunStore | None = None):  # -> fastapi.FastAPI
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    app = FastAPI(title="runboard", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # local dev server only — see module docstring
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(build_router(store))

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return app
