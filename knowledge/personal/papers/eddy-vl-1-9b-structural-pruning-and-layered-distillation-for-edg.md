---
title: "Eddy-VL 1.9B: Structural Pruning and Layered Distillation for Edge-Deployable Multimodal Embedding"
tags: [chunk]
source: ""
added: 2026-07-27
format: okf/v0
---

In this report, we introduce Eddy-VL 1.9B, a compressed multimodal embedding model built on Qwen3-VL-Embedding-2B for offline, edge-deployable vision-language retrieval. Eddy-VL targets air-gapped forensic and investigative settings where cloud APIs are unavailable and low latency is essential. Compression combines (i) probe-driven structural pruning that removes four redundant text-decoder layers (28 to 24) ranked by adjacent-layer linear CKA, and (ii) layered knowledge distillation with hole-covering teacher-student mappings, mid-layer attention-map 1-CKA, and final-layer MSE and cosine loss

Related: [[retrieval-and-rag]]
