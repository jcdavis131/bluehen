---
title: "ARC-CT: Anatomy-Routed Contrastive Vision-Language Learning for 3D Chest CT"
tags: [loss, pairs]
source: ""
added: 2026-08-31
format: okf/v0
---

Contrastive vision-language learning uses paired chest CT volumes and radiology reports to learn abnormality classifiers without manually annotated labels. However, two characteristics of chest CT challenge conventional global contrastive learning. First, many critical abnormalities are small or anatomically localized, and pooling an en- tire volume into a single embedding may dilute their visual evidence. Second, the standard contrastive objective treats every other scan in a batch as a negative. Because many chest CTs share abnormalities, this objective incorrectly pushes co-positive pairs a

Related: [[contrastive-objectives]] [[hard-negatives]]
