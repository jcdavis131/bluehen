#!/usr/bin/env python3
"""CLI entrypoint for omni-market paper simulation."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow running from repo root without install
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "omni-sim"))

from omni_sim import list_platforms, run_simulation  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Omni-market paper simulation (Spec 0013)")
    p.add_argument("--platform", "-p", default="kalshi", help="Platform id")
    p.add_argument("--strategy", "-s", default="baseline-momentum")
    p.add_argument("--corpus", default="omni-fixtures")
    p.add_argument("--skill", default=None, help="Path to skill markdown")
    p.add_argument("--list-platforms", action="store_true")
    args = p.parse_args()

    if args.list_platforms:
        print(json.dumps({"platforms": list_platforms()}, indent=2))
        return 0

    report = run_simulation(
        args.platform,
        strategy_id=args.strategy,
        corpus_id=args.corpus,
        skill_path=args.skill,
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
