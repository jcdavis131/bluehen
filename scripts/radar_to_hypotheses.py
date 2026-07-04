#!/usr/bin/env python3
"""RDPIPE-001 (Spec 0023 S4): deterministic radar -> hypothesis drafter.

Reads the literature radar's most recent output (data/literature/radar_latest.json,
falling back to the newest data/literature/radar_*.json by filename/mtime) and, using
ONLY deterministic keyword rules (no LLM), drafts up to 3 new "proposed" AR-5xx tasks
into config/work_queue.json for papers that map onto one of our four research levers:

  loss  : infonce, barlow, vicreg, mrl
  chunk : chunking, retrieval
  head  : projection, adapter(s), lora
  pairs : negative(s), mining

A paper matching none of the above is skipped (reported, not fabricated-around).

Usage:
  uv run python scripts/radar_to_hypotheses.py --dry-run
  uv run python scripts/radar_to_hypotheses.py
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LITERATURE_DIR = ROOT / "data" / "literature"
LATEST_JSON = LITERATURE_DIR / "radar_latest.json"
WORK_QUEUE = ROOT / "config" / "work_queue.json"

CAP_PER_RUN = 3

# Priority order matters: first matching lever wins for a given paper.
LEVER_RULES: list[tuple[str, list[str]]] = [
    ("loss", ["infonce", "barlow", "vicreg", "mrl", "matryoshka"]),
    ("chunk", ["chunking", "retrieval"]),
    ("head", ["projection", "adapter", "adapters", "lora"]),
    ("pairs", ["negative", "negatives", "mining"]),
]

ARXIV_ID_RE = re.compile(r"\b(\d{4}\.\d{4,5})(?:v\d+)?\b")


def find_radar_output() -> Path | None:
    """Locate the most recent radar output. Prefer radar_latest.json; else the
    newest dated radar_*.json in data/literature/ by filename (YYYYMMDD is sortable)."""
    if LATEST_JSON.exists():
        return LATEST_JSON
    if not LITERATURE_DIR.exists():
        return None
    candidates = sorted(LITERATURE_DIR.glob("radar_*.json"))
    return candidates[-1] if candidates else None


def classify_lever(title: str, summary: str) -> str | None:
    blob = f"{title} {summary}".lower()
    for lever, keywords in LEVER_RULES:
        for kw in keywords:
            if kw in blob:
                return lever
    return None


def existing_ar_ids(tasks: list[dict]) -> set[str]:
    return {t["id"] for t in tasks if isinstance(t.get("id"), str) and t["id"].startswith("AR-")}


def next_ar5xx_id(used: set[str]) -> str:
    n = 501
    while f"AR-{n}" in used:
        n += 1
    return f"AR-{n}"


def referenced_arxiv_ids(tasks: list[dict]) -> set[str]:
    """Dedupe key: any arXiv id already mentioned anywhere in any task's notes."""
    found: set[str] = set()
    for t in tasks:
        for field in ("notes", "note"):
            val = t.get(field)
            if isinstance(val, str):
                found.update(ARXIV_ID_RE.findall(val))
    return found


def hypothesis_line(lever: str) -> str:
    mechanism = {
        "loss": "the paper's loss-function mechanism",
        "chunk": "the paper's chunking/retrieval mechanism",
        "head": "the paper's projection/adapter mechanism",
        "pairs": "the paper's negative-mining mechanism",
    }[lever]
    return (
        f"Does {mechanism} improve ndcg_pairs/effRank on the research corpus "
        "under the head-only harness?"
    )


def build_candidates(digest: dict) -> tuple[list[dict], list[dict]]:
    """Return (lever_matched, skipped) paper dicts, each augmented with a 'lever' key
    (or None for skipped). lever_matched is ordered: flagged-for-review papers first
    (already novelty-flagged by the radar), then remaining lever matches, both by
    published date descending (most recent first) -- fully deterministic."""
    flagged_ids = {p["arxivId"] for p in digest.get("flagged", [])}
    matched: list[dict] = []
    skipped: list[dict] = []

    for p in digest.get("papers", []):
        lever = classify_lever(p.get("title", ""), p.get("summary", ""))
        if lever is None:
            skipped.append(p)
            continue
        entry = dict(p)
        entry["lever"] = lever
        entry["_flagged"] = p["arxivId"] in flagged_ids
        matched.append(entry)

    # Stable sorts: secondary key first (published desc), then primary key (flagged desc).
    matched.sort(key=lambda p: p.get("published", ""), reverse=True)
    matched.sort(key=lambda p: p["_flagged"], reverse=True)

    return matched, skipped


def main() -> int:
    parser = argparse.ArgumentParser(description="Draft proposed AR tasks from the literature radar")
    parser.add_argument("--dry-run", action="store_true", help="Print planned changes without writing")
    args = parser.parse_args()

    radar_path = find_radar_output()
    if radar_path is None:
        print(
            "No literature radar output found (checked data/literature/radar_latest.json "
            "and data/literature/radar_*.json). Run `pnpm literature:radar` first. "
            "Nothing to draft -- exiting cleanly."
        )
        return 0

    digest = json.loads(radar_path.read_text(encoding="utf-8"))
    papers = digest.get("papers", [])
    if not papers:
        print(f"Radar output {radar_path.name} contains 0 papers. Nothing to draft -- exiting cleanly.")
        return 0

    queue = json.loads(WORK_QUEUE.read_text(encoding="utf-8"))
    tasks = queue["tasks"]
    used_ids = existing_ar_ids(tasks)
    seen_arxiv_ids = referenced_arxiv_ids(tasks)

    matched, skipped = build_candidates(digest)

    new_tasks: list[dict] = []
    considered_but_deduped: list[str] = []
    for p in matched:
        if len(new_tasks) >= CAP_PER_RUN:
            break
        aid = p["arxivId"]
        if aid in seen_arxiv_ids:
            considered_but_deduped.append(aid)
            continue
        task_id = next_ar5xx_id(used_ids)
        used_ids.add(task_id)
        lever = p["lever"]
        link = p.get("pdfUrl") or f"https://arxiv.org/abs/{aid}"
        notes = (
            f"{p['title']} ({link}) -- lever: {lever}. {hypothesis_line(lever)}"
        )
        new_task = {
            "id": task_id,
            "division": "research",
            "title": f"[radar] {p['title'][:100]}",
            "status": "proposed",
            "lane": "claude",
            "spec": "0023",
            "notes": notes,
            "source": "scripts/radar_to_hypotheses.py",
        }
        new_tasks.append(new_task)
        seen_arxiv_ids.add(aid)

    print(f"Radar source: {radar_path.relative_to(ROOT)} (generated {digest.get('generatedAt', 'unknown')})")
    print(f"Papers in digest: {len(papers)} | lever-matched: {len(matched)} | skipped (no lever): {len(skipped)}")
    print()
    if new_tasks:
        verb = "Would add" if args.dry_run else "Adding"
        print(f"{verb} {len(new_tasks)} proposed task(s):")
        for t in new_tasks:
            print(f"  - {t['id']}: {t['notes']}")
    else:
        print("No new proposed tasks (no lever-matched papers left after dedup).")

    if considered_but_deduped:
        print()
        print(f"Skipped (already referenced by arXiv id in an existing task): {', '.join(considered_but_deduped)}")

    if skipped:
        print()
        print(f"Skipped -- no lever match ({len(skipped)}):")
        for p in skipped:
            print(f"  - {p['arxivId']}: {p['title']}")

    if args.dry_run:
        print()
        print("Dry run: no files written.")
        return 0

    if not new_tasks:
        return 0

    tasks.extend(new_tasks)
    WORK_QUEUE.write_text(json.dumps(queue, indent=2), encoding="utf-8")
    print()
    print(f"Wrote {len(new_tasks)} task(s) to {WORK_QUEUE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
