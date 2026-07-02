#!/usr/bin/env python3
"""Sync autoresearch_patch tasks from config/work_queue.json → data/autoresearch/queue.json."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
WORK_QUEUE = REPO / "config" / "work_queue.json"
AUTORESEARCH_QUEUE = REPO / "data" / "autoresearch" / "queue.json"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    wq = json.loads(WORK_QUEUE.read_text(encoding="utf-8"))
    ar = json.loads(AUTORESEARCH_QUEUE.read_text(encoding="utf-8")) if AUTORESEARCH_QUEUE.exists() else {"experiments": []}
    existing = {e.get("id") for e in ar.get("experiments", [])}
    added = []

    for t in wq.get("tasks", []):
        if t.get("automation") != "autoresearch_patch":
            continue
        if t.get("status") in ("done", "someday"):
            continue
        eid = t["id"]
        if eid in existing:
            continue
        ar.setdefault("experiments", []).append(
            {
                "id": eid,
                "agent": "cursor",
                "hypothesis": t["title"],
                "patch": t.get("patch", {}),
                "priority": t.get("priority", 50),
                "status": "pending",
                "workQueueRef": eid,
            }
        )
        added.append(eid)

    ar["syncedFrom"] = "config/work_queue.json"
    ar["syncedAt"] = datetime.now(timezone.utc).isoformat()

    if args.dry_run:
        print(json.dumps({"wouldAdd": added}, indent=2))
        return 0

    AUTORESEARCH_QUEUE.parent.mkdir(parents=True, exist_ok=True)
    AUTORESEARCH_QUEUE.write_text(json.dumps(ar, indent=2), encoding="utf-8")
    print(f"Added {len(added)} to {AUTORESEARCH_QUEUE}: {', '.join(added)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
