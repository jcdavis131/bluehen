---
title: "Do All Visual Tokens Matter Equally? Object-Evidence Preserving Token Merging for Vision-Language Retrieval"
tags: [chunk]
source: ""
added: 2026-07-13
format: okf/v0
---

Multi-vector vision-language retrieval preserves fine-grained visual evidence through maximum-similarity late interaction, but dense image-side tokens make storage and scoring expensive. Existing token compression methods reduce this cost, yet they can remove or collapse object- and region-level evidence that future query tokens may need to select. We propose SaMer, an object-aware token merging framework that compresses image-side post-projector tokens into $K$ representative centroids while preserving the original late-interaction interface. SaMer uses object annotations only during training

Related: [[retrieval-and-rag]]
