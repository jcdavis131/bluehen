"""RDPIPE-002 (Spec 0023 §4): idle-time auto-probes of proposed hypotheses.

Picks the oldest `proposed` AR-5xx queue item whose lever maps to an
already-implemented harness method, runs a bounded 1-seed probe on the
research corpus (method vs champion barlow), and records the verdict in
the item's notes: PROBE-KEEP (method within noise of or above champion
-> promoted to `ready` for a full investigation) or PROBE-DISCARD.
Items with no runnable mapping stay `proposed` with an honest note.

Bounded: one probe per UTC day (guard file), ~10-15 min detached.
Usage: python scripts/autoresearch_auto.py [--dry-run] [--force]
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
QUEUE = REPO / "config" / "work_queue.json"
GUARD = REPO / "data" / "sweeps" / ".autoresearch_auto_day"
OUT = REPO / "data" / "sweeps" / "auto_probe.jsonl"
VENV_PY = REPO / "packages" / "asn-engine" / ".venv" / "Scripts" / "python.exe"
RUNNABLE = {"mrl": "mrl", "matryoshka": "mrl", "barlow": "barlow",
            "vicreg": "vicreg", "infonce": "infonce"}
CHAMPION = "barlow"


def pick(tasks: list[dict]) -> tuple[dict | None, str | None]:
    for t in tasks:
        if t.get("status") != "proposed" or not str(t.get("id", "")).startswith("AR-5"):
            continue
        blob = (t.get("title", "") + " " + t.get("notes", "")).lower()
        for kw, method in RUNNABLE.items():
            if kw in blob:
                return t, method
        t["notes"] = (t.get("notes") or "") + " [auto-probe: no runnable mapping — needs agent implementation]"
    return None, None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if GUARD.exists() and GUARD.read_text() == today and not args.force:
        print(f"auto-probe already ran {today} — once per day (use --force to override)")
        return 0

    queue = json.loads(QUEUE.read_text(encoding="utf-8"))
    item, method = pick(queue["tasks"])
    if item is None:
        print("no proposed AR-5xx item with a runnable mapping — nothing to probe")
        QUEUE.write_text(json.dumps(queue, indent=2), encoding="utf-8")
        return 0

    print(f"probing {item['id']} ({item['title'][:60]}) via method={method}")
    if args.dry_run:
        return 0

    GUARD.parent.mkdir(parents=True, exist_ok=True)
    GUARD.write_text(today)
    OUT.unlink(missing_ok=True)
    cmd = [str(VENV_PY), str(REPO / "scripts" / "realtext_methods.py"),
           "--corpus", str(REPO / "data" / "corpora" / "research" / "corpus.jsonl"),
           "--smoke", "--out", str(OUT)]
    # --smoke runs infonce by default; probe needs OUR method + champion.
    # realtext_methods reads env override for smoke methods when present.
    import os
    env = {**os.environ, "SMOKE_METHODS": f"{method},{CHAMPION}"}
    res = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=3600)
    if res.returncode != 0:
        item["notes"] = (item.get("notes") or "") + f" [auto-probe FAILED {today}: {res.stderr[-200:]}]"
        QUEUE.write_text(json.dumps(queue, indent=2), encoding="utf-8")
        print("probe run failed:", res.stderr[-400:])
        return 1

    rows = [json.loads(l) for l in OUT.read_text(encoding="utf-8").splitlines() if l.strip()]
    by = {r["method"]: r for r in rows if r.get("kind") == "trained"}
    if method not in by or CHAMPION not in by:
        item["notes"] = (item.get("notes") or "") + f" [auto-probe {today}: incomplete rows — inspect {OUT.name}]"
        QUEUE.write_text(json.dumps(queue, indent=2), encoding="utf-8")
        return 1

    m, c = by[method]["indomain"], by[CHAMPION]["indomain"]
    keep = m["ndcg_pairs"] >= c["ndcg_pairs"] - 0.01
    verdict = "PROBE-KEEP" if keep else "PROBE-DISCARD"
    item["notes"] = (item.get("notes") or "") + (
        f" [auto-probe {today}: {verdict} — {method} ndcg {m['ndcg_pairs']:.4f} "
        f"vs {CHAMPION} {c['ndcg_pairs']:.4f} (1-seed smoke; not evidence-grade)]")
    item["status"] = "ready" if keep else "done"
    QUEUE.write_text(json.dumps(queue, indent=2), encoding="utf-8")
    print(f"{item['id']}: {verdict} ({method} {m['ndcg_pairs']:.4f} vs {CHAMPION} {c['ndcg_pairs']:.4f})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
