# Embedding research sweep — findings & next steps

**Program:** 891 logged runs (~1,190 model trainings) across two waves, $0 / CPU.
**Data tables:** [`SWEEP_REPORT.md`](./SWEEP_REPORT.md) (auto-generated). **Ledger:** [`EVIDENCE.md`](./EVIDENCE.md).
**Reproduce:** `scripts/sweep.py` (wave 1 grid), `scripts/bayes_search.py` (wave 2 TPE),
`scripts/domain_sweep.py` (real-text). Aggregate: `python scripts/sweep.py --aggregate data/sweeps`.

- **Wave 1 — grid (591 runs):** A regime map (300), B Matryoshka/int8 (192), D anisotropy (90), C real-text domain/forgetting (9).
- **Wave 2 — Bayesian TPE (300 trials × 2 seeds):** architecture × method × hyperparameter search over 6 methods, optimizing a robustness-weighted score (`knn_full + 0.5·knn_t8 + 0.5·knn_int8`).

---

## Executive summary

1. **Anti-collapse value is entirely regime-specific.** Adding a rank floor helps *enormously*
   for collapse-prone objectives (SimSiam **+0.32** kNN, alignment **+0.10**) and **~zero** for
   InfoNCE once it has adequate negatives (batch ≥16: Δ ≈ −0.004…+0.002). If you train InfoNCE
   with a normal batch, you do not need explicit anti-collapse.
2. **Barlow Twins beats VICReg** as the decorrelation/anti-collapse method. The TPE search
   ranked it #1 (mean robust score 1.42 vs VICReg 1.17) and concentrated 130/300 trials there.
   Barlow keeps high full quality (kNN 0.83); VICReg sacrifices full quality (0.63) for
   truncation robustness.
3. **Decorrelation does NOT buy cheap serving or retrieval** (two hypotheses rejected). The
   covariance term *hurts* full kNN (Family D: 0.85→0.73) and does not improve prefix-truncation
   (Family B). int8 quantization is essentially **free** (kNN_int8 ≈ kNN_full everywhere) — no
   regularizer needed for it. Truncation robustness comes from **Matryoshka (MRL) training**
   (mrl/vicreg have the best knn_t8), i.e. it must be trained for, not bolted on.
4. **Domain fine-tuning is the product lever, and it's safe.** Real-text (AG News): +1.5%
   (300 pairs) → +3.0% (1,200 pairs) in-domain kNN over raw MiniLM, **with negative forgetting**
   (out-of-domain DBpedia kNN *improved*). VICReg neutral on real text, again.
5. **Simpler architectures win** on this task: depth-1, no projector expander, minimal norm.
   (Caveat: synthetic linear regime — revisit on real text.)

---

## Per-hypothesis verdicts

| # | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| H-A | VICReg benefit grows as negatives shrink | **Confirmed** | A: InfoNCE Δ +0.066 @batch4 → ~0 @batch≥16; SimSiam Δ +0.19→+0.32; alignment +0.06→+0.10 |
| H-B | decorrelation aids truncation + int8 | **Rejected** | B: cov 0→1 lowers knn_t8 0.358→0.326; int8 lossless regardless |
| H-C | domain gain vs OOD forgetting | **Measured (favorable)** | C: +1.5–3.0% in-domain, OOD *improved* (no forgetting) |
| H-D | covariance (whitening) helps retrieval | **Rejected** | D: cov 0 > 0.04 > 1 at every anisotropy level |
| NEW | best method (TPE) | **Barlow Twins** | wave 2: barlow 1.422 > infonce 1.388 > rankfloor 1.313 > mrl 1.249 > vicreg 1.165 > dino 1.078 |

**Tradeoff discovered:** there is a **quality ↔ truncation-robustness frontier**. VICReg/MRL
maximize truncated-dim kNN (knn_t8 0.43/0.37) but cost full-dim quality; Barlow/InfoNCE maximize
full quality. Pick per serving target (full-dim vs aggressive Matryoshka truncation).

---

## What this means for the architecture & product

- **Default training recipe:** InfoNCE (or Barlow Twins) with batch ≥64, shallow encoder, no
  expander. Drop VICReg/sleep/surgery from the default path — they add nothing on the InfoNCE
  path and the earlier weight-surgery/sleep mechanisms were rejected (EVIDENCE §3.2/§3.3/§3.5).
- **If a regularizer is warranted** (low-negative, non-contrastive, or federated/streaming
  training where batches are tiny): use **Barlow Twins**, not VICReg.
- **For cheap edge serving:** int8 is free; for truncated dims, **train with an MRL loss** rather
  than relying on decorrelation. Offer two serving tiers (full-quality vs MRL-truncated).
- **The moat remains domain adaptation:** cheap per-tenant fine-tuning, measured +1.5–3% with no
  forgetting. This — not collapse-resistance — is the defensible product claim.

---

## Proposed next steps (ranked)

1. **Confirm Barlow > VICReg and the MRL truncation win on REAL text** (the wave-2 ranking is
   synthetic). Add `barlow` + `mrl` recipes to `train_asn` and re-run `realtext_validation` /
   `domain_sweep` with a real MTEB-style retrieval slice. *(High value, ~1 session.)*
2. **Fair multi-domain SOTA comparison** (zero-shot vs zero-shot) to convert the "beats BGE
   in-domain" caveat (§3.6) into a clean, defensible benchmark — feeds dumbmodel.com/slasso.com.
3. **Productionize the two serving tiers** (full-dim quality + MRL-truncated cheap) behind the
   existing `/v1/model/deploy` (`truncateDims`, `quant`) — int8 is free, so ship it.
4. **Reposition the thesis** in WHITEPAPER/product copy around *domain-adapted embeddings + cheap
   edge serving*, with collapse-resistance demoted to a researched safety property for
   low-negative regimes. Keep SCIENCE_REVIEW's "inspired by" framing.
5. **Tighten the science**: the synthetic task is linear + clustered; port the regime map and
   method ranking to a small transformer on real corpora to check the architecture conclusions
   (depth/expander/norm) transfer.

_Generated 2026-06-28 from 891 experiments. Every claim traces to a row in SWEEP_REPORT.md / EVIDENCE.md._
