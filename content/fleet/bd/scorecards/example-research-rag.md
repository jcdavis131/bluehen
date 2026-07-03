---
title: "Research-RAG pilot — Barlow λ=0.022"
tenant: research-rag
verdict: pilot-passed
date: 2026-07-02
method: "Barlow λ=0.022"
---

# Example scorecard — research-rag pilot

> **Fixture.** This is an example scorecard used to exercise the public permalink
> page at `/scorecards`. It is clearly marked and may be removed once real
> Validation rulings are published into `content/fleet/bd/scorecards/`.

## Ruling

Tenant **research-rag** (arxiviq.com) submitted the Barlow λ=0.022 ASN variant
for pilot validation. Validation ran the standard Phase A exam suite against the
BGE-base-en reference baseline and the published deploy gate.

## Results

| Metric | Barlow λ=0.022 | BGE-base-en (reference) |
|---|---|---|
| nDCG@10 | 0.41 | 0.34 |
| Effective rank | 38.2 | 64.0 |
| Deploy gate (nDCG@10 ≥ 0.35) | pass | — |

## Gate

- Deploy gate: **pass** (nDCG@10 0.41 ≥ 0.35 threshold)
- Reproducibility: exam seeds pinned, harness version `eval-harness@0.3`
- Evidence ref: `EVIDENCE.md#barlow-lambda-0.022-pilot`

## Verdict

**pilot-passed** — cleared for production charter promotion per Spec 0012 Phase A.
