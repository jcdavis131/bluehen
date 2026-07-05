---
title: "KaLM-Reranker-V1: Fast but Not Late Interaction for Compressed Document Reranking"
tags: [chunk, loss]
source: ""
added: 2026-07-05
format: okf/v0
---

As retrieval systems scale, high-quality reranking becomes increasingly important. However, most existing rerankers, whether encoder-based or decoder-based, jointly encode the query and passage, tightly coupling their computation and limiting deployment efficiency as well as flexibility. We present KaLM-Reranker-V1, a fast but not late-interaction (FBNL) reranker that decouples query and passage computation while retaining expressive relevance modeling. Built on an encoder-decoder architecture, KaLM-Reranker-V1 uses the encoder to pre-encode passages with Matryoshka embedding pooling, while th

Related: [[contrastive-objectives]] [[retrieval-and-rag]]
