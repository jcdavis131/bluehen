---
title: "PLAID-PRF: Pseudo-Relevance Feedback with Centroid-like Tokens in PLAID"
tags: [chunk]
source: ""
added: 2026-07-27
format: okf/v0
---

Multi-vector dense retrieval models, such as ColBERT, achieve strong retrieval effectiveness by modelling fine-grained token-level interactions between queries and documents. Methods such as PLAID use centroid-based quantisation of each token's vector to reduce the index size and speed up retrieval while maintaining strong effectiveness. In this work, we introduce PLAID-PRF, a method that performs Pseudo-Relevance Feedback (PRF) over PLAID to reformulate ColBERT's query vectors based on the top-retrieved results. In contrast with prior methods that perform PRF on multi-vector retrieval models,

Related: [[retrieval-and-rag]]
