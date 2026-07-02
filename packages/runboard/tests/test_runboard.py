import numpy as np
import pytest

from runboard.run import init
from runboard.store import RunStore
from runboard.telemetry import RankMonitor, effective_rank, r2d_curvature


@pytest.fixture()
def store(tmp_path):
    return RunStore(tmp_path / "runs")


def test_run_roundtrip(store):
    run = init("proj", name="unit test", config={"lr": 1e-3}, tags=["t"], store=store)
    run.log({"loss": 1.0}, step=0)
    run.log({"loss": 0.5, "asn/effective_rank": 30.0}, step=1)
    run.log_event("surgery", "triggered", {"tier": 1})
    run.finish()

    manifest = store.get_manifest(run.run_id)
    assert manifest["status"] == "finished"
    assert manifest["summary"]["loss"] == 0.5
    assert manifest["config"]["lr"] == 1e-3

    rows = store.get_metrics(run.run_id)
    assert [r["step"] for r in rows] == [0, 1]
    events = store.get_events(run.run_id)
    assert events[0]["kind"] == "surgery"


def test_metrics_tail_pagination(store):
    run = init("proj", store=store)
    for i in range(10):
        run.log({"x": i}, step=i)
    tail = store.get_metrics(run.run_id, after=7)
    assert [r["metrics"]["x"] for r in tail] == [7, 8, 9]


def test_invalid_run_id_rejected(store):
    with pytest.raises(ValueError):
        store.get_manifest("../escape")


def test_effective_rank_full_vs_collapsed():
    rng = np.random.default_rng(0)
    full = rng.normal(size=(200, 32))
    collapsed = np.outer(rng.normal(size=200), rng.normal(size=32))
    assert effective_rank(full) > 25.0
    assert effective_rank(collapsed) < 2.0


def test_r2d_curvature_flat_region_is_zero():
    assert r2d_curvature([10, 10, 10, 10]) == [0.0, 0.0]
    assert r2d_curvature([1, 2]) == []


def test_rank_monitor_alerts():
    alerts = []
    mon = RankMonitor(floor=12.0, drop_ratio=0.5, on_alert=alerts.append)
    for r in [40, 41, 39, 40]:
        assert mon.update(r) is None
    assert mon.update(15)["reason"] == "sharp_drop"
    assert mon.update(5)["reason"] == "below_floor"
    assert len(alerts) == 2
