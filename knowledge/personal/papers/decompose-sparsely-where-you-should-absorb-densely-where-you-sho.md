---
title: "Decompose Sparsely Where You Should, Absorb Densely Where You Should No"
tags: [graph]
source: ""
added: 2026-07-05
format: okf/v0
---

Sparse autoencoders (SAEs) are typically trained to reconstruct the \textbf{entire} residual stream through a sparse dictionary, implicitly assuming that all activation content is amenable to sparse, monosemantic decomposition. We question this assumption and hypothesize that activations contain a low-rank, dense component that is computationally important to the model yet inherently unsuitable for sparse representation, which serves as a major source of the persistent dense latents widely observed in trained SAEs. To test this, we add a small rank-$r$ linear bottleneck in parallel with standa

Related: [[embedding-spaces]]
