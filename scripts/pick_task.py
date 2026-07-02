#!/usr/bin/env python3
"""Unified work queue — any agent picks, claims, completes tasks.

Source of truth: config/work_queue.json
Human index: TASKS.md (run with --render to refresh summary sections)

  uv run python scripts/pick_task.py list              # ready tasks
  uv run python scripts/pick_task.py list --all       # include blocked
  uv run python scripts/pick_task.py claim W-042       # mark in_progress
  uv run python scripts/pick_task.py done W-042        # mark done
  uv run python scripts/pick_task.py blockers          # why things are stuck
  uv run python scripts/pick_task.py sync-autoresearch # push autoresearch items → queue.json
  uv run python scripts/pick_task.py render            # update TASKS.md snapshot
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
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
TASKS_MD = REPO / "TASKS.md"
AUTORESEARCH_QUEUE = REPO / "data" / "autoresearch" / "queue.json"


def load() -> dict:
    return json.loads(QUEUE_PATH.read_text(encoding="utf-8"))


def save(data: dict) -> None:
    data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    QUEUE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def blocker_ids(data: dict) -> set[str]:
    return {b["id"] for b in data.get("blockers", []) if b.get("active", True)}


def is_blocked(task: dict, active_blockers: set[str], all_tasks: list[dict]) -> bool:
    if task.get("status") in ("done", "automated", "someday"):
        return False
    for bid in task.get("blockedBy", []):
        if bid in active_blockers:
            return True
    for dep in task.get("dependsOn", []):
        dep_task = next((t for t in all_tasks if t["id"] == dep), None)
        if dep_task and dep_task.get("status") != "done":
            return True
    return False


def data_tasks(data: dict) -> list[dict]:
    return data.get("tasks", [])


def cmd_blockers() -> int:
    data = load()
    bl = blocker_ids(data)
    tasks = data_tasks(data)
    print("ACTIVE BLOCKERS\n")
    for b in data.get("blockers", []):
        if not b.get("active", True):
            continue
        print(f"  {b['id']}: {b['title']}")
        print(f"    Why: {b['why']}")
        print(f"    Unblock: {b['unblock']}")
        print(f"    Blocks: {', '.join(b.get('blocksTasks', []))}\n")
    ready = [t for t in data_tasks(data) if t.get("status") == "ready" and not is_blocked(t, bl, data_tasks(data))]
    print(f"READY NOW ({len(ready)} tasks) — no infra blocker:")
    for t in ready[:15]:
        print(f"  {t['id']} [{t.get('division')}] {t['title']}")
    return 0


def cmd_list(all_tasks: bool) -> int:
    data = load()
    bl = blocker_ids(data)
    for t in sorted(data_tasks(data), key=lambda x: (x.get("priority", 99), x["id"])):
        status = t.get("status", "ready")
        blocked = is_blocked(t, bl, data_tasks(data)) and status not in ("done", "automated")
        if not all_tasks and blocked and status == "ready":
            status = "blocked"
        if not all_tasks and status in ("done", "someday", "automated"):
            continue
        tag = status
        if t.get("claimedBy"):
            tag += f" @{t['claimedBy']}"
        spec = f" spec:{t['spec']}" if t.get("spec") else ""
        print(f"{t['id']:10} {tag:12} [{t.get('division', '?'):10}] {t['title']}{spec}")
        if t.get("command"):
            print(f"             -> {t['command']}")
    return 0


def cmd_claim(task_id: str, agent: str) -> int:
    data = load()
    for t in data_tasks(data):
        if t["id"] == task_id:
            t["status"] = "in_progress"
            t["claimedBy"] = agent
            t["claimedAt"] = datetime.now(timezone.utc).isoformat()
            save(data)
            print(f"claimed {task_id} by {agent}")
            return 0
    print(f"task not found: {task_id}", file=sys.stderr)
    return 1


def cmd_done(task_id: str) -> int:
    data = load()
    for t in data_tasks(data):
        if t["id"] == task_id:
            t["status"] = "done"
            t["completedAt"] = datetime.now(timezone.utc).isoformat()
            save(data)
            print(f"done {task_id}")
            return 0
    print(f"task not found: {task_id}", file=sys.stderr)
    return 1


def cmd_sync_autoresearch() -> int:
    data = load()
    ar = json.loads(AUTORESEARCH_QUEUE.read_text(encoding="utf-8")) if AUTORESEARCH_QUEUE.exists() else {"experiments": []}
    existing = {e.get("id") for e in ar.get("experiments", [])}
    added = []
    for t in data_tasks(data):
        if t.get("automation") != "autoresearch_patch":
            continue
        if t.get("status") in ("done", "someday"):
            continue
        eid = t["id"]
        if eid in existing:
            continue
        exp = {
            "id": eid,
            "agent": "cursor",
            "hypothesis": t["title"],
            "patch": t.get("patch", {}),
            "priority": t.get("priority", 50),
            "status": "pending",
            "workQueueRef": eid,
        }
        ar.setdefault("experiments", []).append(exp)
        added.append(eid)
    ar["syncedFrom"] = "config/work_queue.json"
    ar["syncedAt"] = datetime.now(timezone.utc).isoformat()
    AUTORESEARCH_QUEUE.parent.mkdir(parents=True, exist_ok=True)
    AUTORESEARCH_QUEUE.write_text(json.dumps(ar, indent=2), encoding="utf-8")
    print(f"synced {len(added)} autoresearch experiments: {', '.join(added)}")
    return 0


def cmd_render() -> int:
    data = load()
    bl = blocker_ids(data)
    tasks = data_tasks(data)
    ready = [t for t in tasks if t.get("status") == "ready" and not is_blocked(t, bl, tasks)]
    in_prog = [t for t in tasks if t.get("status") == "in_progress"]
    blocked = [t for t in tasks if is_blocked(t, bl, tasks) and t.get("status") not in ("done", "someday")]
    done_recent = [t for t in tasks if t.get("status") == "done"][-8:]

    lines = [
        "# Tasks",
        "",
        f"> Blue Hen RE · **Source of truth:** [`config/work_queue.json`](./config/work_queue.json) · "
        f"Updated: {data.get('updated', '?')}",
        "",
        "**Any agent:** `uv run python scripts/pick_task.py list` → `claim` → work → `done`",
        "",
        "## Why blocked?",
        "",
    ]
    for b in data.get("blockers", []):
        if not b.get("active", True):
            continue
        lines.append(f"### {b['id']}: {b['title']}")
        lines.append(f"- **Why:** {b['why']}")
        lines.append(f"- **Unblock:** {b['unblock']}")
        lines.append("")

    lines += ["## Ready now (pick any)", ""]
    for t in ready[:20]:
        spec = f" · spec [{t['spec']}](./specs/{t['spec']}-*.md)" if t.get("spec") else ""
        lines.append(f"- [ ] **{t['id']}** — {t['title']} ({t.get('division')}){spec}")
        if t.get("command"):
            lines.append(f"  - `{t['command']}`")

    lines += ["", "## In progress", ""]
    if in_prog:
        for t in in_prog:
            lines.append(f"- [ ] **{t['id']}** — {t['title']} (@{t.get('claimedBy', '?')})")
    else:
        lines.append("_None claimed — run `pick_task.py claim <id>`_")

    lines += ["", "## Blocked on infra (work elsewhere)", ""]
    for t in blocked[:12]:
        lines.append(f"- [ ] **{t['id']}** — {t['title']} · blockedBy: {t.get('blockedBy', t.get('dependsOn', []))}")

    lines += ["", "## Recently done", ""]
    for t in done_recent:
        lines.append(f"- [x] ~~**{t['id']}** — {t['title']}~~")

    lines += [
        "",
        "## Specs & context",
        "",
        "| Doc | Role |",
        "|---|---|",
        "| [`specs/README.md`](./specs/README.md) | Spec status matrix |",
        "| [`HANDOFF.md`](./HANDOFF.md) | Mission + repo map |",
        "| [`program.md`](./program.md) | Autoresearch rules |",
        "| [`docs/EXECUTIVE_ROADMAP.md`](./docs/EXECUTIVE_ROADMAP.md) | Stakeholder view |",
        "",
        "_Regenerate: `uv run python scripts/pick_task.py render`_",
    ]

    TASKS_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {TASKS_MD}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Unified work queue")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("blockers", help="Show active blockers")
    p_list = sub.add_parser("list", help="List tasks")
    p_list.add_argument("--all", action="store_true")
    p_claim = sub.add_parser("claim", help="Claim a task")
    p_claim.add_argument("id")
    p_claim.add_argument("--agent", default="cursor")
    p_done = sub.add_parser("done", help="Mark task done")
    p_done.add_argument("id")
    sub.add_parser("sync-autoresearch", help="Sync autoresearch patches to queue.json")
    sub.add_parser("render", help="Regenerate TASKS.md from work_queue.json")

    args = parser.parse_args()
    if args.cmd == "blockers":
        return cmd_blockers()
    if args.cmd == "list":
        return cmd_list(args.all)
    if args.cmd == "claim":
        return cmd_claim(args.id, args.agent)
    if args.cmd == "done":
        return cmd_done(args.id)
    if args.cmd == "sync-autoresearch":
        return cmd_sync_autoresearch()
    if args.cmd == "render":
        return cmd_render()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
