---
title: "Chimera: Efficient Multi-Vector Retrieval via GPU-CPU Co-Processing"
tags: [chunk]
source: ""
added: 2026-08-31
format: okf/v0
---

Multi-vector retrieval has become an important primitive for fine-grained matching in information retrieval, with emerging applications in areas such as recommender systems and bioinformatics. However, its high computational complexity and memory costs make low-latency retrieval difficult. Prior systems have attempted to optimize query latency, but their designs remain CPU-centric. While GPUs offer substantial computational advantages, their limited memory capacity necessitates a heterogeneous architecture in which the dataset resides in host memory and the GPU serves as an accelerator. Existi

Related: [[retrieval-and-rag]]
