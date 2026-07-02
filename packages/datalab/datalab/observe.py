"""Observability: local JSONL traces always; Langfuse passthrough when configured.

Every pipeline stage runs inside a span. Spans always land in
``data/traces/<trace_id>.jsonl`` (greppable, diffable); if the langfuse
extra is installed *and* LANGFUSE_PUBLIC_KEY is set, the same spans are
mirrored to Langfuse for hosted tracing.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


class Span:
    def __init__(self, trace: "Trace", name: str, attrs: dict[str, Any]) -> None:
        self.trace = trace
        self.name = name
        self.attrs = dict(attrs)
        self.started = time.perf_counter()

    def note(self, attrs: dict[str, Any]) -> None:
        self.attrs.update(attrs)


class Trace:
    def __init__(self, name: str, root: str | Path | None = None, enabled: bool = True) -> None:
        self.trace_id = f"{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"
        self.name = name
        self.enabled = enabled
        env = os.environ.get("DATALAB_TRACE_DIR")
        self.root = Path(root or env or Path("data") / "traces")
        self._langfuse = self._init_langfuse() if enabled else None

    @classmethod
    def noop(cls) -> "Trace":
        return cls("noop", enabled=False)

    def _init_langfuse(self) -> Any | None:
        if not os.environ.get("LANGFUSE_PUBLIC_KEY"):
            return None
        try:
            from langfuse import Langfuse  # type: ignore[import-not-found]

            return Langfuse()
        except ImportError:
            return None

    def _write(self, record: dict[str, Any]) -> None:
        if not self.enabled:
            return
        self.root.mkdir(parents=True, exist_ok=True)
        with (self.root / f"{self.trace_id}.jsonl").open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, default=str) + "\n")

    @contextmanager
    def span(self, name: str, attrs: dict[str, Any] | None = None) -> Iterator[Span]:
        s = Span(self, name, attrs or {})
        status = "ok"
        try:
            yield s
        except Exception:
            status = "error"
            raise
        finally:
            duration_ms = int((time.perf_counter() - s.started) * 1000)
            record = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "trace": self.trace_id,
                "traceName": self.name,
                "span": name,
                "status": status,
                "durationMs": duration_ms,
                "attrs": s.attrs,
            }
            self._write(record)
            if self._langfuse is not None:
                try:
                    self._langfuse.trace(name=self.name, id=self.trace_id).span(
                        name=name, metadata=s.attrs, status_message=status
                    )
                except Exception:
                    pass  # observability must never take down the pipeline
