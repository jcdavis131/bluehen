---
title: "When Graph-JEPA Learns the Wrong Thing: Diagnosing and Repairing Category-Conditional Collapse"
tags: [chunk, graph]
source: ""
added: 2026-08-24
format: okf/v0
---

Joint-embedding predictive architectures are selected almost universally by linear probing and effective rank. We report a case where both read healthily while the representation carries zero usable instance information. We repair it, and a second failure appears: the repaired metric saturates on a target carrying no structural information. Our corpus is a scientific-reasoning graph over 57,903 articles, each a subgraph. A Graph-JEPA predicts one masked aspect from a subgraph's remaining aspects, attaining linear-probe accuracy 0.871 and effective rank 18-47, yet retrieval recovers 0.00 of 14.

Related: [[retrieval-and-rag]] [[embedding-spaces]]
