---
type: Dataset
title: Wiki — goals and build docs
description: "Point-in-time collection: 3 docs, 8 chunks."
tags: [dataset, datalab]
timestamp: "2026-07-02T16:02:39Z"
datasetId: 20260702-110239-wiki---goals-and-build-docs
---

# Provenance

Point-in-time collection run `20260702-110239-wiki---goals-and-build-docs` — 3 documents,
8 chunks (sentence strategy,
~2357 tokens). Raw artifacts live at
`data/datalab/20260702-110239-wiki---goals-and-build-docs/` (docs.jsonl, chunks.jsonl, manifest.json);
trace `20260702-110239-84ab5b83` in `data/traces/`.

# Sources

| Source | Status |
|--------|--------|
| `docs/wiki/GOALS.md` | ok |
| `docs/wiki/BUILD.md` | ok |
| `docs/wiki/IMPROVEMENT_LOOP.md` | ok |

# Consumption

Chunks feed the training worker's pair builder and the retrieval index.
Filter on `token_estimate` and `strategy` in `chunks.jsonl`. See the
[data pipeline](/platform/data-pipeline.md) concept for stage details.
