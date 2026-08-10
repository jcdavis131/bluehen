---
title: "Do Static Embeddings Add Value to Hybrid Dutch Retrieval?"
tags: [chunk]
source: ""
added: 2026-08-10
format: okf/v0
---

Embedding benchmarks measure standalone model quality, but they do not establish whether a low-cost retriever contributes complementary ranking information once lexical and transformer-based retrieval are already combined. We present a controlled evaluation of this question across Dutch retrieval tasks from the Massive Text Embedding Benchmark for Dutch (MTEB-NL). Weighted reciprocal rank fusion (RRF) combines Best Matching 25 (BM25), Qwen/Qwen3-Embedding-0.6B (Qwen), and two multilingual static embedding models. Five datasets comprising 14,500 queries and 786,573 documents are scored exhausti

Related: [[retrieval-and-rag]]
