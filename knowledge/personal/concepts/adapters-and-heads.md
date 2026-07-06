---
title: "Adapters, heads & MTNN"
tags: [concept]
source: "curated"
added: 2026-07-05
format: okf/v0
---

Small trained heads on a shared frozen backbone — the multi-tower/MTNN pattern. 3MB per tenant, panel-beating in-domain. The omni-embedding roadmap grows towers per data type.

<!-- okf:auto:begin -->
_Auto-synthesized from 10 corpus abstracts (mistral-small-latest, free tier) — every citation verified against the corpus. digest:6dcc27458258_

## Adapters and Heads: Modular Interfaces for Efficient and Specialized Learning

### **Adapters: Lightweight, Reconfigurable Modules**
Adapters provide parameter-efficient fine-tuning by inserting small, trainable modules into pre-trained models while keeping most weights frozen [arxiv:2605.07850, arxiv:2509.12960]. LoRA-based adapters, for example, decompose weight updates into low-rank matrices, enabling dynamic rank adaptation without exhaustive hyperparameter searches [arxiv:2605.07850]. ReLoRA extends this idea to pretraining by iteratively merging and reinitializing adapters, expanding cumulative rank over time to align with observed low-rank learning trajectories in large models [arxiv:2509.12960]. In retrieval systems, adapters can bridge embedding spaces between model versions, allowing zero-downtime upgrades by mapping new queries into legacy spaces [arxiv:2509.23471]. Practical designs vary from orthogonal transformations to residual MLPs, with empirical gains in recall and efficiency [arxiv:2509.23471].

### **Heads: Task-Specific Projections**
Projection heads transform backbone representations into task-aligned spaces, often determining optimization geometry and collapse dynamics. In self-supervised learning (SSL), linear heads implicitly perform subspace whitening, while nonlinear heads adapt local metrics to satisfy loss-specific constraints [arxiv:2605.17180]. Depth of the head modulates this capacity, and smooth activations (e.g., Swish) can induce negative curvature to escape dimensional collapse, unlike ReLU or linear heads [arxiv:2605.17180]. Contrastive methods rely on projection heads to enforce feature sparsity, assuming only a subset of features is necessary per mini-batch [arxiv:2307.08913]. Non-contrastive SSL (e.g., BYOL) further leverages prediction heads—often initialized as identity matrices—to prevent collapse, with trainable off-diagonal entries enabling competitive representations [arxiv:2205.06226].

### **Dual-Head Architectures: Unified Retrieval and Generation**
Some systems unify retrieval and generation via dual-head designs. Hydra, for instance, uses a single LoRA adapter toggled at inference: enabling it produces multi-vector embeddings for ColBERT-style retrieval, while disabling it preserves the base model’s generative quality [arxiv:2603.28554]. This approach avoids catastrophic forgetting by ensuring byte-for-byte identical language model weights in both modes [arxiv:2603.28554]. Similarly, permutation-invariant fine-tuning (PI-FT) addresses field-order sensitivity in structured metadata retrieval by randomizing field serialization, binding meaning to labels rather than positions [arxiv:2606.30473].

### **Key Trade-offs**
Adapters balance efficiency and performance but may underutilize capacity in small models, where rank deficiencies hinder learning [arxiv:2509.12960]. Heads introduce geometric constraints that can mitigate collapse but require careful initialization and depth selection [arxiv:2605.17180, arxiv:2205.06226]. Dual-head systems demand structural safeguards to prevent interference between tasks, such as attention-mode restoration and KV-cache-aware decoding [arxiv:2603.28554].
<!-- okf:auto:end -->
