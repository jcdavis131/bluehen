---
title: "Real-Time Hybrid Retrieval in Hyperbolic Space for Retrieval-Augmented Generation on Edge Devices"
tags: [chunk]
source: ""
added: 2026-08-10
format: okf/v0
---

This paper presents a hybrid document retrieval system designed for retrieval-augmented generation (RAG) that operates entirely within the Lorentz model of hyperbolic geometry. Unlike conventional dense retrievers confined to Euclidean space, this system projects pretrained word embeddings into hyperbolic space through a learned HyTE-H transformation, whose exponential volume growth suits the hierarchical organization of natural language. Documents are segmented into overlapping chunks, indexed by their Lorentz embeddings, and retrieved through a two-stage pipeline that first applies BM25 lexi

Related: [[retrieval-and-rag]]
