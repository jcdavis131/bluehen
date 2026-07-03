"""REV-905: eval gate must fail closed below MIN_REAL_PAIRS_EVAL (no demo fallback).

Pure unit tests — no Postgres required (BLK-DOCKER safe). Mocks the DB session,
pair loader, checkpoint opener, and eval-harness runner so we can assert the
fail-closed behaviour and that demo pairs never reach the harness by default.
"""

from __future__ import annotations

import sys
import types
import uuid
from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest

# eval_harness is not installed in the core-api test environment; the real-eval
# path imports it lazily. Register a stub module so the import resolves.
if "eval_harness" not in sys.modules:
    sys.modules["eval_harness"] = types.ModuleType("eval_harness")
if "eval_harness.runner" not in sys.modules:
    _runner_stub = types.ModuleType("eval_harness.runner")
    sys.modules["eval_harness.runner"] = _runner_stub

from app.services import eval as eval_svc


WS = uuid.uuid4()


class _FakeModelVersion:
    def __init__(self, version: str):
        self.version = version
        self.checkpoint_path = "/data/artifacts/x.pt"
        self.ndcg10 = None
        self.effective_rank = None
        self.meta = None


class _FakeJob:
    def __init__(self, collection_id):
        self.collection_id = collection_id


def _make_session(monkeypatch, mv: _FakeModelVersion, job: _FakeJob | None):
    session = MagicMock()
    session.scalar.return_value = None

    def scalar(selector):
        # Distinguish ModelVersion vs TrainingJob lookups by call order:
        # first call in each db_session block is the ModelVersion lookup,
        # second is the TrainingJob lookup. We mirror that by returning mv
        # for the first scalar() of a block and job for the second.
        return mv

    # Simpler: track call index per context entry.
    call_state = {"n": 0}

    def scalar_fn(selector):
        call_state["n"] += 1
        if call_state["n"] % 2 == 1:
            return mv
        return job

    session.scalar.side_effect = scalar_fn
    return session


@pytest.fixture
def patched_eval(monkeypatch):
    """Patch eval_svc internals so tests can drive pair counts without Postgres."""
    state = {"mv": _FakeModelVersion("v-test-1"), "job": _FakeJob(uuid.uuid4())}

    session = _make_session(monkeypatch, state["mv"], state["job"])

    @contextmanager
    def fake_db_session(workspace_id):
        yield session

    monkeypatch.setattr(eval_svc, "db_session", fake_db_session)

    harness_calls = {"evaluate": 0, "pairs_seen": []}

    def fake_get_collection_pairs(workspace_id, collection_id):
        return state["pairs"]

    def fake_open_checkpoint(path):
        cm = MagicMock()
        ckpt = MagicMock(name="checkpoint")
        cm.__enter__.return_value = ckpt
        cm.__exit__.return_value = False
        return cm

    def fake_evaluate_checkpoint(ckpt, pairs, *, eval_slice, preloaded=None):
        harness_calls["evaluate"] += 1
        harness_calls["pairs_seen"].append(list(pairs))
        return {
            "ndcg10": 0.42,
            "effectiveRank": 9.5,
            "gates": {
                "rankAboveBaseline": True,
                "ndcgNonRegression": True,
                "mrlWithinTolerance": True,
            },
            "allPassed": True,
        }

    monkeypatch.setattr(eval_svc, "get_collection_pairs", fake_get_collection_pairs)
    monkeypatch.setattr(eval_svc, "open_checkpoint", fake_open_checkpoint)

    # evaluate_checkpoint is imported lazily inside run_eval_for_workspace via
    # `from eval_harness.runner import evaluate_checkpoint`, so patch the stub
    # runner module's attribute (registered in sys.modules at import time).
    monkeypatch.setattr(
        sys.modules["eval_harness.runner"],
        "evaluate_checkpoint",
        fake_evaluate_checkpoint,
        raising=False,
    )

    def set_pairs(n):
        state["pairs"] = [
            {"anchor": f"a{i}", "positive": f"p{i}", "negative": f"n{i}"}
            for i in range(n)
        ]

    return {
        "session": session,
        "harness_calls": harness_calls,
        "set_pairs": set_pairs,
        "mv": state["mv"],
    }


def test_zero_pairs_fails_closed_without_harness(patched_eval):
    patched_eval["set_pairs"](0)
    out = eval_svc.run_eval_for_workspace(WS, "v-test-1", "rotating")
    assert out["allPassed"] is False
    assert out["gates"]["sufficientEvalPairs"] is False
    assert out["metrics"]["skipped"] == "insufficient_real_pairs"
    assert out["metrics"]["realPairCount"] == 0
    assert out["metrics"]["required"] == eval_svc.MIN_REAL_PAIRS_EVAL
    # Harness must not run on a thin corpus.
    assert patched_eval["harness_calls"]["evaluate"] == 0


def test_below_floor_fails_closed(patched_eval):
    patched_eval["set_pairs"](7)
    out = eval_svc.run_eval_for_workspace(WS, "v-test-1", "rotating")
    assert out["allPassed"] is False
    assert out["gates"]["sufficientEvalPairs"] is False
    assert patched_eval["harness_calls"]["evaluate"] == 0


def test_at_floor_runs_real_eval(patched_eval):
    patched_eval["set_pairs"](eval_svc.MIN_REAL_PAIRS_EVAL)
    out = eval_svc.run_eval_for_workspace(WS, "v-test-1", "rotating")
    assert out["allPassed"] is True
    assert out["gates"]["sufficientEvalPairs"] is True
    assert patched_eval["harness_calls"]["evaluate"] == 1
    # Real pairs (8), not demo pairs (3).
    assert len(patched_eval["harness_calls"]["pairs_seen"][0]) == eval_svc.MIN_REAL_PAIRS_EVAL


def test_above_floor_runs_real_eval(patched_eval):
    patched_eval["set_pairs"](12)
    out = eval_svc.run_eval_for_workspace(WS, "v-test-1", "rotating")
    assert out["allPassed"] is True
    assert out["gates"]["sufficientEvalPairs"] is True
    assert patched_eval["harness_calls"]["evaluate"] == 1
    assert len(patched_eval["harness_calls"]["pairs_seen"][0]) == 12


def test_allow_demo_with_zero_pairs_runs_harness(patched_eval):
    patched_eval["set_pairs"](0)
    out = eval_svc.run_eval_for_workspace(WS, "v-test-1", "rotating", allow_demo=True)
    # Demo path is an explicit opt-in for manual smoke; harness runs on demo pairs.
    assert patched_eval["harness_calls"]["evaluate"] == 1
    assert len(patched_eval["harness_calls"]["pairs_seen"][0]) == 3
    assert out["gates"]["sufficientEvalPairs"] is True


def test_default_never_uses_demo_pairs(patched_eval):
    patched_eval["set_pairs"](0)
    out = eval_svc.run_eval_for_workspace(WS, "v-test-1", "rotating")
    assert out["allPassed"] is False
    # No demo pairs should ever reach the harness when allow_demo is default.
    for seen in patched_eval["harness_calls"]["pairs_seen"]:
        assert len(seen) != 3
    assert patched_eval["harness_calls"]["evaluate"] == 0
