---
title: "Field Order Should Not Matter: Permutation-Invariant Embedding Model Fine-Tuning for Structured Metadata Retrieval"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

We study retrieval over catalogs of structured metadata, where each record is a small schema whose fields answer different kinds of query. Embedding a record with a text encoder first serializes its fields into a string, which forces a choice of field order. We show this choice, usually treated as an implementation detail, silently controls retrieval quality once the encoder is fine-tuned. A standard fine-tune loses 7.4 nDCG@10 points when the index is rebuilt under a different field order, because it reads absolute position instead of the field labels. We propose permutation-invariant fine-tu

Related: [[retrieval-and-rag]]
