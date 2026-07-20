---
title: "Score-Only Distillation for Compact Dense Retrieval"
tags: [chunk, pairs]
source: ""
added: 2026-07-20
format: okf/v0
---

Large embedding models improve retrieval quality, but serving large encoders online is expensive. We study whether a compact retriever can learn teacher ranking behavior from score vectors without access to teacher hidden states. The student trains on rows built from ground-truth positives and negative candidates produced by our data generation pipeline; we evaluate student-teacher hard-negative mining separately as an extension. We use a row-centered score-vector objective, a memory-efficient implementation of uniform all-pairs PairMSE loss. On a fixed eight-task evaluation panel, our distill

Related: [[retrieval-and-rag]] [[hard-negatives]]
