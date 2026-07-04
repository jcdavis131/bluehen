# Experiment Campaign Report

**Generated:** 2026-06-28T17:47:18.563287+00:00
**Total experiments:** 500
**Source:** `data/evidence/campaign/results.jsonl`

## Executive summary

This campaign stress-tests the **domain-adaptation thesis** (repositioned from raw ASN surgery claims) across three regimes: synthetic collapse (invariance-only), synthetic InfoNCE+surgery, and zero-shot commercial baselines on Phase A tenant corpora.

### Headline findings

1. **Loss-space VICReg (synthetic collapse):** baseline mean erank **12.03** vs VICReg arms **18.41** — VICReg wins on rank in **100/100** seed pairs (threshold +0.5 erank). Confirms §3.4 mechanism at scale.

## Synthetic invariance — VICReg arm means

| arm | n | mean erank | mean kNN |
|---|---|---|---|
| baseline | 100 | 12.026 | 1.000 |
| vicreg_default | 100 | 21.828 | 1.000 |
| vicreg_strong | 100 | 22.119 | 1.000 |
| vicreg_var_only | 100 | 13.582 | 1.000 |
| vicreg_weak | 100 | 16.112 | 1.000 |

## Proposed next steps

1. **Reposition product copy** around domain adaptation (§3.6–§3.7 evidence); demote surgery to experimental.
2. **MTEB retrieval slice** — zero-shot-vs-zero-shot + in-domain tuned; fair cross-domain claim.
3. **Draft WHITEPAPER §8** as negative-results arc: surgery → lift → loss-space → sleep → real-text.
4. **Per-tenant recipe gate:** InfoNCE default; enable VICReg only when Run D-style ablation shows nDCG gain (hub yes, research-rag no).
5. **Ultracode session:** distribute `docs/ULTRACODE_WORKFLOW.md` workstreams in parallel.

## Reproducibility

```bash
pnpm evidence:campaign          # 500 experiments (fast mode)
pnpm evidence:campaign:report     # regenerate this report
```
