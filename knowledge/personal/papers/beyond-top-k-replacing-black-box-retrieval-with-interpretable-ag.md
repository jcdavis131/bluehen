---
title: "Beyond Top-K: Replacing Black-Box Retrieval with Interpretable Agentic Operations"
tags: [chunk, graph]
source: ""
added: 2026-08-10
format: okf/v0
---

Retrieval-augmented generation over long documents is dominated by one design: chunk the text, embed the chunks, and surface the top-k nearest neighbours of the query. We argue that for an important class of documents -- financial statements, audit reports, regulatory returns -- this design is structurally unsound, and we make the argument measurable. On a 780-page government financial report, 86.8% of content lines are table rows, thousands of near-identical figures compete in one embedding space, and a figure inherits its unit from a header a median of 13 lines above it -- so a chunk boundar

Related: [[retrieval-and-rag]] [[embedding-spaces]]
