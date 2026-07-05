---
title: "Tail-Aware Adaptive-k: Query-Adaptive Context Selection for Retrieval-Augmented Generation"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

Adaptive context selection is critical for retrieval-augmented generation (RAG) systems, as fixed Top-K retrieval fails under query-dependent and heavy-tailed similarity distributions. While Extreme Value Theory (EVT) offers a principled framework for adaptive truncation, existing approaches apply EVT globally across the entire ranked list, incurring prohibitive computational costs and statistical instability. We propose Tail-Aware Adaptive-k(TAA-k), a training-free framework that operationalizes EVT through a localized validation strategy. The key insight is that ranked similarity curves exhi

Related: [[retrieval-and-rag]]
