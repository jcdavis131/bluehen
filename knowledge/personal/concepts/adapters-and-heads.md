---
title: "Adapters, heads & MTNN"
tags: [concept]
source: "curated"
added: 2026-07-05
format: okf/v0
---

Small trained heads on a shared frozen backbone — the multi-tower/MTNN pattern. 3MB per tenant, panel-beating in-domain. The omni-embedding roadmap grows towers per data type.

<!-- okf:auto:begin -->
_Auto-synthesized from 10 corpus abstracts (llama-3.3-70b-versatile, free tier) — every citation verified against the corpus. digest:86249e88bc03_

## Introduction to Adapters and Heads
Adapters and heads are crucial components in various deep learning models, particularly in natural language processing and self-supervised learning [arxiv:2605.07850, arxiv:2509.12960]. Adapters are used to fine-tune pre-trained models, enabling them to adapt to new tasks or datasets while keeping the original model's weights intact [arxiv:2605.07850]. Heads, on the other hand, refer to the output layers of a model, responsible for generating predictions or representations [arxiv:2605.17180].

## Types of Adapters and Heads
Different types of adapters and heads have been proposed in the literature. For example, Low-Rank Adaptation (LoRA) is a popular method for parameter-efficient fine-tuning [arxiv:2605.07850]. ReLoRA extends this idea to pretraining by repeatedly merging and reinitializing low-rank adapters [arxiv:2509.12960]. Projection heads are used in self-supervised learning to model the head as a trainable Riemannian metric on the backbone representation manifold [arxiv:2605.17180].

## Applications of Adapters and Heads
Adapters and heads have various applications in natural language processing, self-supervised learning, and computer vision. For instance, adapters can be used to upgrade embedding models in production vector databases with minimal disruption [arxiv:2509.23471]. Heads can be used to improve the quality of representations in contrastive learning [arxiv:2307.08913]. Additionally, adapters and heads can be used in speaker verification systems to enhance knowledge transfer efficiency between different domains [arxiv:2508.07836].

## Challenges and Limitations
Despite the effectiveness of adapters and heads, there are challenges and limitations to their use. For example, the choice of field order in embedding models can silently control retrieval quality [arxiv:2606.30473]. Moreover, fine-tuning large embedding models can be computationally expensive and memory-intensive [arxiv:2604.03403]. Therefore, efficient and effective methods for training adapters and heads are crucial to overcome these challenges.
<!-- okf:auto:end -->
