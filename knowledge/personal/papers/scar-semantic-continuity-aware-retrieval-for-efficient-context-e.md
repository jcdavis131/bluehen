---
title: "SCAR: Semantic Continuity-Aware Retrieval for Efficient Context Expansion in RAG"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

Fixed-length chunking in Retrieval-Augmented Generation (RAG) often leads to boundary fragmentation, where critical evidence is split across segments, degrading retrieval recall. While static windowing and parent retrieval improve recall, they introduce significant token overhead. We propose SCAR (Semantic Continuity-Aware Retrieval), an adaptive retrieval policy that selectively expands neighboring chunks by weighing query-neighbor relevance against a structural continuity penalty. SCAR uses a relative expansion threshold tied to each retrieved chunk's own query-relevance, yielding an approxi

Related: [[retrieval-and-rag]]
