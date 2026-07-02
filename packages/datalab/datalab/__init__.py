"""datalab — the Data Miners division as code.

Ingest (Crawl4AI/Marker) → structure (Instructor/LiteLLM/Outlines) →
chunk (Chonkie) → embed/store (Qdrant) → observe (Langfuse), with pure-Python
fallbacks for every stage so the pipeline runs end-to-end on a clean machine.
Every collection run emits a point-in-time DatasetManifest and an OKF
dataset card into the knowledge bundle.
"""

from datalab.chunk import chunk_text
from datalab.pipeline import CollectionRun, run_collection
from datalab.schemas import Chunk, DatasetManifest, FinancialMetrics, SourceDoc

__all__ = [
    "chunk_text",
    "CollectionRun",
    "run_collection",
    "Chunk",
    "DatasetManifest",
    "FinancialMetrics",
    "SourceDoc",
]
