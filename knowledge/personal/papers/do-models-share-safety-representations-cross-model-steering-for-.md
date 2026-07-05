---
title: "Do Models Share Safety Representations? Cross-Model Steering for Safe Visual Generation"
tags: [graph]
source: ""
added: 2026-07-05
format: okf/v0
---

Recent progress in generative modeling has made safety control a central challenge, yet existing approaches remain largely model-specific, requiring retraining or tailored interventions for each new architecture. In this work, we ask whether safety can be represented as a portable latent direction, learned once and reused across heterogeneous generators. We introduce the first framework for cross-model safety steering, in which a safety direction is estimated in a source LLM from paired safe-unsafe prompts, transported to a target generator through a lightweight alignment fitted on benign data

Related: [[embedding-spaces]]
