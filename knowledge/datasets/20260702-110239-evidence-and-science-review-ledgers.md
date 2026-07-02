---
type: Dataset
title: Evidence and science review ledgers
description: "Point-in-time collection: 2 docs, 27 chunks."
tags: [dataset, datalab]
timestamp: "2026-07-02T16:02:39Z"
datasetId: 20260702-110239-evidence-and-science-review-ledgers
---

# Provenance

Point-in-time collection run `20260702-110239-evidence-and-science-review-ledgers` — 2 documents,
27 chunks (sentence strategy,
~11246 tokens). Raw artifacts live at
`data/datalab/20260702-110239-evidence-and-science-review-ledgers/` (docs.jsonl, chunks.jsonl, manifest.json);
trace `20260702-110239-da534e13` in `data/traces/`.

# Sources

| Source | Status |
|--------|--------|
| `EVIDENCE.md` | ok |
| `SCIENCE_REVIEW.md` | ok |

# Consumption

Chunks feed the training worker's pair builder and the retrieval index.
Filter on `token_estimate` and `strategy` in `chunks.jsonl`. See the
[data pipeline](/platform/data-pipeline.md) concept for stage details.
