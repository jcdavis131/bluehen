---
title: "Coverage Matters: MarginMerge for Compressing Multi-Vector Visual Document Retrievers"
tags: [chunk]
source: ""
added: 2026-08-10
format: okf/v0
---

Multi-vector visual document retrievers such as ColPali and ColQwen achieve strong retrieval by storing fine-grained patch embeddings, but this produces large indexes and costly late-interaction scoring. We argue that effective compression should preserve query-relevant coverage, meaning the diverse document regions that may become the strongest MaxSim match across queries, rather than selecting patches independently by salience. This view also explains why dense rendered pages are easier to compress than natural images. We introduce MarginMerge, a compression method for frozen multi-vector re

Related: [[retrieval-and-rag]]
