---
title: "$A^2$: Smaller Self-Supervised ViTs Localize Better than Larger Ones"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

Robust visual classification often depends on localizing the main foreground objects in an image while ignoring contextual distractors. Surprisingly, we find that the attention maps of smaller self-supervised ViTs localize foreground objects better than those of larger ViTs. However, we still need large ViTs, because they extract richer representations from each patch. To get the best of both worlds, good localization and rich representations, we propose $A^2$, a simple method that leverages this inverse scaling finding by decoupling where to look (a small attention model) from what to extract

Related: [[retrieval-and-rag]]
