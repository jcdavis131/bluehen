---
title: "Domain-Specific Text Embedding Models for Entity Resolution"
tags: [chunk, pairs]
source: ""
added: 2026-08-24
format: okf/v0
---

General-purpose text embedding models are designed to capture semantic similarity but are not optimised for distinguishing entity records that represent the same real-world business or person. This limitation affects applications such as entity resolution and duplicate record retrieval, where small textual differences may either preserve or change identity. This paper investigates whether domain-specific triplet fine-tuning can adapt pretrained embedding models for identity-sensitive retrieval. A synthetic dataset of business and person records was created with identity-preserving variations a

Related: [[retrieval-and-rag]] [[hard-negatives]]
