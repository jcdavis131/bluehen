"""Typed platform tools for agent teams.

Every tool is a named, schema-described function over a *platform surface*
(work queue, datalab, runboard, knowledge bundle) — never arbitrary shell.
Teams get an allowlist; calls outside it are refused and logged.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable


def _repo_root() -> Path:
    cur = Path.cwd().resolve()
    for candidate in (cur, *cur.parents):
        if (candidate / ".git").exists():
            return candidate
    return cur


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict[str, Any]  # JSON schema for the arguments object
    fn: Callable[..., Any]

    def spec(self) -> dict[str, Any]:
        """OpenAI-compatible tool spec."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class ToolRegistry:
    def __init__(self, tools: list[Tool]) -> None:
        self._tools = {t.name: t for t in tools}

    def specs(self, allowlist: list[str] | None = None) -> list[dict[str, Any]]:
        names = allowlist if allowlist is not None else list(self._tools)
        return [self._tools[n].spec() for n in names if n in self._tools]

    def call(self, name: str, arguments: dict[str, Any], allowlist: list[str] | None = None) -> Any:
        if allowlist is not None and name not in allowlist:
            return {"error": f"tool '{name}' not in this team's allowlist"}
        tool = self._tools.get(name)
        if tool is None:
            return {"error": f"unknown tool '{name}'"}
        try:
            return tool.fn(**arguments)
        except TypeError as e:
            return {"error": f"bad arguments for '{name}': {e}"}
        except Exception as e:  # tools never crash the loop
            return {"error": f"{type(e).__name__}: {str(e)[:300]}"}


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def work_queue_summary() -> dict[str, Any]:
    """Blockers + open tasks from config/work_queue.json."""
    path = _repo_root() / "config" / "work_queue.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    tasks = data.get("tasks", [])
    open_tasks = [
        {
            "id": t.get("id"),
            "title": t.get("title"),
            "division": t.get("division"),
            "claimedBy": t.get("claimedBy"),
            "blockedBy": t.get("blockedBy", []),
        }
        for t in tasks
        if t.get("status") not in ("done", "dropped")
    ]
    return {
        "blockers": data.get("blockers", []),
        "openCount": len(open_tasks),
        "open": open_tasks[:40],
    }


def list_datasets(limit: int = 20) -> dict[str, Any]:
    """Most recent datalab dataset manifests."""
    from datalab.pipeline import list_datasets as _list

    return {"datasets": [m.model_dump(mode="json") for m in _list()[: max(1, limit)]]}


def watch_tick() -> dict[str, Any]:
    """Run one pass of the continuous dataset builder over due sources."""
    from datalab.watch import WatchState, load_registry, tick

    reports = tick(load_registry(), WatchState())
    return {"reports": reports}


def list_watch_sources() -> dict[str, Any]:
    """Current source registry for the dataset builder."""
    from datalab.watch import load_registry

    return {
        "sources": [
            {
                "id": s.id, "name": s.name, "urls": s.urls, "glob": s.glob,
                "intervalMinutes": s.interval_minutes, "tags": s.tags,
            }
            for s in load_registry()
        ]
    }


def add_watch_source(
    id: str, name: str, urls: list[str] | None = None,
    glob: str | None = None, interval_minutes: int = 720, tags: list[str] | None = None,
) -> dict[str, Any]:
    """Add a source to the dataset-builder registry (additive only)."""
    path = _repo_root() / "config" / "datalab_sources.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    if any(s.get("id") == id for s in data.get("sources", [])):
        return {"error": f"source '{id}' already exists"}
    if not urls and not glob:
        return {"error": "provide urls or glob"}
    entry: dict[str, Any] = {"id": id, "name": name, "intervalMinutes": interval_minutes}
    if urls:
        entry["urls"] = urls
    if glob:
        entry["glob"] = glob
    if tags:
        entry["tags"] = tags
    data.setdefault("sources", []).append(entry)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return {"added": entry}


def list_runs(limit: int = 10) -> dict[str, Any]:
    """Recent training runs (runboard manifests)."""
    from runboard.store import default_store

    runs = []
    for rec in default_store().list_runs():
        runs.append(rec.manifest)
        if len(runs) >= limit:
            break
    return {"runs": runs}


def run_events(run_id: str) -> dict[str, Any]:
    """Events (surgery, collapse alerts) for one training run."""
    from runboard.store import default_store

    return {"runId": run_id, "events": default_store().get_events(run_id)}


def read_knowledge(concept_path: str) -> dict[str, Any]:
    """Read an OKF concept from the knowledge bundle (bundle-relative path)."""
    root = (_repo_root() / "knowledge").resolve()
    target = (root / concept_path.strip("/")).resolve()
    if root not in target.parents and target != root:
        return {"error": "path escapes the knowledge bundle"}
    if not target.exists():
        return {"error": f"no such concept: {concept_path}"}
    return {"path": concept_path, "content": target.read_text(encoding="utf-8")[:20000]}


def default_registry() -> ToolRegistry:
    obj = {"type": "object", "properties": {}, "required": []}
    return ToolRegistry([
        Tool("work_queue_summary", "Blockers and open tasks from the fleet work queue.", obj, work_queue_summary),
        Tool("list_datasets", "Most recent collected datasets with provenance.", {
            "type": "object",
            "properties": {"limit": {"type": "integer", "minimum": 1, "maximum": 100}},
            "required": [],
        }, list_datasets),
        Tool("watch_tick", "Run one pass of the continuous dataset builder over due sources.", obj, watch_tick),
        Tool("list_watch_sources", "List the dataset-builder source registry.", obj, list_watch_sources),
        Tool("add_watch_source", "Add a new source to the dataset-builder registry (additive only).", {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "name": {"type": "string"},
                "urls": {"type": "array", "items": {"type": "string"}},
                "glob": {"type": "string"},
                "interval_minutes": {"type": "integer", "minimum": 30},
                "tags": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["id", "name"],
        }, add_watch_source),
        Tool("list_runs", "Recent training runs with status and summary metrics.", {
            "type": "object",
            "properties": {"limit": {"type": "integer", "minimum": 1, "maximum": 50}},
            "required": [],
        }, list_runs),
        Tool("run_events", "Surgery/collapse events for a training run.", {
            "type": "object",
            "properties": {"run_id": {"type": "string"}},
            "required": ["run_id"],
        }, run_events),
        Tool("read_knowledge", "Read an OKF concept document from the knowledge bundle.", {
            "type": "object",
            "properties": {"concept_path": {"type": "string"}},
            "required": ["concept_path"],
        }, read_knowledge),
    ])
