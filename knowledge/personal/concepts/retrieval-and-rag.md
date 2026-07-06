---
title: "Retrieval & RAG"
tags: [concept]
source: "curated"
added: 2026-07-05
format: okf/v0
---

Retrieval as a product surface and as agent context. The Qodo lesson: context-assembly RAG loses to tool-using agents; ranking at product latency does not.

<!-- okf:auto:begin -->
_Auto-synthesized from 10 corpus abstracts (llama-3.3-70b-versatile, free tier) — every citation verified against the corpus. digest:820873c3c1b0_

## Introduction to Retrieval and RAG
Retrieval-Augmented Generation (RAG) is a key technological axis for next generation information retrieval, mitigating the hallucination phenomenon in Large Language Models (LLMs) and effectively incorporating up-to-date information [arxiv:2512.00772]. RAG systems integrate external knowledge retrieval into the reasoning process, addressing limitations of purely parametric models [arxiv:2604.07274]. However, the impact of individual retrieval components on performance remains insufficiently understood [arxiv:2604.07274].

## Retrieval Strategies and RAG
Various retrieval strategies have been proposed for RAG systems, including Dense Vector Search, Hybrid BM25 + Dense retrieval, Cross-Encoder Reranking, Multi-Query Expansion, and Maximal Marginal Relevance (MMR) [arxiv:2605.02520]. The choice of retrieval strategy can significantly affect the performance of RAG systems [arxiv:2605.02520]. Additionally, generative retrieval has been shown to be equivalent to single-vector dense retrieval [arxiv:2404.00684], and can exhibit behavior analogous to hierarchical search within a tree index in dense retrieval [arxiv:2404.00684].

## Security Threats to RAG Systems
RAG systems are vulnerable to security threats, such as knowledge injection attacks, which can manipulate retrieved evidence and mislead downstream generation [arxiv:2606.18310]. Conflict-aware retriever editing has been proposed as a model-centric retriever attack framework for malicious knowledge injection in RAG [arxiv:2606.18310]. This highlights the need for secure and robust retrieval strategies in RAG systems.

## Future Directions
The development of efficient and effective retrieval strategies for RAG systems is an active area of research [arxiv:2606.02581, arxiv:2602.12278]. Future work should focus on improving the security and robustness of RAG systems, as well as exploring new retrieval strategies and architectures [arxiv:2606.18310, arxiv:2405.13792].
<!-- okf:auto:end -->
