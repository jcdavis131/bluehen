---
title: "TileMaxSim: IO-Aware GPU MaxSim Scoring with Dimension Tiling and Fused Product Quantization"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

Multi-vector retrieval models such as ColBERT achieve state-of-the-art accuracy through fine-grained token-level MaxSim scoring, yet existing GPU implementations leave most hardware performance unused. We give a roofline analysis of MaxSim on modern GPUs and identify a severe bandwidth gap: naive implementations reach only 5-18% of peak HBM bandwidth because they materialize the Nq x Nd similarity matrix, wasting memory traffic on data that is consumed once and discarded. We present TileMaxSim, a family of IO-aware Triton kernels that close this gap via (1) multi-query SRAM tiling that streams

Related: [[retrieval-and-rag]]
