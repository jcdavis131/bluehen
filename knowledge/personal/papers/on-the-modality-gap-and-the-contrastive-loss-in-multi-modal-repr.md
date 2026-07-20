---
title: "On the modality gap and the contrastive loss in multi-modal representation learning"
tags: [loss]
source: ""
added: 2026-07-20
format: okf/v0
---

We study the modality gap in CLIP-style dual-encoder contrastive learning, where image and text embeddings remain misaligned despite being trained in a shared space. We argue that the gap is induced by a failure of the InfoNCE formulation with independent encoders. We conduct a uni-modal experiment with two independent encoders and identical initialization conditions and find that InfoNCE actively generates a gap at low temperatures. We provide a theoretical analysis of this phenomenon and show that the modality gap is indeed a mode-failure of InfoNCE, but only at low temperatures. We propose

Related: [[contrastive-objectives]]
