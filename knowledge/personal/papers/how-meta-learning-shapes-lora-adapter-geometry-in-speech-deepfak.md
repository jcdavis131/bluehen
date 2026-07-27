---
title: "How Meta-Learning Shapes LoRA Adapter Geometry in Speech Deepfake Detection"
tags: [head]
source: ""
added: 2026-07-27
format: okf/v0
---

Meta-learning for domain generalization (MLDG) improves out-of-distribution speech deepfake detection over empirical risk minimization (ERM) when both objectives train low-rank adapters on the same frozen self-supervised speech model. Because the architecture and adapter capacity are held fixed, this gap points to differences in how the training objective shapes the adapter, yet the field characterizes objectives through error rates rather than through the geometry of the solution they reach. We introduce a descriptive diagnostic for this question: holding architecture, rank, data, and seeds f

Related: [[adapters-and-heads]]
