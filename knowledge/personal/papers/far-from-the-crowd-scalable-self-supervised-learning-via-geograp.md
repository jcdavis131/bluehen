---
title: "Far from the Crowd: Scalable Self-Supervised Learning via Geographic Isolation"
tags: [graph, loss]
source: ""
added: 2026-08-24
format: okf/v0
---

Self-supervised pretraining on remote sensing imagery typically treats all samples as equally informative, despite large variability in geographic and visual structure. We propose a curriculum learning strategy for self-supervised Earth observation that ranks samples by geographic isolation, a label-free proxy derived entirely from geolocation metadata already present in geospatial datasets, requiring no image decoding, no model feedback, and no manual annotation. Unlike visual complexity proxies, it scales as O(D log D) with dataset size D and is well-defined for both contrastive and reconstr

Related: [[contrastive-objectives]] [[embedding-spaces]]
