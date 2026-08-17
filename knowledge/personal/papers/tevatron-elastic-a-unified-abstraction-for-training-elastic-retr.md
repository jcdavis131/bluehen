---
title: "Tevatron-Elastic: A Unified Abstraction for Training Elastic Retrievers and Rerankers"
tags: [chunk]
source: ""
added: 2026-08-17
format: okf/v0
---

A single model scale challenges the flexibility of a production retrieval system: some settings need it faster, others need a smaller index, and the right trade-off changes with the workload. In the context of information retrieval (IR), a transformer-based model can be made smaller in three ways---using fewer layers, passing fewer tokens through the upper layers, or producing a shorter embedding---and each way saves a different compute resource. These options have been studied one at a time, each as its own method with its own code and training setup, which makes them hard to combine or adapt

Related: [[retrieval-and-rag]]
