---
title: "MoganColBERT-TR: A Late-Interaction Multi-Vector Retrieval Model for Turkish"
tags: [chunk, head]
source: ""
added: 2026-08-31
format: okf/v0
---

We previously reported a ModernBERT encoder trained from scratch for Turkish (MoganBERT-TR) and a single-vector embedding model built on top of it (MoganBERT-embed). This work introduces the third model in that lineage: MoganColBERT-TR, a multi-vector retrieval model that, instead of compressing a query or a document into a single vector, represents it at the token level through a 768->128 projection and scores it with MaxSim late interaction. The model is not trained from scratch: the embedding model's encoder is taken as the starting point and adapted to the ColBERT objective with a single-e

Related: [[retrieval-and-rag]] [[adapters-and-heads]]
