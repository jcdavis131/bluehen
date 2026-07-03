"""Continuous dataset builder — the "listening" half of the Data Miners loop.

Reads a source registry (config/datalab_sources.json), collects each source
on its cadence, and skips materialization when content is unchanged
(dedupe by doc content hash — every SourceDoc id already *is* a content
hash). Every materialized collection is a new point-in-time dataset with
an OKF card, so the knowledge bundle's dataset library grows only when
the underlying sources actually change.

    uv run python -m datalab watch --once     # one pass over due sources (cron-friendly)
    uv run python -m datalab watch            # long-running loop
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from datalab.observe import Trace
from datalab.pipeline import (
    CollectionRun,
    _data_root,
    _repo_root,
    ingest_sources,
    materialize_collection,
)


@dataclass
class Source:
    id: str
    name: str
    urls: list[str] = field(default_factory=list)
    glob: str | None = None
    tags: list[str] = field(default_factory=list)
    interval_minutes: int = 360
    max_tokens: int = 512
    strategy: str = "auto"

    def expand(self, root: Path) -> list[str]:
        """Resolve the concrete source list (urls + glob matches).

        Globs under ``data/datalab/`` follow the DATALAB_DIR env when set —
        in containers the store lives on a volume (/data/datalab), not in
        the repo tree, and inbox flywheel sources must find it there.
        """
        import os

        out = list(self.urls)
        if self.glob:
            pattern = self.glob
            store = os.getenv("DATALAB_DIR")
            if store and pattern.replace("\\", "/").startswith("data/datalab/"):
                rel = pattern.replace("\\", "/")[len("data/datalab/"):]
                out.extend(sorted(str(p) for p in Path(store).glob(rel)))
            else:
                out.extend(sorted(str(p) for p in root.glob(pattern)))
        return out


def load_registry(path: str | Path | None = None) -> list[Source]:
    path = Path(path or _repo_root() / "config" / "datalab_sources.json")
    raw = json.loads(path.read_text(encoding="utf-8"))
    defaults = raw.get("defaults", {})
    sources = []
    for s in raw.get("sources", []):
        sources.append(
            Source(
                id=s["id"],
                name=s.get("name", s["id"]),
                urls=s.get("urls", []),
                glob=s.get("glob"),
                tags=s.get("tags", []),
                interval_minutes=int(s.get("intervalMinutes", defaults.get("intervalMinutes", 360))),
                max_tokens=int(s.get("maxTokens", defaults.get("maxTokens", 512))),
                strategy=s.get("strategy", defaults.get("strategy", "auto")),
            )
        )
    return sources


class WatchState:
    """Per-source collection state, persisted as JSON under the data root."""

    def __init__(self, path: str | Path | None = None) -> None:
        self.path = Path(path or _data_root() / "watch_state.json")
        self.state: dict[str, dict[str, Any]] = {}
        if self.path.exists():
            try:
                self.state = json.loads(self.path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                self.state = {}

    def save(self) -> None:
        """Atomic write (REV-909): temp file + os.replace so a crash mid-write
        can never corrupt the state and force full re-collection."""
        import os

        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(self.state, indent=2), encoding="utf-8")
        os.replace(tmp, self.path)

    def entry(self, source_id: str) -> dict[str, Any]:
        return self.state.setdefault(source_id, {})

    def is_due(self, source: Source, now: float | None = None) -> bool:
        last = self.entry(source.id).get("lastRunAt")
        if last is None:
            return True
        return (now or time.time()) - float(last) >= source.interval_minutes * 60


def content_fingerprint(doc_ids: list[str]) -> str:
    return hashlib.sha256("\n".join(sorted(doc_ids)).encode()).hexdigest()[:16]


def collect_source(
    source: Source,
    state: WatchState,
    *,
    data_root: str | Path | None = None,
    knowledge_root: str | Path | None = None,
    repo_root: Path | None = None,
    now: float | None = None,
) -> dict[str, Any]:
    """Collect one source: skip when unchanged, materialize a dataset when new.

    Returns a report dict: {sourceId, action: collected|unchanged|empty, ...}.
    """
    now = now or time.time()
    root = repo_root or _repo_root()
    concrete = source.expand(root)
    entry = state.entry(source.id)
    report: dict[str, Any] = {"sourceId": source.id, "sources": len(concrete)}

    trace = Trace(f"watch:{source.id}")
    docs, failures = ingest_sources(concrete, trace=trace)
    entry["lastRunAt"] = now
    entry["lastCheckedAt"] = datetime.now(timezone.utc).isoformat()

    if not docs:
        report["action"] = "empty"
        report["failures"] = failures
        state.save()
        return report

    fp = content_fingerprint([d.doc_id for d in docs])
    if fp == entry.get("contentHash"):
        report["action"] = "unchanged"
        report["fingerprint"] = fp
        state.save()
        return report

    run: CollectionRun = materialize_collection(
        docs,
        source.name,
        sources=concrete,
        failures=failures,
        max_tokens=source.max_tokens,
        strategy=source.strategy,
        data_root=data_root,
        knowledge_root=knowledge_root,
        trace=trace,
    )
    entry["contentHash"] = fp
    entry["datasetId"] = run.manifest.dataset_id
    entry["runs"] = int(entry.get("runs", 0)) + 1
    state.save()
    report.update(
        action="collected",
        datasetId=run.manifest.dataset_id,
        docs=run.manifest.doc_count,
        chunks=run.manifest.chunk_count,
        fingerprint=fp,
    )
    return report


def tick(
    registry: list[Source],
    state: WatchState,
    *,
    data_root: str | Path | None = None,
    knowledge_root: str | Path | None = None,
    repo_root: Path | None = None,
    now: float | None = None,
) -> list[dict[str, Any]]:
    """Run every due source once; returns one report per due source."""
    reports = []
    for source in registry:
        if not state.is_due(source, now=now):
            continue
        try:
            reports.append(
                collect_source(
                    source,
                    state,
                    data_root=data_root,
                    knowledge_root=knowledge_root,
                    repo_root=repo_root,
                    now=now,
                )
            )
        except Exception as e:  # one bad source must not stop the loop
            reports.append({"sourceId": source.id, "action": "error", "error": str(e)[:200]})
    return reports


def watch_loop(
    registry_path: str | Path | None = None,
    *,
    once: bool = False,
    poll_seconds: int = 60,
) -> None:
    registry = load_registry(registry_path)
    state = WatchState()
    print(f"datalab watch: {len(registry)} sources registered")
    while True:
        for report in tick(registry, state):
            print(json.dumps(report, default=str))
        if once:
            return
        time.sleep(poll_seconds)
