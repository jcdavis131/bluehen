"""Stage 1 data pipeline — corpus ingest, LMAR chunk, pair synthesis."""

from __future__ import annotations

import json
import random
import re
import uuid
from pathlib import Path

from sqlalchemy import select

from app.config import CORPORA_DIR
from app.database import db_session
from app.models import Collection, Workspace


def _load_corpus_docs(corpus_uri: str, site_id: str | None) -> list[dict]:
    path = Path(corpus_uri)
    if not path.is_absolute():
        if site_id:
            candidate = CORPORA_DIR / site_id / corpus_uri
            if candidate.exists():
                path = candidate
            else:
                path = CORPORA_DIR / site_id / "corpus.jsonl"
        else:
            path = CORPORA_DIR / corpus_uri

    if path.suffix == ".jsonl":
        docs = []
        with path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    docs.append(json.loads(line))
        return docs

    if path.suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else data.get("documents", [])

    raise FileNotFoundError(f"Corpus not found: {corpus_uri} (resolved {path})")


def ingest(workspace_id: uuid.UUID, corpus_uri: str, site_id: str | None) -> dict:
    docs = _load_corpus_docs(corpus_uri, site_id)
    with db_session(workspace_id) as session:
        col = Collection(
            workspace_id=workspace_id,
            corpus_uri=corpus_uri,
            doc_count=len(docs),
            meta={"siteId": site_id, "sourcePath": str(corpus_uri)},
        )
        session.add(col)
        session.flush()
        chunks = chunk_documents(docs)
        col.meta = {**(col.meta or {}), "chunks": chunks}
        col.chunk_count = len(chunks)
        session.add(col)
        return {"collectionId": str(col.id), "ingested": True, "docCount": len(docs), "chunks": len(chunks)}


def chunk_documents(docs: list[dict], sim_threshold: float = 0.7) -> list[dict]:
    """LMAR-style chunking: paragraph splits with title prefix."""
    chunks: list[dict] = []
    for doc in docs:
        doc_id = doc.get("id") or str(uuid.uuid4())
        title = doc.get("title", "")
        text = doc.get("text", "")
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        if not paragraphs:
            paragraphs = [text] if text else []
        for i, para in enumerate(paragraphs):
            chunks.append(
                {
                    "id": f"{doc_id}#{i}",
                    "docId": doc_id,
                    "title": title,
                    "text": f"{title}. {para}" if title else para,
                    "tags": doc.get("tags", []),
                    "simThreshold": sim_threshold,
                }
            )
    return chunks


def chunk_collection(workspace_id: uuid.UUID, collection_id: str, sim_threshold: float = 0.7) -> dict:
    with db_session(workspace_id) as session:
        col = session.scalar(
            select(Collection).where(Collection.id == uuid.UUID(collection_id), Collection.workspace_id == workspace_id)
        )
        if col is None:
            raise ValueError("collection not found")
        chunks = (col.meta or {}).get("chunks") or []
        if not chunks and col.corpus_uri:
            ws = session.get(Workspace, workspace_id)
            docs = _load_corpus_docs(col.corpus_uri, ws.site_id if ws else None)
            chunks = chunk_documents(docs, sim_threshold)
            col.meta = {**(col.meta or {}), "chunks": chunks}
            col.chunk_count = len(chunks)
        return {"docId": collection_id, "chunks": len(chunks), "method": "lmar"}


def synth_pairs(workspace_id: uuid.UUID, collection_id: str, n: int = 1000) -> dict:
    with db_session(workspace_id) as session:
        col = session.scalar(
            select(Collection).where(Collection.id == uuid.UUID(collection_id), Collection.workspace_id == workspace_id)
        )
        if col is None:
            raise ValueError("collection not found")
        chunks = (col.meta or {}).get("chunks") or []
        if len(chunks) < 2:
            raise ValueError("need at least 2 chunks to synthesize pairs")

        # Hard negative mining (RAG-503, Spec 0009): the negative is the most
        # lexically similar chunk that is NOT the anchor/positive — random
        # negatives made the eval's ndcg gate trivially easy. Deterministic
        # token-Jaccard keeps this reproducible and dependency-free.
        token_sets = [frozenset(c["text"].lower().split()) for c in chunks]

        def _hard_negative(i: int, j: int) -> int:
            anchor_toks = token_sets[i]
            best, best_score = -1, -1.0
            for k, toks in enumerate(token_sets):
                if k in (i, j):
                    continue
                union = len(anchor_toks | toks)
                score = (len(anchor_toks & toks) / union) if union else 0.0
                if score > best_score:
                    best, best_score = k, score
            if best < 0:
                best = (i + 1) % len(chunks)
            return best

        pairs = []
        for _ in range(min(n, len(chunks) * 4)):
            i = random.randint(0, len(chunks) - 1)
            j = i if random.random() < 0.5 else min(i + 1, len(chunks) - 1)
            neg = _hard_negative(i, j)
            pairs.append(
                {
                    "anchor": chunks[i]["text"],
                    "positive": chunks[j]["text"],
                    "negative": chunks[neg]["text"],
                    "negativeMining": "hard-jaccard-v1",
                }
            )
        col.meta = {**(col.meta or {}), "pairs": pairs}
        col.pair_count = len(pairs)
        session.add(col)
        return {"collectionId": collection_id, "pairs": len(pairs)}
