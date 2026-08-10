---
title: "Douyin Multimodal Embedding Model Technical Report"
tags: [loss]
source: ""
added: 2026-08-10
format: okf/v0
---

Multimodal representation learning is a cornerstone of modern AI. By encoding multimodal queries and targets into vectors, it powers industrial search and recommendation and underpins modern agents. Real-world platforms with complex modalities and massive-scale content, such as Douyin, Xiaohongshu, and YouTube, demand both efficiency under billion-scale indexing and fine-grained discrimination for hard matching. Existing MLLM embedding models rarely satisfy both. Contrastive models are efficient but rely on pair-level supervision too coarse for fine-grained distinctions, while CoT-based models

Related: [[contrastive-objectives]]
