---
title: "SHARD: cell-keyed residual splitting for alignment-resistant private dense retrieval"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

Dense embeddings underpin semantic search and retrieval-augmented generation, yet a leaked vector store hands much of the underlying text back. Modern inversion and alignment attacks share one weakness: the protected store is a single global geometry, and any single geometry can be aligned to a known one - a secret global rotation included, since orthogonal Procrustes recovers it from about subspace-dimension known-plaintext pairs. We introduce SHARD, a retrieval-preserving embedding transform that removes that weak axis. The centred embedding is rotated and split into a short public prefix (d

Related: [[retrieval-and-rag]]
