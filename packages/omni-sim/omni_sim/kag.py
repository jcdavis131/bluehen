"""Knowledge-Action Graph trajectory logging."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_TRAJ_PATH = REPO_ROOT / "data" / "omni" / "trajectories.jsonl"


def log_trajectory(
    *,
    state: dict[str, Any],
    action: dict[str, Any],
    observation: dict[str, Any],
    verifier: dict[str, Any],
    path: Path | None = None,
) -> dict[str, Any]:
    """Append 4-tuple (s_t, a_t, o_t, v_t) to KAG store."""
    out_path = path or DEFAULT_TRAJ_PATH
    out_path.parent.mkdir(parents=True, exist_ok=True)
    row = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "s": state,
        "a": action,
        "o": observation,
        "v": verifier,
    }
    with out_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")
    return row
