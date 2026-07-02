#!/usr/bin/env python3
"""Snapshot autoresearch_train.py before an agent edit (call before modifying train.py)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from autoresearch_utils import snapshot_train  # noqa: E402

if __name__ == "__main__":
    snapshot_train()
    print("[autoresearch] snapshot saved", flush=True)
