---
title: "ColBERTSaR: Sparsified ColBERT Index via Product Quantization"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

While ColBERT is an effective neural retrieval architecture, it requires a heavy index structure to support candidate set retrieval based on approximated token embeddings, gathering and decompressing document token embeddings, and applying the MaxSim operation. Indexes in PLAID and similar ColBERT implementations require five to ten times the disk storage of the original raw text, which limits their scalability. Furthermore, prior work has identified that the gathering and decompression stages are the primary inefficiencies at query time. Limiting the number of document tokens that must be gat

Related: [[retrieval-and-rag]]
