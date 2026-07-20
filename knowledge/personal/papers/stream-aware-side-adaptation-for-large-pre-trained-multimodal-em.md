---
title: "Stream-aware Side Adaptation for Large Pre-trained Multimodal Embedding Models in Sequential Recommendation"
tags: [head]
source: ""
added: 2026-07-20
format: okf/v0
---

Recently, large pretrained multimodal embedding models such as Qwen3-VL Embedding have shown strong promise for sequential recommendation, as they provide reusable semantic item representations across modalities and domains. However, directly using these embeddings often leads to suboptimal performance because of domain misalignment. Efficient side adaptation is therefore an attractive solution. Although adapting all backbone layers should help, existing side adapters often degrade with depth, prompting layer dropping despite the loss of useful hidden states. This is due to two major challenge

Related: [[adapters-and-heads]]
