---
title: "Contrastive objectives"
tags: [concept]
source: "curated"
added: 2026-07-05
format: okf/v0
---

How embedding models learn what belongs together: InfoNCE, Barlow Twins, VICReg, Matryoshka. Our measured results: Barlow adapts in-domain while IMPROVING out-of-domain (EVIDENCE 3.16); no objective separates beyond seed noise on pool-16 (3.15).

<!-- okf:auto:begin -->
_Auto-synthesized from 10 corpus abstracts (llama-3.3-70b-versatile, free tier) — every citation verified against the corpus. digest:2f59555548bf_

## Introduction to Contrastive Objectives
Contrastive objectives are a key component of contrastive learning, a technique used to learn high-quality representations of data [arxiv:2201.05979]. The goal of contrastive learning is to pull together semantically similar samples (positive pairs) and push apart dissimilar samples (negative pairs) [arxiv:2201.05979]. This is typically achieved using a contrastive loss function, such as InfoNCE, which encourages the model to distinguish between positive and negative pairs [arxiv:2109.04321].

## Challenges with Contrastive Objectives
However, contrastive objectives can suffer from several challenges, including feature suppression and the overestimation of semantic similarity between pairs with similar textual features [arxiv:2201.05979]. Additionally, the use of hard negative samples can be problematic, as it can lead to overfitting and poor performance on downstream tasks [arxiv:2310.06918]. To address these challenges, several techniques have been proposed, including the use of focal-InfoNCE [arxiv:2310.06918] and smoothed contrastive learning [arxiv:2109.04321].

## Techniques for Improving Contrastive Objectives
Several techniques have been proposed to improve contrastive objectives, including the use of hard negative mining [arxiv:2511.08029], explicit hard negative gradient amplifying [arxiv:2506.02020], and probabilistic variational contrastive learning [arxiv:2506.10159]. These techniques aim to improve the quality of the representations learned by contrastive learning models and to address the challenges associated with contrastive objectives. Additionally, some works have focused on improving the geometry of the representation space, such as achieving an Equiangular Tight Frame (ETF) [arxiv:2311.05139].

## Applications of Contrastive Objectives
Contrastive objectives have been applied to a wide range of tasks, including unsupervised sentence embedding [arxiv:2201.05979], image-text matching [arxiv:2210.10163], and recommendation systems [arxiv:2402.02079]. These applications demonstrate the versatility and effectiveness of contrastive objectives in learning high-quality representations of data. However, the abstracts do not provide a comprehensive overview of the topic, and some aspects of contrastive objectives are not covered.
<!-- okf:auto:end -->
