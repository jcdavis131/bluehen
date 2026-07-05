---
title: "Multi-Vector Embeddings are Provably More Expressive than Single Vector Embeddings"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

Multi-vector (MV) embeddings have become a powerful paradigm in neural information retrieval (IR), achieving high retrieval accuracy by representing data with multiple vectors and scoring them via the non-linear Chamfer similarity. Despite their widely perceived superiority over single-vector (SV) embeddings which use inner product similarity, to date there is no formal proof that SV similarities cannot approximate MV similarities with the same representation size. Specifically, we ask the following: for any bounded dataset size $n \leq 2^{poly(m)}$, what is the smallest dimension $D$ so that

Related: [[retrieval-and-rag]]
