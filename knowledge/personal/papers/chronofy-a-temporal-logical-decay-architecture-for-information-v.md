---
title: "Chronofy: A Temporal-Logical Decay Architecture for Information Validity in Time-Aware Retrieval-Augmented Generation"
tags: [chunk]
source: ""
added: 2026-07-27
format: okf/v0
---

Retrieval-Augmented Generation (RAG) systems retrieve and integrate external knowledge to ground large language model (LLM) outputs. However, current RAG architectures treat all retrieved facts as equally valid regardless of temporal provenance, leading to temporal hallucination, where plausible but obsolete facts corrupt the output. A clinical lab reading from yesterday is actionable; the same reading from six months ago is noise. We present Chronofy, a three-layer neuro-symbolic framework implementing the Temporal-Logical Decay Architecture (TLDA) that embeds temporal validity directly into

Related: [[retrieval-and-rag]]
