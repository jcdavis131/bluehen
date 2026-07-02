"""Embedding health check service (Spec 0015)."""

import json
import uuid

import numpy as np
import pytest

from app.services import diagnose as diag


@pytest.fixture()
def fake_embed(monkeypatch):
    rng = np.random.default_rng(0)

    def _fake(workspace_id, inputs, **kwargs):
        return {
            "vectors": rng.normal(size=(len(inputs), 32)).tolist(),
            "modelVersion": "test-v1",
        }

    monkeypatch.setattr(diag.models_svc, "embed_texts", _fake)


def test_diagnose_full_rank_sample(fake_embed, tmp_path, monkeypatch):
    monkeypatch.setenv("DATALAB_DIR", str(tmp_path))
    out = diag.diagnose_corpus(
        uuid.uuid4(), [f"sample text number {i} with unique content" for i in range(12)]
    )
    assert out["samples"] == 12
    assert out["dims"] == 32
    assert out["effectiveRank"] > 8  # random gaussians are near full rank
    assert 0 < out["utilization"] <= 1
    assert out["consentStored"] is False
    assert not (tmp_path / "inbox").exists()  # no consent → nothing stored


def test_diagnose_collapsed_sample(monkeypatch, tmp_path):
    monkeypatch.setenv("DATALAB_DIR", str(tmp_path))
    base = np.random.default_rng(1).normal(size=32)

    def _collapsed(workspace_id, inputs, **kwargs):
        return {"vectors": [(base * (1 + 0.001 * i)).tolist() for i in range(len(inputs))],
                "modelVersion": "test-v1"}

    monkeypatch.setattr(diag.models_svc, "embed_texts", _collapsed)
    out = diag.diagnose_corpus(uuid.uuid4(), ["a"] * 10)
    assert out["effectiveRank"] < 2
    assert out["meanPairwiseSimilarity"] > 0.99


def test_consent_persists_submission(fake_embed, tmp_path, monkeypatch):
    monkeypatch.setenv("DATALAB_DIR", str(tmp_path))
    out = diag.diagnose_corpus(
        uuid.uuid4(), ["alpha text", "beta text", "gamma text"],
        consent=True, site_id="dumbmodel",
    )
    assert out["consentStored"] is True
    lines = (tmp_path / "inbox" / "health-check-submissions.jsonl").read_text(
        encoding="utf-8"
    ).splitlines()
    rec = json.loads(lines[0])
    assert rec["siteId"] == "dumbmodel"
    assert rec["texts"] == ["alpha text", "beta text", "gamma text"]
    assert rec["modelVersion"] == "test-v1"


def test_validation_guards(fake_embed):
    with pytest.raises(ValueError, match="at least"):
        diag.diagnose_corpus(uuid.uuid4(), ["one", "two"])
    with pytest.raises(ValueError, match="at most"):
        diag.diagnose_corpus(uuid.uuid4(), ["x"] * 65)
