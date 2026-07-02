#!/usr/bin/env python3
"""Build the Hub /research experiment museum index from real evidence files.

Scans declared evidence sources (EVIDENCE.md, SWEEP_REPORT.md, test files),
validates each experiment's reference exists, derives run counts where parseable,
and writes apps/sites/storefront/data/experiments.json consumed by the hub /research page.

Usage:
  uv run python scripts/build_experiment_index.py            # write JSON + print summary
  uv run python scripts/build_experiment_index.py --check    # validate refs without writing
  uv run python scripts/build_experiment_index.py --quiet    # only print on warnings/errors
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "sites" / "storefront" / "data" / "experiments.json"

# Editorial registry of museum entries. `ref` is the evidence anchor the script
# validates; `runs_hint` is a fallback when a count can't be parsed from source.
# verdict is the human-readable one-line outcome shown on the card.
REGISTRY: list[dict] = [
    {
        "id": "sweep-wave2-barlow",
        "title": "Wave 2 Bayesian arch search — Barlow leads",
        "verdict": "Barlow > VICReg on robust_score",
        "ref": "SWEEP_REPORT.md",
        "runs_hint": 891,
    },
    {
        "id": "family-c-realtext",
        "title": "Family C real-text domain tune",
        "verdict": "InfoNCE + VICReg neutral; +~3% in-domain",
        "ref": "EVIDENCE.md#3.6",
        "runs_hint": 48,
    },
    {
        "id": "tenant-baseline-bge",
        "title": "Tenant vs BGE zero-shot",
        "verdict": "4/4 sites win in-domain",
        "ref": "EVIDENCE.md#3.7",
        "runs_hint": 4,
    },
    {
        "id": "serving-tiers",
        "title": "MRL + int8 two-tier serving",
        "verdict": "int8 lossless; MRL = truncation lever",
        "ref": "services/core-api/tests/test_serving_tiers.py",
        "runs_hint": 10,
    },
]

TRIALS_RE = re.compile(r"\b(\d+)\s*(?:trials|runs|evals)\b", re.IGNORECASE)
# Matches a markdown section header like "### 3.6 ..." or "## 2 ...".
MD_HEADER_RE = re.compile(r"^(#{1,6})\s+(\S.*)$", re.MULTILINE)


def _safe_print(text: str) -> None:
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode("ascii", "replace").decode())


def _resolve_ref(ref: str) -> Path | None:
    """Resolve a registry ref to a concrete file path, or None if unresolvable."""
    file_part = ref.split("#", 1)[0]
    p = ROOT / file_part
    return p if p.exists() else None


def _slice_markdown_section(text: str, anchor: str) -> str:
    """Return only the text under a markdown section anchor like '3.6'.

    Matches a header line whose title starts with the anchor (e.g. '### 3.6 ...').
    Returns the body from that header until the next header of the same or
    shallower depth. If no matching header is found, returns empty string so the
    caller falls back to the curated runs_hint rather than scanning the whole file.
    """
    target = anchor.strip()
    lines = text.splitlines()
    start: int | None = None
    start_depth: int | None = None
    for i, line in enumerate(lines):
        m = MD_HEADER_RE.match(line)
        if not m:
            continue
        depth = len(m.group(1))
        title = m.group(2).strip()
        if start is None:
            if title.startswith(target):
                start, start_depth = i, depth
        elif depth <= start_depth:  # same/shallower header ends the section
            return "\n".join(lines[start:i])
    if start is None:
        return ""
    return "\n".join(lines[start:])


def _parse_runs(ref: str, ref_path: Path) -> int | None:
    """Best-effort parse of a run/trial count from a text evidence file.

    If `ref` carries a '#section' anchor, only that markdown section is scanned
    so counts from unrelated sections don't leak in. Without an anchor, the whole
    file is scanned and the largest count is taken (sweep reports headline totals).
    """
    try:
        text = ref_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    if "#" in ref:
        anchor = ref.split("#", 1)[1]
        text = _slice_markdown_section(text, anchor)
        if not text:
            return None
    matches = TRIALS_RE.findall(text)
    if not matches:
        return None
    return max(int(m) for m in matches)


def _build_entries(
    registry: Iterable[dict], *, check_only: bool, quiet: bool
) -> tuple[list[dict], list[str]]:
    entries: list[dict] = []
    warnings: list[str] = []
    for item in registry:
        path = _resolve_ref(item["ref"])
        if path is None:
            warnings.append(f"{item['id']}: missing evidence ref '{item['ref']}' — skipped")
            continue
        runs = _parse_runs(item["ref"], path) if path.is_file() else None
        if runs is None:
            runs = item.get("runs_hint")
        entries.append(
            {
                "id": item["id"],
                "title": item["title"],
                "runs": runs if isinstance(runs, int) else 0,
                "verdict": item["verdict"],
                "ref": item["ref"],
            }
        )
    return entries, warnings


def main() -> int:
    ap = argparse.ArgumentParser(description="Build hub /research experiment museum index.")
    ap.add_argument("--check", action="store_true", help="validate refs only; do not write JSON")
    ap.add_argument("--quiet", action="store_true", help="suppress summary on success")
    args = ap.parse_args()

    entries, warnings = _build_entries(REGISTRY, check_only=args.check, quiet=args.quiet)

    if warnings:
        for w in warnings:
            _safe_print(f"WARNING: {w}")

    if args.check:
        _safe_print(f"check: {len(entries)} valid entries, {len(warnings)} warning(s)")
        return 1 if warnings else 0

    if not entries:
        _safe_print("ERROR: no valid entries to write; refusing to overwrite index.")
        return 1

    payload = {
        "version": 1,
        "updated": date.today().isoformat(),
        "experiments": entries,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    if not args.quiet or warnings:
        _safe_print(
            f"wrote {OUT.relative_to(ROOT)} — {len(entries)} entries, "
            f"{len(warnings)} warning(s), updated {payload['updated']}"
        )
    return 1 if warnings else 0


if __name__ == "__main__":
    raise SystemExit(main())
