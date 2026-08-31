---
title: "GreenLeaf Law Embed Tiny: A Compact Embedding Model for Legal Domain Retrieval"
tags: [chunk, pairs]
source: ""
added: 2026-08-31
format: okf/v0
---

We present GreenLeaf Law Embed Tiny, a 0.6B parameter embedding model for legal domain retrieval. GreenLeaf-Tiny achieves 75.11% on the Massive Legal Embedding Benchmark (MLEB) and 64.38% on MTEB(Law, v1),demonstrating competitive performance among models under 1B parameters. Our approach combines a two-stage training pipeline that first distills knowledge from a larger teacher model into a compact student architecture, then applies domain-specific fine-tuning with hard negative mining; a carefully curated dataset of 3.4 million query-passage pairs, including 150,000 human-curated samples acro

Related: [[retrieval-and-rag]] [[hard-negatives]]
