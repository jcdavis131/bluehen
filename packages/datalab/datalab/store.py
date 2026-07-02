"""Vector storage: Qdrant when available, a local numpy store otherwise.

The local store keeps chunk payloads in JSONL next to a dense float32
matrix (cosine search via numpy). It is deliberately simple: good for
tens of thousands of chunks on a dev box; production similarity search
belongs in Qdrant or pgvector (core-api owns pgvector).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Protocol, Sequence

import numpy as np

from datalab.schemas import Chunk


class VectorStore(Protocol):
    def upsert(self, chunks: Sequence[Chunk], vectors: np.ndarray) -> int: ...
    def search(self, vector: np.ndarray, limit: int = 10) -> list[dict[str, Any]]: ...


class LocalVectorStore:
    """JSONL payloads + .npy matrix; cosine similarity in-process."""

    def __init__(self, root: str | Path, name: str = "default") -> None:
        self.dir = Path(root) / name
        self.dir.mkdir(parents=True, exist_ok=True)
        self.payload_path = self.dir / "payloads.jsonl"
        self.matrix_path = self.dir / "vectors.npy"

    def _load(self) -> tuple[list[dict[str, Any]], np.ndarray | None]:
        payloads: list[dict[str, Any]] = []
        if self.payload_path.exists():
            with self.payload_path.open("r", encoding="utf-8") as fh:
                payloads = [json.loads(ln) for ln in fh if ln.strip()]
        matrix = np.load(self.matrix_path) if self.matrix_path.exists() else None
        return payloads, matrix

    def upsert(self, chunks: Sequence[Chunk], vectors: np.ndarray) -> int:
        vectors = np.asarray(vectors, dtype=np.float32)
        if len(chunks) != vectors.shape[0]:
            raise ValueError(f"{len(chunks)} chunks but {vectors.shape[0]} vectors")
        payloads, matrix = self._load()
        with self.payload_path.open("a", encoding="utf-8") as fh:
            for c in chunks:
                fh.write(c.model_dump_json() + "\n")
        stacked = vectors if matrix is None else np.vstack([matrix, vectors])
        np.save(self.matrix_path, stacked)
        return len(chunks)

    def search(self, vector: np.ndarray, limit: int = 10) -> list[dict[str, Any]]:
        payloads, matrix = self._load()
        if matrix is None or not payloads:
            return []
        q = np.asarray(vector, dtype=np.float32)
        q = q / max(float(np.linalg.norm(q)), 1e-9)
        m = matrix / np.maximum(np.linalg.norm(matrix, axis=1, keepdims=True), 1e-9)
        scores = m @ q
        top = np.argsort(-scores)[:limit]
        return [{"score": float(scores[i]), "chunk": payloads[i]} for i in top]

    def count(self) -> int:
        payloads, _ = self._load()
        return len(payloads)


class QdrantStore:
    """Thin adapter over qdrant-client (vector extra)."""

    def __init__(self, url: str, collection: str, dim: int) -> None:
        from qdrant_client import QdrantClient  # type: ignore[import-not-found]
        from qdrant_client.models import Distance, VectorParams  # type: ignore[import-not-found]

        self.client = QdrantClient(url=url)
        self.collection = collection
        if not self.client.collection_exists(collection):
            self.client.create_collection(
                collection, vectors_config=VectorParams(size=dim, distance=Distance.COSINE)
            )

    def upsert(self, chunks: Sequence[Chunk], vectors: np.ndarray) -> int:
        from qdrant_client.models import PointStruct  # type: ignore[import-not-found]

        points = [
            PointStruct(
                id=int.from_bytes(bytes.fromhex(c.chunk_id[:12]), "big"),
                vector=np.asarray(vectors[i], dtype=np.float32).tolist(),
                payload=c.model_dump(),
            )
            for i, c in enumerate(chunks)
        ]
        self.client.upsert(self.collection, points=points)
        return len(points)

    def search(self, vector: np.ndarray, limit: int = 10) -> list[dict[str, Any]]:
        hits = self.client.query_points(
            self.collection, query=np.asarray(vector, dtype=np.float32).tolist(), limit=limit
        ).points
        return [{"score": h.score, "chunk": h.payload} for h in hits]


def open_store(root: str | Path, name: str, dim: int) -> VectorStore:
    """Qdrant if QDRANT_URL is set and the client is installed; local otherwise."""
    import os

    url = os.environ.get("QDRANT_URL")
    if url:
        try:
            return QdrantStore(url, name, dim)
        except ImportError:
            pass
    return LocalVectorStore(root, name)
