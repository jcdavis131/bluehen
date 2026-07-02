#!/usr/bin/env python3
"""
Agent workerbee loop — SkillOpt-style skill iteration on omni-market simulation.

Default: dry-run (propose edits only). Use --apply to write gated skill updates.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "omni-sim"))

from omni_sim import list_platforms, run_simulation  # noqa: E402

SKILL_PATH = ROOT / "config" / "omni-skills" / "best_skill.md"
BUFFER_PATH = ROOT / "data" / "omni" / "skill_edit_buffer.json"


def _baseline_sharpe() -> float:
    scores = []
    for plat in list_platforms():
        r = run_simulation(plat["id"])
        scores.append(r["penalizedSharpe"])
    return sum(scores) / len(scores) if scores else 0.0


def _propose_edit(skill: str) -> str:
    """Bounded add: append turnover note if missing."""
    line = "- SkillOpt: favor lower turnover when Sharpe delta < 0.1 (auto-proposed)\n"
    if "SkillOpt:" in skill:
        return skill
    return skill.rstrip() + "\n\n" + line


def main() -> int:
    p = argparse.ArgumentParser(description="Omni SkillOpt workerbee loop")
    p.add_argument("--iterations", type=int, default=1)
    p.add_argument("--apply", action="store_true", help="Apply gated skill edit")
    p.add_argument("--dry-run", action="store_true", default=True)
    args = p.parse_args()

    before = _baseline_sharpe()
    skill = SKILL_PATH.read_text(encoding="utf-8")
    proposed = _propose_edit(skill)

    results = {"baselinePenalizedSharpe": before, "iterations": []}
    for i in range(args.iterations):
        iteration = {"i": i + 1, "baseline": before}
        if args.apply:
            candidate = proposed
            SKILL_PATH.write_text(candidate, encoding="utf-8")
            after = _baseline_sharpe()
            if after >= before:
                iteration["action"] = "keep"
                iteration["after"] = after
            else:
                SKILL_PATH.write_text(skill, encoding="utf-8")
                iteration["action"] = "revert"
                iteration["after"] = before
        else:
            iteration["action"] = "dry-run"
            iteration["proposedEditPreview"] = proposed[-120:]
        results["iterations"].append(iteration)

    BUFFER_PATH.parent.mkdir(parents=True, exist_ok=True)
    BUFFER_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
