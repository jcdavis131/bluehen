"""Training telemetry service — read-only views over runboard runs and datalab datasets.

Runs live on the filesystem (data/runs, data/datalab) written by training
scripts and collection pipelines; this module is the API-side reader the
training console polls.
"""

from __future__ import annotations

from typing import Any

from runboard.store import RunStore, default_store

_store: RunStore | None = None


def store() -> RunStore:
    global _store
    if _store is None:
        _store = default_store()
    return _store


def list_runs(project: str | None = None, limit: int = 100) -> dict[str, Any]:
    runs: list[dict[str, Any]] = []
    for rec in store().list_runs():
        if project and rec.manifest.get("project") != project:
            continue
        runs.append(rec.manifest)
        if len(runs) >= limit:
            break
    return {"runs": runs}


def get_run(run_id: str) -> dict[str, Any] | None:
    return store().get_manifest(run_id)


def get_metrics(run_id: str, after: int = 0, limit: int = 5000) -> dict[str, Any] | None:
    if store().get_manifest(run_id) is None:
        return None
    rows = store().get_metrics(run_id, after=after, limit=limit)
    return {"runId": run_id, "after": after, "count": len(rows), "rows": rows}


def get_events(run_id: str, after: int = 0) -> dict[str, Any] | None:
    if store().get_manifest(run_id) is None:
        return None
    rows = store().get_events(run_id, after=after)
    return {"runId": run_id, "after": after, "count": len(rows), "rows": rows}


def list_datasets() -> dict[str, Any]:
    from datalab.pipeline import list_datasets as _list

    return {"datasets": [m.model_dump(mode="json") for m in _list()]}
