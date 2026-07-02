import json
import time

import pytest

from datalab.watch import Source, WatchState, collect_source, load_registry, tick


@pytest.fixture()
def env(tmp_path, monkeypatch):
    monkeypatch.setenv("DATALAB_TRACE_DIR", str(tmp_path / "traces"))
    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "a.md").write_text("Alpha content about markets.", encoding="utf-8")
    (docs / "b.md").write_text("Beta content about filings.", encoding="utf-8")
    state = WatchState(tmp_path / "watch_state.json")
    return tmp_path, docs, state


def _source(**kw):
    base = dict(id="s1", name="test source", interval_minutes=60, strategy="sentence")
    base.update(kw)
    return Source(**base)


def test_registry_defaults_merge(tmp_path):
    reg = tmp_path / "reg.json"
    reg.write_text(json.dumps({
        "defaults": {"intervalMinutes": 120, "strategy": "sentence"},
        "sources": [
            {"id": "a", "urls": ["x.md"]},
            {"id": "b", "urls": ["y.md"], "intervalMinutes": 15},
        ],
    }), encoding="utf-8")
    sources = load_registry(reg)
    assert sources[0].interval_minutes == 120
    assert sources[0].strategy == "sentence"
    assert sources[1].interval_minutes == 15


def test_due_scheduling(env):
    _, _, state = env
    src = _source()
    assert state.is_due(src)  # never run
    state.entry(src.id)["lastRunAt"] = time.time()
    assert not state.is_due(src)
    state.entry(src.id)["lastRunAt"] = time.time() - 61 * 60
    assert state.is_due(src)


def test_collect_then_unchanged_then_changed(env):
    tmp_path, docs, state = env
    src = _source(glob="docs/*.md")

    r1 = collect_source(src, state, data_root=tmp_path / "data",
                        knowledge_root=tmp_path / "knowledge", repo_root=tmp_path)
    assert r1["action"] == "collected"
    assert r1["docs"] == 2
    assert (tmp_path / "knowledge" / "datasets" / f"{r1['datasetId']}.md").exists()

    r2 = collect_source(src, state, data_root=tmp_path / "data",
                        knowledge_root=tmp_path / "knowledge", repo_root=tmp_path)
    assert r2["action"] == "unchanged"  # same content → no new dataset

    (docs / "a.md").write_text("Alpha content REVISED with new numbers.", encoding="utf-8")
    time.sleep(1.1)  # dataset ids are second-resolution timestamps
    r3 = collect_source(src, state, data_root=tmp_path / "data",
                        knowledge_root=tmp_path / "knowledge", repo_root=tmp_path)
    assert r3["action"] == "collected"
    assert r3["datasetId"] != r1["datasetId"]
    assert state.entry(src.id)["runs"] == 2


def test_state_persists_across_instances(env):
    tmp_path, _, state = env
    src = _source(glob="docs/*.md")
    collect_source(src, state, data_root=tmp_path / "data",
                   knowledge_root=tmp_path / "knowledge", repo_root=tmp_path)
    reloaded = WatchState(state.path)
    assert reloaded.entry("s1")["contentHash"]
    assert not reloaded.is_due(src)


def test_tick_skips_not_due_and_survives_errors(env):
    tmp_path, _, state = env
    good = _source(id="good", glob="docs/*.md")
    silent = _source(id="notdue", glob="docs/*.md")
    state.entry("notdue")["lastRunAt"] = time.time()
    missing = _source(id="empty", urls=[str(tmp_path / "nope.md")])

    reports = tick([good, silent, missing], state, data_root=tmp_path / "data",
                   knowledge_root=tmp_path / "knowledge", repo_root=tmp_path)
    by_id = {r["sourceId"]: r for r in reports}
    assert by_id["good"]["action"] == "collected"
    assert "notdue" not in by_id
    assert by_id["empty"]["action"] == "empty"
