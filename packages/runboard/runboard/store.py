"""Filesystem run store.

Layout (one directory per run under the store root):

    <root>/<run_id>/
        manifest.json    # id, project, name, config, tags, status, summary, timestamps
        metrics.jsonl    # one JSON object per logged step: {"step", "ts", "metrics": {...}}
        events.jsonl     # one JSON object per event: {"ts", "kind", "message", "data"}

The root defaults to $RUNBOARD_DIR, falling back to ./data/runs relative to
the current working directory (the repo root in normal usage).
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

_RUN_ID_RE = re.compile(r"^[a-z0-9][a-z0-9\-_.]{0,127}$")


def repo_root() -> Path:
    """Nearest ancestor with a .git directory, else the cwd.

    Anchors the default store so runs land in one place regardless of the
    directory a training script was launched from.
    """
    cur = Path.cwd().resolve()
    for candidate in (cur, *cur.parents):
        if (candidate / ".git").exists():
            return candidate
    return cur


def _read_jsonl(path: Path, after: int = 0, limit: int | None = None) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    out: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fh:
        for i, line in enumerate(fh):
            if i < after:
                continue
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue  # tolerate a torn tail write from a live run
            if limit is not None and len(out) >= limit:
                break
    return out


@dataclass
class RunRecord:
    run_id: str
    path: Path
    manifest: dict[str, Any]


class RunStore:
    """Read/write access to a directory of runs."""

    def __init__(self, root: str | Path | None = None) -> None:
        env = os.environ.get("RUNBOARD_DIR")
        self.root = Path(root or env or repo_root() / "data" / "runs").resolve()

    # -- write side ---------------------------------------------------------

    def run_dir(self, run_id: str) -> Path:
        if not _RUN_ID_RE.match(run_id):
            raise ValueError(f"invalid run id: {run_id!r}")
        return self.root / run_id

    def write_manifest(self, run_id: str, manifest: dict[str, Any]) -> None:
        d = self.run_dir(run_id)
        d.mkdir(parents=True, exist_ok=True)
        tmp = d / "manifest.json.tmp"
        tmp.write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")
        os.replace(tmp, d / "manifest.json")

    def append(self, run_id: str, filename: str, record: dict[str, Any]) -> None:
        d = self.run_dir(run_id)
        d.mkdir(parents=True, exist_ok=True)
        with (d / filename).open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, default=str) + "\n")

    # -- read side ----------------------------------------------------------

    def list_runs(self) -> Iterator[RunRecord]:
        if not self.root.exists():
            return
        for d in sorted(self.root.iterdir(), reverse=True):
            mf = d / "manifest.json"
            if not d.is_dir() or not mf.exists():
                continue
            try:
                manifest = json.loads(mf.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            yield RunRecord(run_id=d.name, path=d, manifest=manifest)

    def get_manifest(self, run_id: str) -> dict[str, Any] | None:
        mf = self.run_dir(run_id) / "manifest.json"
        if not mf.exists():
            return None
        return json.loads(mf.read_text(encoding="utf-8"))

    def get_metrics(
        self, run_id: str, after: int = 0, limit: int | None = None
    ) -> list[dict[str, Any]]:
        return _read_jsonl(self.run_dir(run_id) / "metrics.jsonl", after=after, limit=limit)

    def get_events(self, run_id: str, after: int = 0) -> list[dict[str, Any]]:
        return _read_jsonl(self.run_dir(run_id) / "events.jsonl", after=after)


def default_store() -> RunStore:
    return RunStore()
