---
title: "The Matryoshka Hypencoder"
tags: [chunk, loss]
source: ""
added: 2026-07-27
format: okf/v0
---

The Hypencoder is a recently-proposed retrieval approach that encodes queries as shallow neural networks ("Q-Nets") that estimate relevance over pre-computed document embeddings. Inspired by Matryoshka Representation Learning, we show that the Hypencoder can be extended to support multiple sizes of Q-Nets, allowing trade-offs between effectiveness and efficiency when deployed. We find that this "Matryoshka Hypencoder" achieves comparable in-domain effectiveness with approximately 7x fewer active parameters in-domain and half as many active parameters out-of-domain, which corresponds to a 1.6-3

Related: [[contrastive-objectives]] [[retrieval-and-rag]]
