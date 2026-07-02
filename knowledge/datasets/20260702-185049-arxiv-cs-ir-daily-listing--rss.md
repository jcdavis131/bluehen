---
type: Dataset
title: arXiv cs.IR daily listing (RSS)
description: "Point-in-time collection: 1 docs, 35 chunks."
tags: [dataset, datalab]
timestamp: "2026-07-02T23:50:49Z"
datasetId: 20260702-185049-arxiv-cs-ir-daily-listing--rss
---

# Provenance

Point-in-time collection run `20260702-185049-arxiv-cs-ir-daily-listing--rss` — 1 documents,
35 chunks (sentence strategy,
~16206 tokens). Raw artifacts live at
`data/datalab/20260702-185049-arxiv-cs-ir-daily-listing--rss/` (docs.jsonl, chunks.jsonl, manifest.json);
trace `20260702-185048-55bb350d` in `data/traces/`.

# Sources

| Source | Status |
|--------|--------|
| `https://rss.arxiv.org/rss/cs.IR` | ok |

# Consumption

Chunks feed the training worker's pair builder and the retrieval index.
Filter on `token_estimate` and `strategy` in `chunks.jsonl`. See the
[data pipeline](/platform/data-pipeline.md) concept for stage details.
