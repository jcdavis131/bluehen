#!/usr/bin/env python3
"""Dual-agent autoresearch round — Cursor + Claude assignments.

Run:
  uv run python scripts/autoresearch_orchestrate.py --round 1
  uv run python scripts/autoresearch_orchestrate.py --write-queue --round 2
  uv run python scripts/autoresearch_orchestrate.py --round 2 --agent cursor
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCRIPTS = REPO / "scripts"
TRAIN = SCRIPTS / "autoresearch_train.py"
CHAMPION = REPO / "data" / "autoresearch" / "champion_train.py"
QUEUE = REPO / "data" / "autoresearch" / "queue.json"

sys.path.insert(0, str(SCRIPTS))
from autoresearch_utils import ensure_champion_exists, promote_train  # noqa: E402

ROUNDS: dict[int, list[dict]] = {
    1: [
        {
            "id": "cursor-1",
            "agent": "cursor",
            "hypothesis": "TPE barlow_lambda=0.012 (lower off-diagonal weight)",
            "patch": {"BARLOW_LAMBDA": "0.012"},
        },
        {
            "id": "claude-1",
            "agent": "claude",
            "hypothesis": "depth=2 GELU@256 (see .claude/autoresearch-delegate.md)",
            "delegate": True,
        },
    ],
    2: [
        {
            "id": "claude-1",
            "agent": "claude",
            "hypothesis": "depth=2 GELU@256 — SWEEP top-row arch test",
            "delegate": True,
            "priority": 1,
        },
        {
            "id": "cursor-2",
            "agent": "cursor",
            "hypothesis": "barlow_lambda=0.03 (higher decorrelation weight)",
            "patch": {"BARLOW_LAMBDA": "0.03"},
            "priority": 2,
        },
        {
            "id": "cursor-3",
            "agent": "cursor",
            "hypothesis": "batch=128 (TPE cluster used 64; test larger batches)",
            "patch": {"BATCH": "128"},
            "priority": 3,
        },
        {
            "id": "claude-2",
            "agent": "claude",
            "hypothesis": "InfoNCE + barlow aux (0.1 weight) — hybrid loss",
            "delegate": True,
            "priority": 4,
        },
    ],
    3: [
        {"id": "AR-301", "agent": "cursor", "hypothesis": "barlow_lambda=0.022 near TPE optimum", "patch": {"BARLOW_LAMBDA": "0.022"}, "priority": 1},
        {"id": "AR-302", "agent": "cursor", "hypothesis": "D_SERVE=32 edge-dim stress test", "patch": {"D_SERVE": "32"}, "priority": 2},
        {"id": "AR-303", "agent": "cursor", "hypothesis": "AUG=0.5 lower view noise", "patch": {"AUG": "0.5"}, "priority": 3},
        {"id": "AR-304", "agent": "cursor", "hypothesis": "batch=48 intermediate", "patch": {"BATCH": "48"}, "priority": 4},
        {"id": "AR-305", "agent": "cursor", "hypothesis": "weight_decay=5e-5 stronger L2", "patch": {"WEIGHT_DECAY": "5e-5"}, "priority": 5},
        {"id": "AR-306", "agent": "claude", "hypothesis": "depth=2 GELU@256 encoder", "delegate": True, "priority": 6},
        {"id": "AR-307", "agent": "claude", "hypothesis": "InfoNCE + Barlow aux 0.1", "delegate": True, "priority": 7},
        {"id": "AR-308", "agent": "claude", "hypothesis": "MRL prefix loss in autoresearch_train.py", "delegate": True, "priority": 8},
        {"id": "AR-309", "agent": "claude", "hypothesis": "Rank floor when served_rank < 12", "delegate": True, "priority": 9},
    ],
}


def _apply_constants(patch: dict[str, str]) -> None:
    text = TRAIN.read_text(encoding="utf-8")
    for key, val in patch.items():
        import re

        text, n = re.subn(rf"^{key}\s*=\s*.+$", f"{key} = {val}", text, count=1, flags=re.M)
        if n == 0:
            raise KeyError(f"constant {key} not found in train.py")
    TRAIN.write_text(text, encoding="utf-8")


def _run(agent: str) -> dict:
    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / "autoresearch_run.py"), agent],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    print(proc.stdout)
    if proc.stderr:
        print(proc.stderr, file=sys.stderr)
    last = json.loads((REPO / "data" / "autoresearch" / "last_run.json").read_text(encoding="utf-8"))
    last["exitCode"] = proc.returncode
    return last


def write_queue(round_num: int, *, status: str = "pending") -> None:
    items = ROUNDS.get(round_num, [])
    payload = {
        "round": round_num,
        "status": status,
        "queuedAt": datetime.now(timezone.utc).isoformat(),
        "blockedUntil": "disk space cleared + Docker stack up",
        "instructions": [
            "uv run python scripts/autoresearch_orchestrate.py --init-champion",
            "Claude: .claude/autoresearch-delegate.md → claude-1",
            "Cursor: uv run python scripts/autoresearch_orchestrate.py --round 2 --agent cursor",
            "After 3× KEEP: uv run python scripts/realtext_methods.py --site research-rag",
        ],
        "experiments": [{**item, "status": "pending"} for item in items],
        "completedRound1": {
            "cursor-1": {"keep": False, "robust_score": 1.4072, "reason": "knn_full regression"},
        },
    }
    QUEUE.parent.mkdir(parents=True, exist_ok=True)
    QUEUE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {QUEUE} (round {round_num}, {len(items)} experiments queued)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--round", type=int, default=1)
    parser.add_argument("--agent", choices=["cursor", "claude", "all"], default="cursor")
    parser.add_argument("--init-champion", action="store_true")
    parser.add_argument("--write-queue", action="store_true", help="Write queue.json without running")
    args = parser.parse_args()

    if args.write_queue:
        write_queue(args.round)
        return 0

    if args.init_champion or not CHAMPION.exists():
        ensure_champion_exists()
        promote_train(reason="orchestrator-init")
        print("champion initialized from current train.py")
        if args.init_champion:
            return 0

    items = ROUNDS.get(args.round, [])
    if not items:
        print(f"no experiments defined for round {args.round}")
        return 1

    results = []
    for item in items:
        if args.agent != "all" and item["agent"] != args.agent:
            continue
        if item.get("delegate"):
            print(f"SKIP {item['id']}: run manually in Claude terminal — .claude/autoresearch-delegate.md")
            results.append({**item, "skipped": True, "status": "delegate"})
            continue
        shutil.copy2(CHAMPION, TRAIN)
        if "patch" in item:
            _apply_constants(item["patch"])
        print(f"\n=== {item['id']} ({item['agent']}): {item['hypothesis']} ===\n")
        results.append({**item, **_run(item["agent"])})

    QUEUE.parent.mkdir(parents=True, exist_ok=True)
    QUEUE.write_text(
        json.dumps({"round": args.round, "status": "completed", "results": results}, indent=2),
        encoding="utf-8",
    )
    print(f"\nWrote {QUEUE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
