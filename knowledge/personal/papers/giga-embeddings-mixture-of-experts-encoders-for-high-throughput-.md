---
title: "Giga-Embeddings: Mixture-of-Experts Encoders for High-Throughput Text Embeddings"
tags: [chunk]
source: ""
added: 2026-08-31
format: okf/v0
---

We introduce Giga-Embeddings, a family of text embedding models designed to combine strong retrieval quality with efficient serving. Its largest member is a sparse 10B-parameter Mixture-of-Experts encoder with approximately 1.8B active parameters per token. Across English, Russian, multilingual, and code MTEB benchmarks, this model achieves the strongest aggregate performance within the family on all four evaluated suites. In our vLLM benchmark with 1024-token inputs, it processes 114.5k tokens per second, providing 25 percent higher throughput than the dense 3B model and 1.56-2.65x the throug

Related: [[retrieval-and-rag]]
