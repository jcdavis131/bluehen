---
title: "DSPrompt: Dynamic Soft Prompt Defense Against M-RAG Corruption"
tags: [chunk]
source: ""
added: 2026-08-24
format: okf/v0
---

Multimodal Retrieval Augmented Generation (M-RAG) is increasingly vulnerable to adversarial attacks where malicious data are crafted to produce embeddings that align with benign entries in the vector space, deceiving retrieval and inducing harmful outputs. Existing defenses primarily operate at query time, relying on auxiliary detectors, similarity re-ranking, or feature-consistency checks. However, these approaches suffer from non-trivial inference overhead, generalize poorly to unseen attack strategies, and often assume specific attack distributions. To address this, we propose DSPrompt, a D

Related: [[retrieval-and-rag]]
