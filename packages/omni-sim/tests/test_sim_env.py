import pytest

from omni_sim.platforms import get_platform, list_platforms
from omni_sim.sim_env import run_simulation


def test_list_platforms_includes_kalshi():
    ids = {p["id"] for p in list_platforms()}
    assert "kalshi" in ids
    assert "prizepicks" in ids


def test_simulation_mode_and_sharpe():
    report = run_simulation("kalshi", strategy_id="test")
    assert report["mode"] == "simulation"
    assert "sharpe" in report
    assert report["tradeCount"] >= 1
    assert report["platformRulesApplied"]


def test_live_capital_blocked():
    with pytest.raises(PermissionError):
        run_simulation("kalshi", live_capital=True)


def test_unknown_platform():
    with pytest.raises(ValueError):
        get_platform("not-a-platform")
