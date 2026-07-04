"""RECO-001 (Spec 0023/0025): customer corpus upload — the out-of-the-box
entry point. A tenant POSTs documents; they become a collection and the
loop takes it from there (train → gates → charter → serve). Zero human
steps between upload and a gated recommender."""

from __future__ import annotations

import json
import re
import uuid
from pathlib import Path

from app.services.exhaust import DATALAB_DIR

MAX_DOCS = 2000
MAX_DOC_CHARS = 100_000
MAX_TOTAL_BYTES = 5_000_000


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-")[:48]
    return s or "corpus"


def validate_documents(documents: list[dict]) -> None:
    if not documents:
        raise ValueError("documents must be a non-empty list")
    if len(documents) > MAX_DOCS:
        raise ValueError(f"at most {MAX_DOCS} documents per upload")
    total = 0
    for i, doc in enumerate(documents):
        text = doc.get("text")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"documents[{i}].text is required and must be non-empty")
        if len(text) > MAX_DOC_CHARS:
            raise ValueError(f"documents[{i}].text exceeds {MAX_DOC_CHARS} chars")
        total += len(text.encode("utf-8"))
    if total > MAX_TOTAL_BYTES:
        raise ValueError(f"corpus exceeds {MAX_TOTAL_BYTES} bytes total")



def save_corpus(workspace_id: uuid.UUID, name: str, documents: list[dict]) -> Path:
    """Persist the upload as JSONL under the datalab volume; returns the
    absolute path data.ingest can consume directly."""
    validate_documents(documents)
    dest_dir = DATALAB_DIR / "uploads" / str(workspace_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{_slug(name)}-{uuid.uuid4().hex[:8]}.jsonl"
    with dest.open("w", encoding="utf-8") as fh:
        for doc in documents:
            fh.write(json.dumps({
                "id": str(doc.get("id") or uuid.uuid4()),
                "title": str(doc.get("title") or "")[:300],
                "text": doc["text"],
                "metadata": doc.get("metadata") or {},
            }, ensure_ascii=False) + "\n")
    return dest


def upload_and_train(workspace_id: uuid.UUID, name: str,
                     documents: list[dict], train: bool = True) -> dict:
    from app.services import lifecycle
    from app.services.usage import record as record_usage

    from app.services.contracts import validate_documents_against_contract

    contract_version = validate_documents_against_contract(workspace_id, documents)
    path = save_corpus(workspace_id, name, documents)
    record_usage(workspace_id, "corpus-upload")
    out: dict = {
        "corpus": path.name,
        "docCount": len(documents),
        "contractVersion": contract_version,
        "training": None,
    }
    if train:
        result = lifecycle.hill_climb(
            workspace_id, None, str(path),
            {"traceId": f"upload-{_slug(name)}"},
        )
        out["training"] = result
    return out
