---
title: "Hard negatives"
tags: [concept]
source: "curated"
added: 2026-07-05
format: okf/v0
---

The data class money can't buy. Mined adversarially by humans in Beat the Baseline; jaccard-hard negatives in the pair builder (RAG-503).

<!-- okf:auto:begin -->
_Auto-synthesized from 10 corpus abstracts (mistral-small-latest, free tier) — every citation verified against the corpus. digest:46f9746f412f_

```markdown
## Hard Negatives in Dense Retrieval

Hard negatives—semantically similar but irrelevant documents—are critical for training effective dense retrieval models by forcing models to refine decision boundaries [arxiv:2511.08029]. Traditional mining relies on cross-encoders or static embeddings to rank candidates by similarity, but this is challenging in domains like biomedicine where relevance distinctions are subtle [arxiv:2511.08029].

### Domain-Specific Challenges
In biomedical retrieval, citation links provide a natural source of hard negatives: referenced documents share contextual relevance yet avoid duplication, making them ideal candidates for contrastive training [arxiv:2511.08029]. Enterprise systems face similar issues, where overlapping terminologies and semantic mismatches degrade retrieval; targeted hard-negative mining can improve re-ranker performance by up to 15% in MRR@3 [arxiv:2505.18366].

### Multi-Modal and Self-Supervised Approaches
For multimodal models, hard negatives remain central to contrastive learning, but their contribution to gradient updates is understudied [arxiv:2506.02020]. Self-aware Hard Negative Sampling (SaHa) shifts mining from candidate-space retrieval to query-space mapping, reducing false negatives by anchoring task definitions at the system level [arxiv:2508.00955]. Focal-InfoNCE further refines this by downweighting easy negatives, explicitly focusing the model on harder cases [arxiv:2310.06918].

### False Negatives and Knowledge-Aware Losses
False negatives—semantically related but incorrectly labeled as negatives—pose a persistent problem, particularly in medical imaging where patient-specific reports may share semantics [arxiv:2210.10163]. Knowledge-aware losses, such as semantic matching based on medical knowledge, can mitigate this issue [arxiv:2210.10163].

### Practical Considerations
Hard-negative mining pipelines are often resource-intensive, relying on offline construction and complex multi-task objectives that risk performance trade-offs [arxiv:2511.13885]. Reinforcement learning frameworks like Retrieval-GRPO aim to address these inefficiencies by optimizing multiple objectives simultaneously [arxiv:2511.13885].
```
<!-- okf:auto:end -->
