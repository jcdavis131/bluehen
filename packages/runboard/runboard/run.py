"""Run lifecycle: init → log → finish."""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any

from runboard.store import RunStore, default_store


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slug(text: str) -> str:
    return "".join(c if c.isalnum() or c in "-_." else "-" for c in text.lower()).strip("-")


class Run:
    def __init__(
        self,
        *,
        project: str,
        name: str | None = None,
        config: dict[str, Any] | None = None,
        tags: list[str] | None = None,
        store: RunStore | None = None,
        run_id: str | None = None,
    ) -> None:
        self.store = store or default_store()
        stamp = time.strftime("%Y%m%d-%H%M%S")
        base = _slug(name or project or "run")
        self.run_id = run_id or f"{stamp}-{base}-{uuid.uuid4().hex[:6]}"
        self._step = 0
        self.manifest: dict[str, Any] = {
            "id": self.run_id,
            "project": project,
            "name": name or self.run_id,
            "config": config or {},
            "tags": tags or [],
            "status": "running",
            "summary": {},
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        }
        self.store.write_manifest(self.run_id, self.manifest)

    def log(self, metrics: dict[str, Any], step: int | None = None) -> int:
        """Log a dict of scalar metrics; returns the step used."""
        if step is None:
            step = self._step
        self._step = max(self._step, step) + 1
        self.store.append(
            self.run_id,
            "metrics.jsonl",
            {"step": step, "ts": _now_iso(), "metrics": metrics},
        )
        # keep the latest value of every metric in the summary for list views
        self.manifest["summary"].update(metrics)
        self.manifest["updatedAt"] = _now_iso()
        self.store.write_manifest(self.run_id, self.manifest)
        return step

    def log_event(self, kind: str, message: str, data: dict[str, Any] | None = None) -> None:
        """Log a discrete event (surgery trigger, collapse alert, checkpoint, ...)."""
        self.store.append(
            self.run_id,
            "events.jsonl",
            {"ts": _now_iso(), "step": self._step, "kind": kind, "message": message, "data": data or {}},
        )

    def set_summary(self, **kwargs: Any) -> None:
        self.manifest["summary"].update(kwargs)
        self.manifest["updatedAt"] = _now_iso()
        self.store.write_manifest(self.run_id, self.manifest)

    def finish(self, status: str = "finished") -> None:
        self.manifest["status"] = status
        self.manifest["updatedAt"] = _now_iso()
        self.store.write_manifest(self.run_id, self.manifest)

    def __enter__(self) -> "Run":
        return self

    def __exit__(self, exc_type: type | None, *_: Any) -> None:
        self.finish("failed" if exc_type else "finished")


def init(
    project: str,
    name: str | None = None,
    config: dict[str, Any] | None = None,
    tags: list[str] | None = None,
    store: RunStore | None = None,
) -> Run:
    return Run(project=project, name=name, config=config, tags=tags, store=store)
