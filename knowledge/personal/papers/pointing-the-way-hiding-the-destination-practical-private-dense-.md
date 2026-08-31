---
title: "Pointing the Way, Hiding the Destination: Practical Private Dense Retrieval at Scale"
tags: [chunk, graph]
source: ""
added: 2026-08-31
format: okf/v0
---

Hosted retrieval-augmented generation (RAG) and semantic search allow users to query valuable provider-held corpora, raising two competing demands: to hide each query and chosen result, yet reveal only the documents that the user is authorized to receive. Existing cryptographic approaches either make this costly by processing the entire corpus for every query, or sacrifice quality for efficiency by scanning a few clusters. We repurpose learned deep hashing as a private filter: a randomized binary code points the provider to a short candidate list, while encrypted reranking and oblivious key tr

Related: [[retrieval-and-rag]] [[embedding-spaces]]
