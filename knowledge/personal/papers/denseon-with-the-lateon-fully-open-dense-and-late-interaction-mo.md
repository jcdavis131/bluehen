---
title: "DenseOn with the LateOn: Fully Open Dense and Late-Interaction Models for Multilingual, Long-Context, and Code Search"
tags: [chunk, loss, pairs]
source: ""
added: 2026-08-03
format: okf/v0
---

State-of-the-art retrieval models increasingly rely on closed training data, creating a reproducibility gap. We present an open end-to-end recipe for training retrieval models and study how English supervision transfers to multilingual retrieval through translate-train. We first reconstruct and curate 665M English contrastive pre-training pairs from 1.4B pairs across 34 public sources and build 1.88M supervised fine-tuning pairs with mined hard negatives. Training yields two 149M-parameter models: DenseOn, a single-vector dense model, and LateOn, a ColBERT-style late-interaction model. They ac

Related: [[contrastive-objectives]] [[retrieval-and-rag]] [[hard-negatives]]
