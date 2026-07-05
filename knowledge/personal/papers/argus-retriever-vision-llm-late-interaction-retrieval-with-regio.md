---
title: "Argus-Retriever: Vision-LLM Late-Interaction Retrieval with Region-Aware Query-Conditioned MoE for Visual Document Retrieval"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

Late-interaction vision-language retrievers represent each document page as many visual token embeddings and score queries with MaxSim. In systems such as ColPali, ColQwen, ColNomic, and Nemotron ColEmbed, the document embeddings are produced without seeing the query, so the same page is represented identically for a table lookup, a chart question, and a layout-sensitive evidence request. We introduce \textbf{Argus}, a family of query-conditioned late-interaction retrievers built on Qwen3.5-VL. Argus adds a region-aware Mixture-of-Experts module: the query encoder produces both retrieval embed

Related: [[retrieval-and-rag]]
