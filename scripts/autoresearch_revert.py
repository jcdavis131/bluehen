#!/usr/bin/env python3
"""Revert autoresearch_train.py after DISCARD (hook + CLI entry)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from autoresearch_utils import revert_train  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reason", default="DISCARD")
    args = parser.parse_args()
    return 0 if revert_train(reason=args.reason) else 1


if __name__ == "__main__":
    raise SystemExit(main())
