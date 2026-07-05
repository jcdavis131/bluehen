---
title: "Improving Long-Context Retrieval with Multi-Prefix Embedding"
tags: [chunk]
source: ""
added: 2026-07-05
format: okf/v0
---

Long-context retrieval exposes a tension: single-vector embeddings lose fine-grained detail, while token-level multi-vector methods incur prohibitive storage. We propose Multi-Prefix Embedding (MPE), which partitions a document into chunks separated by EOS tokens, encodes the full sequence in a single causal forward pass, and extracts one embedding at each prefix boundary. MPE retains cross-chunk context, enables chunk-level MaxSim matching, and trains with only document-level relevance labels. Experiments on MLDR-en, BrowseComp-Plus, and LongEmbed show that MPE is competitive with or outperfo

Related: [[retrieval-and-rag]]
