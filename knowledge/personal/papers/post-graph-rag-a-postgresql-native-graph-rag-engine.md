---
title: "post-graph-rag: A PostgreSQL-Native Graph RAG Engine"
tags: [chunk, graph]
source: ""
added: 2026-08-31
format: okf/v0
---

Graph-based retrieval-augmented generation connects facts that no single passage states, but current implementations pay for that three times: in infrastructure, requiring a vector store, graph database and document store to be kept consistent; in graph quality, because an extraction pipeline that never refuses output fills the graph with edges that assert nothing; and over time, because a graph that only accumulates treats superseded and current facts alike. post-graph-rag is an open-source engine addressing all three. Text chunks with embeddings, a canonical entity graph and community summar

Related: [[retrieval-and-rag]] [[embedding-spaces]]
