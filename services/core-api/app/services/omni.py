"""Omni-market simulation API service."""

from __future__ import annotations

from typing import Any

from omni_sim.platforms import list_platforms
from omni_sim.sim_env import run_simulation


def simulate(
    platform_id: str,
    *,
    strategy_id: str = "baseline-momentum",
    corpus_id: str = "omni-fixtures",
    skill_path: str | None = None,
    live_capital: bool = False,
) -> dict[str, Any]:
    try:
        return run_simulation(
            platform_id,
            strategy_id=strategy_id,
            corpus_id=corpus_id,
            skill_path=skill_path,
            live_capital=live_capital,
        )
    except PermissionError as e:
        raise ValueError(str(e)) from e


def platforms() -> dict[str, Any]:
    return {"platforms": list_platforms(), "mode": "simulation"}
