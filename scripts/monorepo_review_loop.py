#!/usr/bin/env python3
"""Monorepo Review Loop runner.

Executes the `monorepo-review-loop` skill arc on a cadence or once.
Each iteration: orient -> plan -> (emit a run-log stub) -> report.
The heavy phases (code review, gates, deploy, smoke, close-out) are
performed by the agent invoking the corresponding skills; this script
does the deterministic recon + bookkeeping and writes the run log.

Usage:
    uv run python scripts/monorepo_review_loop.py            # one pass
    uv run python scripts/monorepo_review_loop.py --loop 1440 # daily
    uv run python scripts/monorepo_review_loop.py --once      # explicit single
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEWS = ROOT / "knowledge" / "reviews"
WATCH_PATTERNS = ROOT / ".cursor" / "fable-watch" / "observed-patterns.md"


def run(cmd: list[str], *, timeout: int = 60) -> tuple[int, str]:
    try:
        p = subprocess.run(
            cmd,
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
        return p.returncode, (p.stdout + p.stderr).strip()
    except subprocess.TimeoutExpired:
        return 124, "TIMEOUT"
    except FileNotFoundError:
        return 127, f"command not found: {cmd[0]}"


def disk_free_gb() -> str:
    if os.name == "nt":
        rc, out = run(["powershell", "-NoProfile", "-Command",
                       "(Get-PSDrive C).Free / 1GB"])
        try:
            return f"{float(out):.1f} GB"
        except ValueError:
            return out or "unknown"
    st = os.statvfs(ROOT)
    return f"{(st.f_bavail * st.f_frsize) / 1e9:.1f} GB"


def git_head() -> str:
    rc, out = run(["git", "log", "-1", "--format=%h %s"])
    return out or "no commits"


def git_status_short() -> str:
    rc, out = run(["git", "status", "--short"])
    lines = out.splitlines()
    return f"{len(lines)} changed" if lines else "clean"


def queue_blockers() -> str:
    rc, out = run(["uv", "run", "--no-sync", "python",
                   "scripts/pick_task.py", "blockers"], timeout=90)
    return out or "(no output)"


def orient() -> dict:
    return {
        "disk_free": disk_free_gb(),
        "git_head": git_head(),
        "git_status": git_status_short(),
        "blockers": queue_blockers(),
    }


def write_run_log(state: dict, phase_notes: dict) -> Path:
    REVIEWS.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y-%m-%d")
    path = REVIEWS / f"monorepo-review-{stamp}.md"
    now = dt.datetime.now().isoformat(timespec="seconds")
    block = [
        f"## Run {now}",
        "",
        "### Phase 0 — Orient",
        f"- disk free: {state['disk_free']}",
        f"- git head: {state['git_head']}",
        f"- git status: {state['git_status']}",
        f"- blockers:",
        "```",
        state["blockers"],
        "```",
        "",
    ]
    for phase, note in phase_notes.items():
        block += [f"### {phase}", note, ""]
    # append, don't overwrite
    with path.open("a", encoding="utf-8") as fh:
        fh.write("\n".join(block) + "\n")
    return path


def one_pass() -> int:
    print("[monorepo-review-loop] Phase 0 — Orient")
    state = orient()
    for k, v in state.items():
        print(f"  {k}: {v}")

    phase_notes: dict[str, str] = {}
    # Phase 1 board snapshot (deterministic, from the queue)
    rc, board = run(["uv", "run", "--no-sync", "python",
                     "scripts/pick_task.py", "list"], timeout=90)
    phase_notes["Phase 1 — Lane & Plan"] = (
        "Board snapshot:\n```\n" + (board or "(empty)") + "\n```"
    )

    # Phases 2-9 are agent-driven; record the handoff to the skill arc.
    phase_notes["Phase 2-9 — Agent-driven"] = (
        "Handed to the `monorepo-review-loop` skill arc: "
        "fan out reviewers (Phase 2), code review (3), gates (4), "
        "guards (5), metadata-align (6), deploy+smoke (7), "
        "triage as needed (8), close-out (9)."
    )

    log = write_run_log(state, phase_notes)
    print(f"[monorepo-review-loop] Run log appended: {log}")
    print("[monorepo-review-loop] Pass complete. Agent: run Phases 2-9 via the skill.")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Monorepo Review Loop runner")
    ap.add_argument("--once", action="store_true", help="single pass (default)")
    ap.add_argument("--loop", type=int, metavar="MINUTES",
                    help="repeat every N minutes (0 = run once and exit)")
    args = ap.parse_args(argv)

    if not args.loop or args.loop <= 0:
        return one_pass()

    interval = args.loop * 60
    print(f"[monorepo-review-loop] armed: every {args.loop} min. Ctrl-C to stop.")
    while True:
        one_pass()
        print(f"[monorepo-review-loop] sleeping {args.loop} min...")
        try:
            time.sleep(interval)
        except KeyboardInterrupt:
            print("\n[monorepo-review-loop] stopped by user.")
            return 0


if __name__ == "__main__":
    sys.exit(main())
