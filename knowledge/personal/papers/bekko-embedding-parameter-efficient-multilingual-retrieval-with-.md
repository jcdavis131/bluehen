---
title: "Bekko Embedding: Parameter-Efficient Multilingual Retrieval with Ultra-Compact Encoders"
tags: [chunk]
source: ""
added: 2026-08-03
format: okf/v0
---

How small can a competitive multilingual retrieval model be? We present Bekko Embedding: its smallest model, bekko-embedding-v1-a8m, has just under 8M Active Parameters (AP) -- the non-embedding parameters that dominate inference compute -- yet on official MMTEB Multilingual v2 Retrieval (nDCG@10) it scores 56.2, above the multilingual-e5 family and BGE-M3 (40x the AP) in our comparison. The higher-quality bekko-embedding-v1-a25m (just under 25M AP) reaches 57.5, on par with gte-multilingual-base, and Multilingual NanoBEIR (14 languages) confirms the trend. Both models handle inputs of up to 8

Related: [[retrieval-and-rag]]
