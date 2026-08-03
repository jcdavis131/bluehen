---
title: "Models for minimalist RAG: B1ade 335M Embedding and 1B Parameter Small Language Models"
tags: [chunk]
source: ""
added: 2026-08-03
format: okf/v0
---

Language and embedding models used in RAG systems are conventionally assumed to require large-scale pretraining and explicit grounding supervision. We present B1ade, an efficient RAG architecture comprising two purpose-built components: a compact embedding model and a purpose-built SLM. B1ade-embed, a 335M parameter retrieval model constructed via parameter-free fusion of five pretrained encoders achieves top MTEB scores among sub-500M models with zero additional training, and B1ade-1B, an SLM trained on low-cost GPUs using Group Relative Policy Optimization (GRPO) on 723M tokens (2.2M example

Related: [[retrieval-and-rag]]
