"""Tests for Phase A+ BD handoffs (Spec 0012)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.services import handoffs


@pytest.fixture
def handoff_paths(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    queue = tmp_path / "queue.json"
    scorecards = tmp_path / "scorecards"
    recipes = tmp_path / "recipes"
    scorecards.mkdir()
    recipes.mkdir()
    monkeypatch.setattr(handoffs, "BD_QUEUE_PATH", queue)
    monkeypatch.setattr(handoffs, "BD_SCORECARDS_DIR", scorecards)
    monkeypatch.setattr(handoffs, "RECIPES_DIR", recipes)
    monkeypatch.setattr(handoffs, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(handoffs, "CHARTER_GATE_ENABLED", True)
    return {"queue": queue, "scorecards": scorecards, "recipes": recipes}


def test_submit_bd_candidate_appends(handoff_paths):
    out = handoffs.submit_bd_candidate(
        site_id="hub",
        model_version="v-test-1",
        recipe={"epochs": 3},
        gates={"allPassed": True},
        checkpoint_path="/data/artifacts/x.pt",
    )
    assert out["candidateId"] == "hub-v-test-1"
    data = json.loads(handoff_paths["queue"].read_text())
    assert len(data["candidates"]) == 1
    assert data["candidates"][0]["status"] == "awaiting_pilot"


def test_charter_gate_blocks_without_charter(handoff_paths):
    assert handoffs.charter_allows_deploy("hub", "v1") is False


def test_charter_wildcard_allows_deploy(handoff_paths):
    handoffs.issue_charter(site_id="hub", model_version="*", recipe={"epochs": 3})
    assert handoffs.charter_allows_deploy("hub", "v-any") is True


def test_charter_specific_version(handoff_paths):
    handoffs.issue_charter(site_id="hub", model_version="v-only", recipe={})
    assert handoffs.charter_allows_deploy("hub", "v-only") is True
    assert handoffs.charter_allows_deploy("hub", "v-other") is False


def test_scorecard_updates_queue(handoff_paths):
    handoffs.submit_bd_candidate(
        site_id="hub",
        model_version="v1",
        recipe={},
        gates={},
        checkpoint_path="x.pt",
    )
    handoffs.record_scorecard(site_id="hub", candidate_id="hub-v1", passed=True, notes="ok")
    data = json.loads(handoff_paths["queue"].read_text())
    assert data["candidates"][0]["status"] == "pilot_passed"
