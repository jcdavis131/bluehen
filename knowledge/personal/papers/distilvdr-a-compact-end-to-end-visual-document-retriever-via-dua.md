---
title: "DistilVDR: A Compact End-to-End Visual Document Retriever via Dual-Student Distillation"
tags: [chunk, graph]
source: ""
added: 2026-08-17
format: okf/v0
---

Visual document retrieval (VDR) is dominated by multi-billion-parameter models that are slow to index at full corpus scale and expensive to serve. Prior compression routes either train a smaller multi-vector encoder from scratch or distil only the query side; neither yields a compact single-vector retriever end-to-end. We present DistilVDR, a 524M end-to-end VDR system distilled bilaterally from a single 8B vision-language teacher under a pointwise cosine alignment loss. All supervision comes from the frozen teacher's embedding space, which was itself trained with relevance supervision, so the

Related: [[retrieval-and-rag]] [[embedding-spaces]]
