---
title: "Test-Time Optimization of Query Embeddings with Ranking Aware Reward Maximization"
tags: [graph]
source: ""
added: 2026-08-17
format: okf/v0
---

Dense retrievers rank documents using vector similarity between a frozen encoder and a precomputed index. While test-time ranking rewards from a reranker or LLM judge can improve results, existing methods discard this signal after a single query. Updating the retriever's weights makes rewards reusable, but this requires parameter access, which is unavailable for closed-source models, and is computationally prohibitive. We propose TTT-Embed (Test-Time Tuning of Embeddings), a framework that distills ranking rewards into a lightweight, learned vector within the output embedding space of a frozen

Related: [[embedding-spaces]]
