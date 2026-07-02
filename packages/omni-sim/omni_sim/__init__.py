"""Omni-market simulation — paper trading across prediction markets, DFS, and brokerage."""

from omni_sim.platforms import get_platform, list_platforms
from omni_sim.sim_env import run_simulation
from omni_sim.smart_search import smart_search

__all__ = ["get_platform", "list_platforms", "run_simulation", "smart_search"]
