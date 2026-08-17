---
title: "AnchorFold: A Focus-Then-Fold Framework via Recursive Attention Propagation for Efficient Multi-Vector Visual Document Retrieval"
tags: [chunk]
source: ""
added: 2026-08-17
format: okf/v0
---

Multi-vector vision-language retrievers enable fine-grained Visual Document Retrieval (VDR) through late interaction, but storing and scoring hundreds of visual patch embeddings per page incurs substantial overhead. Existing training-free methods rely on pruning or merging: pruning degrades sharply under aggressive compression, whereas merging does not explicitly prioritize important regions when forming representatives. We introduce AnchorFold, a training-free focus-then-fold framework for document-side index compression. AnchorFold applies Recursive Attention Propagation over visual self-att

Related: [[retrieval-and-rag]]
