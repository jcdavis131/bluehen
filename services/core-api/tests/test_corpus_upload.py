"""RECO-001: corpus upload validation + persistence (no DB required)."""

import json
import uuid

import pytest

from app.services import corpus_upload


def test_validate_rejects_empty():
    with pytest.raises(ValueError, match="non-empty list"):
        corpus_upload.validate_documents([])


def test_validate_rejects_missing_text():
    with pytest.raises(ValueError, match="text is required"):
        corpus_upload.validate_documents([{"title": "no text"}])


def test_validate_rejects_oversize_doc():
    with pytest.raises(ValueError, match="exceeds"):
        corpus_upload.validate_documents([{"text": "x" * 100_001}])


def test_validate_rejects_oversize_total():
    docs = [{"text": "y" * 90_000} for _ in range(60)]
    with pytest.raises(ValueError, match="bytes total"):
        corpus_upload.validate_documents(docs)


def test_save_corpus_writes_jsonl(tmp_path, monkeypatch):
    monkeypatch.setattr(corpus_upload, "DATALAB_DIR", tmp_path)
    ws = uuid.uuid4()
    dest = corpus_upload.save_corpus(ws, "My Test Corpus!", [
        {"text": "alpha doc", "title": "A"},
        {"text": "beta doc", "metadata": {"k": "v"}},
    ])
    assert dest.exists()
    assert dest.name.startswith("my-test-corpus-")
    rows = [json.loads(line) for line in dest.read_text(encoding="utf-8").splitlines()]
    assert len(rows) == 2
    assert rows[0]["title"] == "A"
    assert rows[1]["metadata"] == {"k": "v"}
    assert all(r["id"] for r in rows)
