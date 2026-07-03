#!/usr/bin/env python3
"""Fleet loop driver — cursor-lane task coordinator.

Loops claim -> handoff -> verify-gate -> done -> render until the cursor lane
has no actionable tasks left. The loop is the coordinator; the implementing
agent (Cursor, in-session) does the file edits between ticks.

Each `--once` tick either:
  - verifies the in_progress cursor-lane task and marks done + renders, OR
  - claims the next actionable cursor-lane candidate and prints a handoff, OR
  - reports "no ready cursor-lane tasks" and exits 0.

Usage:
  uv run python scripts/fleet_loop.py --once          # one tick
  uv run python scripts/fleet_loop.py --status        # board snapshot
  uv run python scripts/fleet_loop.py --verify SITE-016  # run a task's gate
  uv run python scripts/fleet_loop.py --daemon --sleep 60  # unattended (not used in-session)

Source of truth: config/work_queue.json
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

if sys.platform == "win32":
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass

REPO = Path(__file__).resolve().parents[1]
QUEUE_PATH = REPO / "config" / "work_queue.json"
PICK_TASK = REPO / "scripts" / "pick_task.py"
STATE_PATH = REPO / "data" / "fleet" / "loop_state.json"
LOG_PATH = REPO / "data" / "fleet" / "loop.log"
EVENTS_PATH = REPO / "data" / "fleet" / "loop_events.jsonl"

CURSOR_DIVISIONS = {"comms", "infra", "execution", "agent"}
NON_CURSOR_PREFIXES = ("AR-", "RT-", "RAG-", "DATA-")

# Manual operator tasks the loop cannot execute (require human/Docker restart).
# These stay in the queue but are excluded from auto-claim.
MANUAL_OPERATOR_IDS = {"INF-000"}

# Site homepages the SITE-016 spine must reach (storefront already done in SITE-015).
SITE_016_HOMEPAGES = [
    REPO / "apps" / "hq" / "app" / "page.tsx",
    REPO / "apps" / "sites" / "dumbmodel" / "app" / "page.tsx",
    REPO / "apps" / "sites" / "validation" / "app" / "page.tsx",
    REPO / "apps" / "sites" / "research" / "app" / "page.tsx",
    REPO / "apps" / "sites" / "observatory" / "app" / "page.tsx",
    REPO / "apps" / "sites" / "simulation" / "app" / "page.tsx",
]

VOICE_LINT_PATTERNS = ["sports metaphor", "game-changer", "winning", "champions"]


def log(msg: str) -> None:
    safe = msg.encode("ascii", "replace").decode("ascii")
    line = f"{datetime.now(timezone.utc).isoformat()} {safe}"
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line, flush=True)


def log_event(payload: dict) -> None:
    EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    entry = {"ts": datetime.now(timezone.utc).isoformat(), **payload}
    with EVENTS_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def load_state() -> dict:
    default = {
        "ticks": 0,
        "lastTask": None,
        "lastTick": None,
        "startedAt": datetime.now(timezone.utc).isoformat(),
    }
    if STATE_PATH.exists():
        return {**default, **json.loads(STATE_PATH.read_text(encoding="utf-8"))}
    return default


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def load_queue() -> dict:
    return json.loads(QUEUE_PATH.read_text(encoding="utf-8"))


def save_queue(data: dict) -> None:
    data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    QUEUE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def active_blocker_ids(data: dict) -> set[str]:
    return {b["id"] for b in data.get("blockers", []) if b.get("active", True)}


def is_cursor_lane(task: dict) -> bool:
    if task["id"] in MANUAL_OPERATOR_IDS:
        return False
    lane = task.get("lane")
    if lane in ("claude", "opencode"):
        return False
    if lane == "cursor":
        return True
    tid = task["id"]
    if tid.startswith(NON_CURSOR_PREFIXES):
        return False
    division = task.get("division", "")
    if division == "bd":
        return False
    return division in CURSOR_DIVISIONS


def deps_satisfied(task: dict, all_tasks: list[dict]) -> bool:
    by_id = {t["id"]: t for t in all_tasks}
    for dep in task.get("dependsOn", []):
        dep_task = by_id.get(dep)
        if dep_task and dep_task.get("status") != "done":
            return False
    return True


def is_actionable(task: dict, blockers: set[str], all_tasks: list[dict]) -> bool:
    status = task.get("status", "ready")
    if status in ("done", "someday", "automated"):
        return False
    for bid in task.get("blockedBy", []):
        if bid in blockers:
            return False
    return deps_satisfied(task, all_tasks)


def cursor_candidates(data: dict) -> list[dict]:
    blockers = active_blocker_ids(data)
    tasks = data.get("tasks", [])
    return [
        t for t in tasks
        if is_cursor_lane(t) and is_actionable(t, blockers, tasks)
        and t.get("status") in ("ready", "blocked", "in_progress")
    ]


def priority_key(task: dict) -> int:
    try:
        return int(task.get("priority", 99))
    except (TypeError, ValueError):
        return 99


def find_in_progress(candidates: list[dict]) -> dict | None:
    for t in candidates:
        if t.get("status") == "in_progress":
            return t
    return None


def normalize_status(task: dict, data: dict) -> bool:
    """Flip a dep-satisfied task labelled `blocked` (or other non-ready) to
    `ready` so pick_task.py claim accepts it. Returns True if changed."""
    if task.get("status") == "ready":
        return False
    task["status"] = "ready"
    save_queue(data)
    log(f"normalized {task['id']} status -> ready (deps satisfied)")
    return True


def run(cmd: list[str], *, timeout: int = 600, shell: bool = False) -> tuple[int, str]:
    try:
        p = subprocess.run(
            cmd,
            cwd=REPO,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=shell,
        )
        return p.returncode, (p.stdout + p.stderr).strip()
    except subprocess.TimeoutExpired:
        return 124, "TIMEOUT"
    except FileNotFoundError:
        return 127, f"command not found: {cmd[0]}"


def pick_task_cmd(args: list[str], *, timeout: int = 90) -> tuple[int, str]:
    return run(["uv", "run", "--no-sync", "python", str(PICK_TASK), *args], timeout=timeout)


def gate_pnpm_review() -> tuple[bool, str]:
    rc, out = run(["pnpm", "review"], timeout=900, shell=(os.name == "nt"))
    return rc == 0, out


def gate_axis_present() -> tuple[bool, str]:
    missing = []
    for p in SITE_016_HOMEPAGES:
        if not p.exists():
            missing.append(str(p.relative_to(REPO)))
            continue
        text = p.read_text(encoding="utf-8")
        if "<Axis" not in text or "<StatusLine" not in text or "<TitleCard" not in text:
            missing.append(str(p.relative_to(REPO)))
    if missing:
        return False, "spine missing in: " + ", ".join(missing)
    return True, "spine present in all 6 homepages"


def gate_site_016() -> tuple[bool, str]:
    ok_spine, msg_spine = gate_axis_present()
    if not ok_spine:
        return False, msg_spine
    ok_rev, msg_rev = gate_pnpm_review()
    if not ok_rev:
        return False, f"pnpm review failed\n{msg_rev[-2000:]}"
    return True, "pnpm review green + spine present"


def gate_check_tastemaker() -> tuple[bool, str]:
    script = REPO / "scripts" / "check-tastemaker.mjs"
    if not script.exists():
        return False, f"scripts/check-tastemaker.mjs not authored yet ({script})"
    rc, out = run(["node", str(script)], timeout=120)
    return rc == 0, out[-2000:]


def gate_voice_lint() -> tuple[bool, str]:
    hits = []
    for pat in VOICE_LINT_PATTERNS:
        rc, out = run(
            ["rg", "-n", "-i", pat, "apps/sites", "apps/hq"],
            timeout=60,
        )
        if rc == 0 and out.strip():
            hits.append(f"[{pat}]\n{out[:500]}")
    if hits:
        return False, "voice lint hits:\n" + "\n".join(hits)
    ok_rev, msg_rev = gate_pnpm_review()
    if not ok_rev:
        return False, f"pnpm review failed\n{msg_rev[-2000:]}"
    return True, "pnpm review green + voice lint clean"


def gate_site_019() -> tuple[bool, str]:
    ok_rev, msg_rev = gate_pnpm_review()
    if not ok_rev:
        return False, f"pnpm review failed\n{msg_rev[-2000:]}"
    ok_tst, msg_tst = gate_check_tastemaker()
    if not ok_tst:
        return False, f"check-tastemaker.mjs failed\n{msg_tst[-1500:]}"
    return True, "pnpm review + check-tastemaker green — Operator visual sign-off pending"


GATES: dict[str, callable] = {
    "SITE-016": gate_site_016,
    "SITE-017": gate_check_tastemaker,
    "SITE-018": gate_voice_lint,
    "SITE-019": gate_site_019,
}


def run_gate(task_id: str) -> tuple[bool, str]:
    gate = GATES.get(task_id, gate_pnpm_review)
    return gate()


def handoff(task: dict) -> int:
    spec = task.get("spec")
    spec_link = f"specs/{spec}-*.md" if spec else "(no spec)"
    print()
    print("=" * 72)
    print(f"  HANDOFF — {task['id']}: {task['title']}")
    print("=" * 72)
    print(f"  division : {task.get('division')}")
    print(f"  spec     : {spec_link}")
    print(f"  command  : {task.get('command', '(none)')}")
    if task.get("acceptance"):
        print(f"  accept   : {task['acceptance']}")
    print(f"  gate     : {GATES.get(task['id'], gate_pnpm_review).__name__}")
    print()
    print("  Implement the file changes, then re-run:")
    print(f"    uv run python scripts/fleet_loop.py --once")
    print("  The loop will run the verification gate and mark done if it passes.")
    print("=" * 72)
    log_event({"task": task["id"], "action": "handoff", "result": "claimed"})
    return 0


def cmd_once(state: dict) -> int:
    data = load_queue()
    candidates = cursor_candidates(data)
    in_prog = find_in_progress(candidates)

    if in_prog:
        tid = in_prog["id"]
        log(f"verify in_progress: {tid}")
        ok, msg = run_gate(tid)
        if ok:
            rc, _ = pick_task_cmd(["done", tid])
            log(f"gate PASS — done {tid}")
            log_event({"task": tid, "action": "verify", "result": "pass"})
            pick_task_cmd(["render"])
            state["lastTask"] = tid
            state["lastTick"] = datetime.now(timezone.utc).isoformat()
            state["ticks"] = state.get("ticks", 0) + 1
            save_state(state)
            print(msg)
            return 0
        log(f"gate FAIL — {tid}\n{msg[:600]}")
        log_event({"task": tid, "action": "verify", "result": "fail", "detail": msg[:400]})
        print(f"gate failed for {tid}:\n{msg}")
        return 1

    actionable = sorted(
        [t for t in candidates if t.get("status") in ("ready", "blocked")],
        key=lambda t: (priority_key(t), t["id"]),
    )
    if not actionable:
        log("no ready cursor-lane tasks")
        log_event({"task": None, "action": "idle", "result": "no-candidates"})
        print("no ready cursor-lane tasks (non-Docker scope)")
        return 0

    task = actionable[0]
    normalize_status(task, data)
    rc, out = pick_task_cmd(["claim", task["id"], "--agent", "cursor"])
    if rc != 0:
        log(f"claim failed for {task['id']}: {out}")
        return 1
    log(f"claimed {task['id']}")
    state["lastTask"] = task["id"]
    state["lastTick"] = datetime.now(timezone.utc).isoformat()
    state["ticks"] = state.get("ticks", 0) + 1
    save_state(state)
    return handoff(task)


def cmd_status() -> int:
    data = load_queue()
    candidates = cursor_candidates(data)
    state = load_state()
    blockers = active_blocker_ids(data)

    print(f"fleet loop state: ticks={state.get('ticks', 0)} lastTask={state.get('lastTask')}")
    print(f"active blockers: {sorted(blockers) or '(none)'}")
    print()
    in_prog = find_in_progress(candidates)
    if in_prog:
        print(f"IN PROGRESS: {in_prog['id']} — {in_prog['title']}")
        print(f"  gate: {GATES.get(in_prog['id'], gate_pnpm_review).__name__}")
        print(f"  re-run: uv run python scripts/fleet_loop.py --once")
    else:
        print("IN PROGRESS: (none)")
    print()

    actionable = sorted(
        [t for t in candidates if t.get("status") in ("ready", "blocked")],
        key=lambda t: (priority_key(t), t["id"]),
    )
    print(f"READY CURSOR-LANE CANDIDATES ({len(actionable)}):")
    if not actionable:
        print("  (none — non-Docker scope is empty)")
    for t in actionable:
        spec = f" spec:{t['spec']}" if t.get("spec") else ""
        flagged = " [status=blocked, deps satisfied — will normalize]" if t.get("status") == "blocked" else ""
        print(f"  {t['id']:10} pri={priority_key(t):3} [{t.get('division', '?'):10}] {t['title']}{spec}{flagged}")

    mislabelled = [t for t in data.get("tasks", [])
                   if is_cursor_lane(t) and t.get("status") == "blocked"
                   and deps_satisfied(t, data.get("tasks", []))
                   and not any(b in blockers for b in t.get("blockedBy", []))]
    if mislabelled:
        print()
        print("DEP-SATISFIED BUT MISLABELLED `blocked` (loop will normalize on claim):")
        for t in mislabelled:
            print(f"  {t['id']:10} {t['title']}")
    return 0


def cmd_verify(task_id: str) -> int:
    log(f"manual verify: {task_id}")
    ok, msg = run_gate(task_id)
    if ok:
        log(f"manual verify PASS — {task_id}")
        log_event({"task": task_id, "action": "manual-verify", "result": "pass"})
        print(f"gate PASS for {task_id}")
        print(msg)
        return 0
    log(f"manual verify FAIL — {task_id}")
    log_event({"task": task_id, "action": "manual-verify", "result": "fail", "detail": msg[:400]})
    print(f"gate FAIL for {task_id}:\n{msg}")
    return 1


def cmd_daemon(state: dict, sleep_s: int) -> int:
    log(f"fleet loop daemon armed — sleep={sleep_s}s. Ctrl-C to stop.")
    while True:
        try:
            cmd_once(state)
        except KeyboardInterrupt:
            log("daemon stopped by user")
            return 0
        time.sleep(sleep_s)


def main() -> int:
    ap = argparse.ArgumentParser(description="Fleet loop driver — cursor-lane coordinator")
    ap.add_argument("--once", action="store_true", help="single tick: verify in_progress OR claim+handoff")
    ap.add_argument("--daemon", action="store_true", help="loop forever with --sleep")
    ap.add_argument("--sleep", type=int, default=60, help="seconds between ticks (daemon)")
    ap.add_argument("--status", action="store_true", help="print board snapshot and exit")
    ap.add_argument("--verify", metavar="ID", help="run a task's verification gate and exit")
    args = ap.parse_args()

    if args.status:
        return cmd_status()
    if args.verify:
        return cmd_verify(args.verify)

    state = load_state()
    if args.daemon:
        return cmd_daemon(state, args.sleep)
    return cmd_once(state)


if __name__ == "__main__":
    raise SystemExit(main())
