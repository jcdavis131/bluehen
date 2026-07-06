---
title: "Retrieval & RAG"
tags: [concept]
source: "curated"
added: 2026-07-05
format: okf/v0
---

Retrieval as a product surface and as agent context. The Qodo lesson: context-assembly RAG loses to tool-using agents; ranking at product latency does not.

<!-- okf:auto:begin -->
_Auto-synthesized from 10 corpus abstracts (mistral-small-latest, free tier) — every citation verified against the corpus. digest:e3bf885e43fd_

```markdown
## Retrieval and RAG: Concepts and Challenges

### Generative vs. Dense Retrieval
Generative retrieval produces document identifiers directly via sequence-to-sequence models, while dense retrieval matches queries to document embeddings using similarity search [arxiv:2404.00684]. Prior work shows that generative retrieval with atomic identifiers is equivalent to single-vector dense retrieval, and hierarchical identifiers induce behavior analogous to tree-based dense retrieval [arxiv:2404.00684]. However, existing analyses focus on retrieval stages and do not fully account for decoder-level interactions in generative retrieval [arxiv:2404.00684].

### Coverage-Aware and Long-Form Retrieval
Long-form RAG requires coverage-based ranking to ensure inclusion of all relevant facts for synthesis [arxiv:2605.28522]. CoveR addresses this by training a bi-encoder with coverage-aware contrastive and distillation objectives, using synthetic coverage signals derived from sub-question answerability judgments [arxiv:2605.28522]. For long documents, AttentionRetriever leverages attention mechanisms and entity-based retrieval to build context-aware embeddings and determine retrieval scope, outperforming existing models on long document datasets [arxiv:2602.12278].

### Efficiency and Routing in RAG
Retrieval depth introduces a trade-off between factual grounding and computational cost [arxiv:2606.02581]. Cost-Aware RAG (CA-RAG) mitigates this by selecting per-query retrieval strategies from a catalog of bundles, balancing quality, latency, and token usage [arxiv:2606.02581]. Extreme context compression methods like xRAG reinterpret document embeddings as retrieval features and fuse them into the language model’s representation space, achieving high compression while preserving performance [arxiv:2405.13792].

### Security and Human-in-the-Loop RAG
RAG systems are vulnerable to model-centric attacks such as CAREATTACK, which injects malicious knowledge by editing retriever parameters without altering the corpus [arxiv:2606.18310]. Human-in-the-loop frameworks like SHRAG integrate query strategists to transform unstructured queries into structured forms, improving retrieval precision and processing speed [arxiv:2512.00772].

### Biomedical RAG Benchmarks
In biomedical QA, controlled studies compare retrieval strategies including dense vector search, hybrid retrieval, cross-encoder reranking, query expansion, and MMR, using fixed generation and embedding models to isolate retrieval effects [arxiv:2605.02520].
```
<!-- okf:auto:end -->
