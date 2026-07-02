#!/usr/bin/env python3
"""Unattended research loop — autoresearch queue, KEEP streak → realtext, literature radar.

Runs cursor patch experiments from queue.json; when exhausted, rotates hyperparam variants.
Claude delegate items stay manual (.claude/autoresearch-delegate.md).

Background:
  uv run python scripts/research_loop.py --daemon
  pnpm research:loop

One-shot (process pending queue only):
  uv run python scripts/research_loop.py --once
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCRIPTS = REPO / "scripts"
TRAIN = SCRIPTS / "autoresearch_train.py"
CHAMPION = REPO / "data" / "autoresearch" / "champion_train.py"
QUEUE = REPO / "data" / "autoresearch" / "queue.json"
STATE_PATH = REPO / "data" / "autoresearch" / "loop_state.json"
LOG_PATH = REPO / "data" / "autoresearch" / "loop.log"
KEEP_STREAK_FOR_REALTEXT = 3
LITERATURE_INTERVAL_SEC = 86400  # 24h
MIN_DISK_BYTES = 400_000_000  # skip heavy realtext if C: below ~400MB

sys.path.insert(0, str(SCRIPTS))
from autoresearch_orchestrate import ROUNDS, _apply_constants, _run  # noqa: E402
from autoresearch_utils import ensure_champion_exists, promote_train  # noqa: E402

# Round 3 rotation — embedding + edge serving (see config/research_backlog.json)
CURSOR_ROTATION: list[dict] = [
    {"id": "AR-301", "hypothesis": "barlow_lambda=0.022", "patch": {"BARLOW_LAMBDA": "0.022"}},
    {"id": "AR-302", "hypothesis": "D_SERVE=32 edge stress", "patch": {"D_SERVE": "32"}},
    {"id": "AR-303", "hypothesis": "AUG=0.5", "patch": {"AUG": "0.5"}},
    {"id": "AR-304", "hypothesis": "batch=48", "patch": {"BATCH": "48"}},
    {"id": "AR-305", "hypothesis": "weight_decay=5e-5", "patch": {"WEIGHT_DECAY": "5e-5"}},
    {"id": "AR-310", "hypothesis": "barlow_lambda=0.020", "patch": {"BARLOW_LAMBDA": "0.020"}},
    {"id": "AR-311", "hypothesis": "barlow_lambda=0.023", "patch": {"BARLOW_LAMBDA": "0.023"}},
    {"id": "AR-312", "hypothesis": "D_SERVE=48", "patch": {"D_SERVE": "48"}},
    {"id": "AR-313", "hypothesis": "batch=32 smaller", "patch": {"BATCH": "32"}},
    {"id": "AR-314", "hypothesis": "AUG=1.5 more noise", "patch": {"AUG": "1.5"}},
    {"id": "AR-315", "hypothesis": "lr=2.2e-3", "patch": {"LR": "2.2e-3"}},
    {"id": "AR-316", "hypothesis": "weight_decay=1e-5 lighter", "patch": {"WEIGHT_DECAY": "1e-5"}},
]


def log(msg: str) -> None:
    # Windows consoles often use cp1252 — avoid Unicode in stdout (e.g. λ in task titles)
    safe = msg.encode("ascii", "replace").decode("ascii")
    line = f"{datetime.now(timezone.utc).isoformat()} {safe}"
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line, flush=True)


def load_state() -> dict:
    default = {
        "consecutiveKeeps": 0,
        "totalRuns": 0,
        "lastLiteratureRadar": None,
        "realtextTriggered": False,
        "realtextCompleted": False,
        "completedIds": [],
        "rotationIndex": 0,
        "startedAt": datetime.now(timezone.utc).isoformat(),
    }
    if STATE_PATH.exists():
        return {**default, **json.loads(STATE_PATH.read_text(encoding="utf-8"))}
    return default


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def load_queue() -> dict:
    if QUEUE.exists():
        return json.loads(QUEUE.read_text(encoding="utf-8"))
    return {"round": 2, "status": "pending", "experiments": []}


def save_queue(payload: dict) -> None:
    QUEUE.parent.mkdir(parents=True, exist_ok=True)
    QUEUE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def disk_ok() -> bool:
    try:
        import shutil as sh

        usage = sh.disk_usage(str(REPO))
        return usage.free >= MIN_DISK_BYTES
    except OSError:
        return True


def pending_cursor_experiments(queue: dict) -> list[dict]:
    exps = queue.get("experiments") or queue.get("results") or []
    out = []
    for item in exps:
        if item.get("agent") != "cursor":
            continue
        if item.get("delegate"):
            continue
        if item.get("status") in ("done", "completed", "failed"):
            continue
        if item.get("id") in (load_state().get("completedIds") or []):
            continue
        if "patch" in item:
            out.append(item)
    return sorted(out, key=lambda x: x.get("priority", 99))


def next_rotation_experiment(state: dict) -> dict:
    idx = state.get("rotationIndex", 0) % len(CURSOR_ROTATION)
    item = {**CURSOR_ROTATION[idx], "agent": "cursor", "source": "rotation"}
    state["rotationIndex"] = idx + 1
    return item


def run_cursor_experiment(item: dict) -> dict:
    ensure_champion_exists()
    shutil.copy2(CHAMPION, TRAIN)
    if "patch" in item:
        _apply_constants(item["patch"])
    log(f"RUN {item['id']}: {item.get('hypothesis', item.get('patch'))}")
    result = _run("cursor-loop")
    result["id"] = item["id"]
    result["hypothesis"] = item.get("hypothesis", "")
    return result


def update_queue_after_run(queue: dict, item: dict, result: dict) -> None:
    exps = queue.setdefault("experiments", [])
    for exp in exps:
        if exp.get("id") == item["id"]:
            exp.update(
                {
                    "status": "done",
                    "keep": result.get("keep"),
                    "robust_score": result.get("robust_score"),
                    "reason": result.get("reason"),
                    "finishedAt": datetime.now(timezone.utc).isoformat(),
                }
            )
            break
    else:
        exps.append({**item, "status": "done", **result})
    queue["lastRun"] = {"id": item["id"], **result}
    queue["status"] = "running"
    save_queue(queue)


def maybe_literature_radar(state: dict) -> None:
    last = state.get("lastLiteratureRadar")
    now = datetime.now(timezone.utc)
    if last:
        try:
            prev = datetime.fromisoformat(last.replace("Z", "+00:00"))
            if (now - prev).total_seconds() < LITERATURE_INTERVAL_SEC:
                return
        except ValueError:
            pass
    log("literature radar starting")
    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / "arxiv_literature_radar.py"), "--write-md"],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    if proc.returncode == 0:
        state["lastLiteratureRadar"] = now.isoformat()
        log("literature radar done")
    else:
        log(f"literature radar failed: {proc.stderr[:200]}")


def maybe_realtext(state: dict) -> None:
    if state.get("realtextCompleted"):
        return
    if state.get("consecutiveKeeps", 0) < KEEP_STREAK_FOR_REALTEXT:
        return
    if state.get("realtextTriggered"):
        return
    if not disk_ok():
        log("realtext skipped — disk below minimum")
        return
    state["realtextTriggered"] = True
    save_state(state)
    log("KEEP streak >= 3 — starting realtext_methods research-rag")
    proc = subprocess.run(
        [
            sys.executable,
            str(SCRIPTS / "realtext_methods.py"),
            "--site",
            "research",
            "--methods",
            "infonce,vicreg,barlow,mrl",
        ],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    log(proc.stdout[-2000:] if proc.stdout else "")
    if proc.returncode == 0:
        state["realtextCompleted"] = True
        log("realtext_methods completed")
    else:
        log(f"realtext_methods failed (code {proc.returncode}): {proc.stderr[:300]}")
        state["realtextTriggered"] = False  # retry later


def one_cycle(state: dict) -> bool:
    """Run one experiment. Returns False if nothing to do."""
    queue = load_queue()
    pending = pending_cursor_experiments(queue)
    if pending:
        item = pending[0]
    else:
        item = next_rotation_experiment(state)

    if item["id"] in state.setdefault("completedIds", []):
        return True  # skip duplicate, advance rotation

    try:
        result = run_cursor_experiment(item)
    except Exception as e:
        log(f"ERROR {item['id']}: {e}")
        return True

    keep = bool(result.get("keep"))
    if keep:
        state["consecutiveKeeps"] = state.get("consecutiveKeeps", 0) + 1
        log(f"KEEP streak={state['consecutiveKeeps']} robust={result.get('robust_score')}")
    else:
        state["consecutiveKeeps"] = 0
        log(f"DISCARD robust={result.get('robust_score')} reason={result.get('reason')}")

    state["totalRuns"] = state.get("totalRuns", 0) + 1
    state["completedIds"].append(item["id"])
    update_queue_after_run(queue, item, result)
    save_state(state)
    maybe_realtext(state)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Unattended research loop")
    parser.add_argument("--daemon", action="store_true", help="Loop forever with sleep")
    parser.add_argument("--once", action="store_true", help="Single experiment then exit")
    parser.add_argument("--sleep", type=int, default=45, help="Seconds between runs (daemon)")
    parser.add_argument("--init", action="store_true", help="Init champion only")
    args = parser.parse_args()

    if args.init or not CHAMPION.exists():
        ensure_champion_exists()
        promote_train(reason="research-loop-init")
        log("champion initialized")

    if args.init and not args.daemon and not args.once:
        return 0

    state = load_state()
    log(f"research loop start daemon={args.daemon} totalRuns={state.get('totalRuns', 0)}")

    maybe_literature_radar(state)
    save_state(state)

    if args.once:
        one_cycle(state)
        save_state(state)
        return 0

    if args.daemon:
        while True:
            one_cycle(state)
            save_state(state)
            maybe_literature_radar(state)
            save_state(state)
            time.sleep(args.sleep)
        return 0

    # default: drain pending queue once per cursor item
    queue = load_queue()
    pending = pending_cursor_experiments(queue)
    for _ in pending:
        one_cycle(state)
        save_state(state)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
