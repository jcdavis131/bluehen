---
type: Pipeline
title: Data Collection Pipeline (datalab)
description: Point-in-time data collection — ingest, structure, chunk, embed, store — with OSS adapters and pure-Python fallbacks.
resource: /packages/datalab
tags: [data, pipeline, datalab, miners]
timestamp: 2026-07-02T00:00:00Z
---

The Data Miners division as code. Every stage prefers a best-in-class
open-source tool when installed and degrades to a correct pure-Python
fallback otherwise, so the pipeline runs end-to-end on a clean machine.

# Stages

| Stage | Preferred adapter | Fallback | Module |
|-------|-------------------|----------|--------|
| Web ingest | Crawl4AI (fit-markdown) | httpx + tag-strip | `datalab/ingest.py` |
| PDF conversion | Marker (tables/math preserved) | pypdf text | `datalab/ingest.py` |
| Structured extraction | Instructor + LiteLLM (validated Pydantic, retry) | deterministic regex, confidence ≤ 0.3 | `datalab/structure.py` |
| Chunking | Chonkie sentence/semantic | paragraph-aware sentence packing | `datalab/chunk.py` |
| Vector store | Qdrant (`QDRANT_URL`) | local numpy + JSONL | `datalab/store.py` |
| Observability | Langfuse (`LANGFUSE_PUBLIC_KEY`) | local JSONL traces (always on) | `datalab/observe.py` |

Heavy adapters (crawl4ai, marker-pdf, outlines, litellm, instructor) are
installed opt-in with `uv pip install` — they are kept out of the
universal lock so their transitive pins cannot constrain the training
environment (litellm→tokenizers previously forced a transformers
downgrade).

# Point-in-time discipline

Every `SourceDoc` carries `as_of` and `retrieved_at`; every collection
run writes an immutable `DatasetManifest` plus raw `docs.jsonl` /
`chunks.jsonl` under `data/datalab/<dataset_id>/`, and emits an OKF
dataset card into [/datasets/](/datasets/index.md).

# Examples

```powershell
uv run python -m datalab collect https://example.com/news --name "market-news"
uv run python -m datalab datasets
uv run python -m datalab extract filing.txt          # FinancialMetrics JSON
```

# Citations

[1] [Spec 0004 — Core API](/../specs/0004-core-api.md)
[2] Source architecture: Embedding Co. four-org loop (docs/SOURCE_MAP.md)
