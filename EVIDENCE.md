# Evidence ledger — ASN & enterprise RAG

**Normative rule:** product and whitepaper claims advance only when a row here moves from
**Hypothesis** → **Measured** (reproducible command + date) or **Rejected**. Narrative from
source docs (`docs/sources/`) does not count as evidence.

Related: [`WHITEPAPER.md`](./WHITEPAPER.md) §8 · [`SCIENCE_REVIEW.md`](./SCIENCE_REVIEW.md) ·
[`specs/0008-eval-harness-and-gates.md`](./specs/0008-eval-harness-and-gates.md)

**Refresh:** `pnpm evidence:collect` · `pnpm evidence:ablation` · `uv run python scripts/collect_evidence.py` → updates [`data/evidence/latest.json`](./data/evidence/latest.json)

---

## 1. Verified math (CPU unit tests)

| Claim | Status | Measurement | Command |
|---|---|---|---|
| Effective rank → 1.0 on rank-1 matrix | **Measured** | \|erank − 1\| < 1e-3 | `pytest packages/asn-engine/tests/test_spectral.py::test_effective_rank_rank_one` |
| Isotropic Gaussian erank ≈ full dimension | **Measured** | erank ≥ 0.9·min(n,d) for 256×64 | `…::test_effective_rank_isotropic` |
| Quintic NS stable band ≈ [0.68, 1.27] | **Measured** | σ_min > 0.6, σ_max < 1.3; 8 vs 20 steps agree | `…::test_newton_schulz_quintic_conditions_spectrum` |
| Quintic conditions spectrum (κ collapse) | **Measured** | cond after NS < 5% of raw cond | same test |
| Cubic NS → σ ≈ 1 (true orthogonalizer) | **Measured** | σ ∈ [0.99, 1.01] @ 40 steps | `…::test_newton_schulz_cubic_orthogonalizes` |
| Three-tier surgery preserves strong/tail, shrinks weak | **Measured** | tier-wise equality / inequality | `…::test_three_tier_surgery_penalizes_only_weak_band` |
| Procrustes recovers rotation | **Measured** | ‖R − R*\|_F < 1e-4 | `…::test_procrustes_recovers_rotation` |
| InfoNCE lower for aligned vs random pairs | **Measured** | loss_aligned < loss_random | `…::test_info_nce_is_low_for_aligned_pairs` |

Last full run: see `data/evidence/latest.json` → `mathTests`.

---

## 2. Deploy gates (eval-harness)

| Gate | Threshold | Status | Notes |
|---|---|---|---|
| `rankAboveBaseline` | erank > 8.0 on eval slice | **Hypothesis** | Prior ~62 deploy reports **retracted** (train_loop bug); re-measure per workspace |
| `ndcgNonRegression` | pairwise nDCG@10 ≥ 0.35 | **Hypothesis** | k=2 proxy in harness today; expand to k=10 panel |
| `mrlWithinTolerance` | Matryoshka truncate tolerance | **Not measured** | Stub `True` in gates.py — implement before claiming MRL |

Implementation: `packages/eval-harness/eval_harness/gates.py`

---

## 3. Training loop (ASN vs ablation)

**Setup:** `hub` corpus, 32 synth pairs, MiniLM-L6-v2, 2 epochs, seed 0.  
**Command:** `uv run python scripts/collect_evidence.py --ablation --site hub`  
**Snapshot:** `data/evidence/latest.json` (2026-06-28T02:21:02Z)

| Run | ASN | eval erank | nDCG@10 (k=2 proxy) | WHITEPAPER gate 1 |
|---|---|---|---|---|
| InfoNCE baseline | off | **7.37** | **0.931** | — |
| ASN (surgery + quintic NS) | on | **7.37** | **0.908** | **Failed** |

| Sub-gate | Result | Notes |
|---|---|---|
| ASN erank > InfoNCE erank | **Failed** | 7.37 vs 7.37 (ASN slightly lower) |
| ASN nDCG ≥ InfoNCE nDCG | **Failed** | 0.908 < 0.931 on 2-epoch micro-run |
| erank > 8.0 deploy threshold | **Failed** | both runs below 8.0 |

**Interpretation (not excuses — next experiments):**

- Prior "effective rank ~62" reports were **retracted**: `train_loop.py` previously measured erank on
  **random noise**, not encoder outputs (fixed 2026-06-28).
- Micro-run uses tiny corpus + 2 epochs; surgery/NS may need longer horizon or tuned `rankFloor`.
- Heterosynaptic EMA (`ŵ`) is **not wired** in `apply_spectral_surgery` yet (ablation c open).
- nDCG harness uses k=2 over 2 candidates — not a full retrieval panel.

**Next measurements:** 10+ epoch run on full pair set; wire ŵ EMA; expand eval to k=10 MTEB slice;
re-run Phase A orgs with fixed erank logging.

### 3.1 Root cause + fixed-trigger re-run (2026-06-27)

**Setup:** 5-topic synthetic corpus, 60 train pairs, MiniLM-L6-v2, **30 epochs**, seed 0,
eval erank over a 30-sentence pool (headroom), nDCG@10 leave-one-out by topic.
**Command:** `EPOCHS=30 packages/asn-engine/.venv/Scripts/python.exe scripts/engine_proof.py`

**Root cause of the §3 failure — found and fixed.** The collapse trigger compared `rankFloor`
against the effective rank of a *single batch*. Effective rank is capped by `min(n_samples, dim)`,
so with `batchSize`=12 the measured rank can never exceed 12 → any `rankFloor` ≥ 12 fired
spectral surgery **every 10 steps unconditionally**, regardless of collapse. That constant
aggressive surgery — not the math — drove ASN below baseline.

**Fix (`train_loop.py`):** measure effective rank over a rolling **window** of recent projector
rows (`rankWindow`, default 256) so it has real headroom; trigger surgery only when the window
is large enough *and* its rank is genuinely below the floor.

| Run | trigger | surgeries fired | eval erank | nDCG@10 |
|---|---|---|---|---|
| InfoNCE baseline | — | 0 | **15.64** | 1.0000 |
| ASN, **old** batch-capped trigger (30 ep) | broken | ~15 | **14.08** (−1.56) | 1.0000 |
| ASN, **fixed** window trigger (30 ep) | sound | **0** | **15.27** (−0.37, −2.4%) | 1.0000 |

**Interpretation (honest):**
- The fixed trigger correctly fires **0** surgeries here — *because the baseline does not
  collapse* (robust pretrained backbone + small data). Correct behavior: do not intervene when
  there is nothing to fix.
- With the fix ASN is at **no-harm parity** (−2.4%, within a 5% band; nDCG unchanged). The
  residual gap is the periodic quintic-NS *conditioning* (ablation (d)), not surgery.
- **This corpus cannot test the benefit claim** (ASN raises rank *under collapse*) because the
  baseline never collapses. The headline "ASN beats baseline" remains **Hypothesis**, pending a
  genuine collapse-regime experiment (weaker/random init or large-scale training) vs real
  baselines (BGE-M3 / e5 / Qwen3-Embed). Gate `scripts/engine_proof.py` exits 0 on the
  *no-harm* claim only and says so explicitly.

### 3.2 Collapse-regime experiment — ASN surgery REJECTED (2026-06-27)

**Goal:** test the benefit claim in a setting where collapse *actually happens* (3.1 could
not). Controlled synthetic testbed: 8 Gaussian clusters in a 32-dim latent space, linearly
embedded in R^128; 2-layer **linear** encoder (collapse-prone); strong augmentation; quality =
kNN cluster accuracy on held-out points. **Command:** `scripts/collapse_regime.py`.

**Finding A — InfoNCE does not collapse (3 configs tried).** Large batch, small batch (8),
strong aug (σ=4), weight decay — the InfoNCE baseline's served effective rank stays at/above
the raw input rank (~21–30). InfoNCE's uniformity term is inherently anti-collapse, so the
**"ASN beats InfoNCE on effective rank" framing is the wrong battlefield**: there is little
collapse for ASN to fix.

**Finding B — where collapse is real, ASN makes it WORSE.** With a no-negatives alignment
objective (`LOSS=align`, the canonical collapse setting), reproduced across seeds 0/1/2:

| arm | served effRank | kNN acc | surgeries |
|---|---|---|---|
| alignment baseline | **3.3 – 3.5** (collapsed from raw 21) | 1.000 | 0 |
| + ASN (three-tier surgery + NS) | **1.01 – 1.02** (near-total collapse) | 0.79 – 0.88 | 79 |

**Interpretation — a mechanism/pathology mismatch.** Three-tier surgery *shrinks the weak
(middle) singular band* to combat **anisotropy** (a few over-dominant directions). But
**collapse is the opposite pathology** — too *few active* directions — and shrinking the weak
band destroys the remaining diversity, completing the collapse. So the core ASN intervention,
as designed, treats the wrong disease. **Verdict: the "ASN prevents collapse" mechanism claim
is Rejected in its current form.** This is the single most important result for the research
org: the method needs a redesign (e.g. *raise* weak/low singular values toward the strong band,
or a rank-floor regularizer) before any "collapse-resistant" product copy is defensible.

---

## 4. Enterprise RAG (extrinsic — target)

| Benchmark | Baseline | ASN org model | Status |
|---|---|---|---|
| Rotating tenant eval slice | InfoNCE / MiniLM | org-trained ASN | **Hypothesis** |
| Public MTEB retrieval subset | BGE-M3, e5, Qwen3-Embed-0.6B | per-org ASN | **Not started** |
| dumbmodel.com Hall of Cone | commercial panel | Blue Hen RE | **Hypothesis** — spec 0007/0008 |

---

## 5. Rejected or downgraded (do not ship as fact)

| Claim (source) | Verdict | Reason |
|---|---|---|
| Quintic NS drives σ → 1 in ~5 steps | **Rejected** | Measured fixed band ≈ [0.68, 1.27]; see SCIENCE_REVIEW §3 |
| "Mathematically equivalent" biology ⇄ ML | **Rejected** | Inspiration only |
| "100% scientifically accurate" | **Rejected** | SCIENCE_REVIEW §4 |
| Sub-millisecond / <15ms latency | **Unverified** | Reproduce on our stack before product copy |
| zELO → bi-encoder distillation | **Hypothesis** | zELO validated for rerankers; extension unmeasured here |
| ASN three-tier surgery *prevents collapse* | **Rejected (current form)** | §3.2: in a real collapse regime it drives served rank 3.4→1.0 and degrades kNN acc; mechanism fights anisotropy, not collapse |
| ASN *beats InfoNCE* on effective rank | **Rejected (wrong framing)** | §3.2: InfoNCE's uniformity is inherently anti-collapse; no collapse to beat |

---

## 6. Open ablations (priority)

1. **(a)** no spectral surgery — same seed/data as ASN
2. **(b)** uniform SV threshold vs three-tier
3. **(c)** no heterosynaptic `ŵ` EMA (now wired in train_loop; re-measure under §3.2 collapse regime)
4. **(d)** no quintic NS
5. **(e)** cubic instead of quintic for in-loop conditioning
6. **(f)** no projection head bottleneck
7. **(g)** no Matryoshka prefix loss

Each ablation must log to ledger + this file before changing WHITEPAPER mechanism claims.

---

## 7. Changelog

| Date | Change |
|---|---|
| 2026-06-28 | Initial ledger; math tests linked |
| 2026-06-28 | Ablation: gate 1 **failed** on hub 2-epoch micro-run; ~62 erank claim **retracted** (train_loop bug) |
| 2026-06-27 | Root cause of gate-1 failure found: **batch-capped collapse trigger** fired surgery every 10 steps unconditionally. Fixed to a rolling-window measurement; 30-epoch re-run shows ASN at no-harm parity (surgeries=0). Benefit claim still **Hypothesis** (no collapse regime to test it). New: `scripts/engine_proof.py`. |
| 2026-06-27 | §3.2 collapse-regime experiment (`scripts/collapse_regime.py`): InfoNCE doesn't collapse (wrong framing); in a real collapse regime ASN surgery makes it **worse** (rank 3.4→1.0, kNN −12-21pts, 3 seeds). Mechanism claim **Rejected in current form** — fights anisotropy, not collapse. Method needs redesign. |
