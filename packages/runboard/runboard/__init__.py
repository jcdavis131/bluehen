"""runboard — lightweight experiment tracking for SynthaEmbed OS.

W&B-style run tracking backed by plain JSONL files so runs are diffable,
portable, and readable without tooling (same philosophy as OKF).

    import runboard

    run = runboard.init(project="autoresearch", name="ar-306-gelu", config={...})
    run.log({"loss": 0.42, "effective_rank": 14.2}, step=10)
    run.log_event("surgery", "spectral surgery triggered", {"rank": 6.1})
    run.finish()
"""

from runboard.run import Run, init
from runboard.store import RunStore, default_store
from runboard.telemetry import (
    RankMonitor,
    effective_rank,
    r2d_curvature,
)

__all__ = [
    "Run",
    "init",
    "RunStore",
    "default_store",
    "RankMonitor",
    "effective_rank",
    "r2d_curvature",
]
