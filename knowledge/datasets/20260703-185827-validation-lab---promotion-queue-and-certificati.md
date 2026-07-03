---
type: Dataset
title: Validation Lab — promotion queue and certification scorecards
description: "Point-in-time collection: 1 docs, 1 chunks."
tags: [dataset, datalab]
timestamp: "2026-07-03T23:58:27Z"
datasetId: 20260703-185827-validation-lab---promotion-queue-and-certificati
---

# Provenance

Point-in-time collection run `20260703-185827-validation-lab---promotion-queue-and-certificati` — 1 documents,
1 chunks (sentence strategy,
~316 tokens). Raw artifacts live at
`data/datalab/20260703-185827-validation-lab---promotion-queue-and-certificati/` (docs.jsonl, chunks.jsonl, manifest.json);
trace `20260703-185827-d7c3e06a` in `data/traces/`.

# Sources

| Source | Status |
|--------|--------|
| `content/fleet/bd/queue.json` | ok |

# Consumption

Chunks feed the training worker's pair builder and the retrieval index.
Filter on `token_estimate` and `strategy` in `chunks.jsonl`. See the
[data pipeline](/platform/data-pipeline.md) concept for stage details.
