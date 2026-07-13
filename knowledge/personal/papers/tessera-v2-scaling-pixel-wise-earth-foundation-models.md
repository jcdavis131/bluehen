---
title: "TESSERA v2: Scaling Pixel-wise Earth Foundation Models"
tags: [loss]
source: ""
added: 2026-07-13
format: okf/v0
---

Pixel-wise Earth-observation (EO) foundation models are now achieving state-of-the-art performance via generated spatial embeddings. However, how these models scale and how best to spend a pretraining budget remain poorly understood. We present the largest controlled scaling study for EO to date: 395 training runs on 1,024 GH200 superchips within a fixed pixel-wise Barlow Twins family, each evaluated on 15 downstream tasks. We find that pretraining loss barely predicts downstream performance (|Pearson r| < 0.2), so selecting models by loss wastes a large share of the compute. We also find that

Related: [[contrastive-objectives]]
