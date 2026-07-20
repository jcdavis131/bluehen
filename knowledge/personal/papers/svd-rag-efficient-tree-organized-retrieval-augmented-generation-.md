---
title: "SVD-RAG: Efficient Tree-Organized Retrieval-Augmented Generation via Singular Value Decomposition"
tags: [chunk]
source: ""
added: 2026-07-20
format: okf/v0
---

Retrieval-Augmented Generation (RAG) systems enhance large language models by retrieving relevant documents from external knowledge bases. Recent work by Sarthi et al. (2024) introduced RAPTOR, which organizes documents into hierarchical tree structures for efficient retrieval, but requires expensive LLM-based abstractive summarization at each internal node -- making large-scale deployment prohibitively costly. We present SVD-RAG, the first method to apply Singular Value Decomposition (SVD) on dense sentence embedding matrices for extractive summarization in hierarchical RAG. Unlike classical

Related: [[retrieval-and-rag]]
