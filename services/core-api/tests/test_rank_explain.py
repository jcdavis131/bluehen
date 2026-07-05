"""Spec 0032 Shapley Arena: factor + pick Shapley invariants."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest

from app.services import rank_explain as explain_svc


def _mock_embed(_wid, texts, truncate=False):
    """Deterministic 3-d vectors from text hash."""
    vecs = []
    for t in texts:
        h = sum(ord(c) for c in t) % 97
        vecs.append([0.1 * h, 0.2 * (h + 1), 0.3 * (h + 2)])
    return {"vectors": vecs}


@patch("app.services.models_svc.embed_texts", side_effect=_mock_embed)
def test_factor_shapley_sums_to_delta(mock_embed):
    wid = uuid.uuid4()
    pair = [
        {"id": "a", "text": "alpha choice"},
        {"id": "b", "text": "beta choice"},
    ]
    out = explain_svc.rank_round(
        wid,
        user_ref="u1",
        pair=pair,
        query="Movie Night",
        prior_picks=[],
    )
    delta = out["scores"]["a"] - out["scores"]["b"]
    factor_sum = sum(out["shapley"]["factors"].values())
    assert factor_sum == pytest.approx(delta, abs=1e-4)
    mock_embed.assert_called()


@patch("app.services.models_svc.embed_texts", side_effect=_mock_embed)
def test_pick_shapley_empty_without_prior(mock_embed):
    wid = uuid.uuid4()
    pair = [
        {"id": "a", "text": "one"},
        {"id": "b", "text": "two"},
    ]
    out = explain_svc.rank_round(wid, user_ref="u1", pair=pair, query="Theme")
    assert out["shapley"]["picks"] == []
    assert out["personalized"] is False
    assert out["note"] is not None


@patch("app.services.models_svc.embed_texts", side_effect=_mock_embed)
@patch("app.services.exhaust.ingest")
def test_resolve_records_exhaust(mock_ingest, mock_embed):
    wid = uuid.uuid4()
    pair = [
        {"id": "a", "text": "alpha"},
        {"id": "b", "text": "beta"},
    ]
    out = explain_svc.rank_round(
        wid,
        user_ref="sess-1",
        pair=pair,
        query="Deck",
        prior_picks=[],
        chosen_id="a",
        deck_slug="movie-night",
        round_num=1,
    )
    assert "correct" in out
    assert out["chosenId"] == "a"
    assert "layerStackBefore" in out
    assert "layerStackAfter" in out
    mock_ingest.assert_called_once()
    args = mock_ingest.call_args[0]
    assert args[1] == "dumbmodel"
    assert args[3] is True


@patch("app.services.models_svc.embed_texts", side_effect=_mock_embed)
def test_pick_shapley_with_prior(mock_embed):
    wid = uuid.uuid4()
    prior = [
        {"round": 1, "id": "x", "text": "prior one"},
        {"round": 2, "id": "y", "text": "prior two"},
    ]
    pair = [
        {"id": "a", "text": "alpha"},
        {"id": "b", "text": "beta"},
    ]
    out = explain_svc.rank_round(
        wid,
        user_ref="u1",
        pair=pair,
        query="Theme",
        prior_picks=prior,
    )
    assert out["personalized"] is True
    picks = out["shapley"]["picks"]
    assert len(picks) >= 1
    assert all("phi" in p for p in picks)
