"""Telemetry endpoints: /v1/runs and /v1/datalab/datasets."""

import pytest

from app.services import telemetry


@pytest.fixture()
def run_store(tmp_path, monkeypatch):
    from runboard.store import RunStore

    store = RunStore(tmp_path / "runs")
    monkeypatch.setattr(telemetry, "_store", store)
    return store


def _seed_run(store):
    from runboard.run import init

    run = init("autoresearch", name="seed", config={"lr": 1e-3}, store=store)
    run.log({"loss": 1.0, "asn/effective_rank": 30.0}, step=0)
    run.log({"loss": 0.7, "asn/effective_rank": 28.0}, step=1)
    run.log_event("surgery", "triggered", {"tier": 1})
    run.finish()
    return run.run_id


def test_list_and_get_run(run_store):
    run_id = _seed_run(run_store)
    listed = telemetry.list_runs()
    assert [r["id"] for r in listed["runs"]] == [run_id]
    assert telemetry.list_runs(project="other")["runs"] == []

    manifest = telemetry.get_run(run_id)
    assert manifest["status"] == "finished"
    assert manifest["summary"]["loss"] == 0.7


def test_metrics_pagination_and_events(run_store):
    run_id = _seed_run(run_store)
    page = telemetry.get_metrics(run_id, after=1)
    assert page["count"] == 1
    assert page["rows"][0]["metrics"]["loss"] == 0.7

    events = telemetry.get_events(run_id)
    assert events["rows"][0]["kind"] == "surgery"


def test_missing_run_returns_none(run_store):
    assert telemetry.get_run("nope") is None
    assert telemetry.get_metrics("nope") is None
    assert telemetry.get_events("nope") is None


def test_invalid_run_id_raises(run_store):
    with pytest.raises(ValueError):
        telemetry.get_run("../escape")
