"""Champion snapshot / revert for autoresearch KEEP-DISCARD loop."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
TRAIN = REPO / "scripts" / "autoresearch_train.py"
CHAMPION = REPO / "data" / "autoresearch" / "champion_train.py"


def ensure_champion_exists() -> None:
    CHAMPION.parent.mkdir(parents=True, exist_ok=True)
    if not CHAMPION.exists() and TRAIN.exists():
        shutil.copy2(TRAIN, CHAMPION)


def revert_train(*, reason: str = "DISCARD") -> bool:
    """Restore train.py from last KEEP champion."""
    ensure_champion_exists()
    if CHAMPION.exists():
        shutil.copy2(CHAMPION, TRAIN)
        print(f"[autoresearch] reverted {TRAIN.name} <- champion ({reason})", flush=True)
        return True
    try:
        subprocess.run(
            ["git", "checkout", "--", "scripts/autoresearch_train.py"],
            cwd=REPO,
            check=True,
            capture_output=True,
            text=True,
        )
        print(f"[autoresearch] git reverted {TRAIN.name} ({reason})", flush=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[autoresearch] revert failed — no champion and git unavailable", flush=True)
        return False


def promote_train(*, reason: str = "KEEP") -> None:
    """Save current train.py as champion after KEEP."""
    CHAMPION.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(TRAIN, CHAMPION)
    print(f"[autoresearch] promoted champion ({reason})", flush=True)


def snapshot_train() -> None:
    """Alias: refresh champion from current train (manual baseline setup)."""
    promote_train(reason="manual-snapshot")
