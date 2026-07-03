---
type: Dataset
title: arXiv cs.IR daily listing (RSS)
description: "Point-in-time collection: 1 docs, 27 chunks."
tags: [dataset, datalab]
timestamp: "2026-07-03T23:58:28Z"
datasetId: 20260703-185828-arxiv-cs-ir-daily-listing--rss
---

# Provenance

Point-in-time collection run `20260703-185828-arxiv-cs-ir-daily-listing--rss` — 1 documents,
27 chunks (sentence strategy,
~11993 tokens). Raw artifacts live at
`data/datalab/20260703-185828-arxiv-cs-ir-daily-listing--rss/` (docs.jsonl, chunks.jsonl, manifest.json);
trace `20260703-185827-f336f040` in `data/traces/`.

# Sources

| Source | Status |
|--------|--------|
| `https://rss.arxiv.org/rss/cs.IR` | ok |

# Consumption

Chunks feed the training worker's pair builder and the retrieval index.
Filter on `token_estimate` and `strategy` in `chunks.jsonl`. See the
[data pipeline](/platform/data-pipeline.md) concept for stage details.
