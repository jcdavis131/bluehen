"""Load RootMem-style platform registry."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
PLATFORMS_PATH = REPO_ROOT / "config" / "market-platforms.json"


@lru_cache(maxsize=1)
def _load_registry() -> dict[str, Any]:
    data = json.loads(PLATFORMS_PATH.read_text(encoding="utf-8"))
    return {p["id"]: p for p in data.get("platforms", [])}


def list_platforms() -> list[dict[str, Any]]:
    return list(_load_registry().values())


def get_platform(platform_id: str) -> dict[str, Any]:
    reg = _load_registry()
    if platform_id not in reg:
        raise ValueError(f"unknown platform: {platform_id}")
    return reg[platform_id]


def applied_rule_ids(platform: dict[str, Any]) -> list[str]:
    return [u["id"] for u in platform.get("rootMemoryUnits", []) if "id" in u]
