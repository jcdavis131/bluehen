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

**Setup:** Phase A corpora, 128 synth pairs, MiniLM-L6-v2, **10 epochs**, seed 42.  
**Commands:** `pnpm evidence:fleet` · snapshot in `data/evidence/latest.json`

### Run A — 2026-06-28 (heterosynaptic wired; trigger bug: projector window)

| Site | ASN er | Base er | ASN nDCG | Base nDCG | Surgeries | Gate 1 |
|---|---|---|---|---|---|---|
| hub | 7.38 | 7.40 | 0.965 | 0.954 | 0 | nDCG ✅ rank ❌ |
| benchmark-lab | 7.39 | 7.40 | 0.977 | 0.977 | 0 | tie |
| research-rag | 7.11 | 7.09 | 1.000 | 1.000 | 0 | **both ✅** |
| dumbmodel | 7.27 | 7.32 | 0.989 | 0.989 | 0 | tie |

**1/4 sites** passed gate 1. Surgeries never fired — rank measured on projector window, not
encoder; fixed in `train_loop.py`.

### Run B — encoder trigger + peak–drop + heterosynaptic ŵ (2026-06-28T03:21Z)

| Site | Surgeries | ASN er | Base er | ASN nDCG | Base nDCG | Gate 1 |
|---|---|---|---|---|---|---|
| hub | 8 | 7.38 | 7.40 | **0.965** | 0.954 | nDCG ✅ rank ❌ |
| benchmark-lab | 10 | 7.30 | 7.40 | 0.977 | 0.977 | rank ❌ |
| research-rag | 11 | 6.98 | 7.09 | 1.000 | 1.000 | rank ❌ |
| dumbmodel | 7 | 7.25 | 7.32 | 0.989 | 0.989 | rank ❌ |

**0/4 sites** passed gate 1. Interventions **fire** (7–11 surgeries/run) but **lower** eval erank
vs InfoNCE baseline on every site. Hub nDCG improves +0.011 — partial utility signal.

**Next tuning (data-guided):** reduce `lambda` / surgery frequency; ablate peak–drop vs floor-only;
wire surgery on encoder weights vs projection head only; longer epochs; real k=10 eval panel.

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

### 3.3 Anti-collapse redesign (spectral lift) — REJECTED on benefit, harm FIXED (2026-06-27)

**Motivation.** §3.2 showed three-tier surgery treats the wrong disease: it *shrinks* the weak
singular band (an anti-anisotropy move) while collapse is the opposite pathology (too few
*active* directions), so it drives served rank 3.4→1.0 and costs kNN. This tests the proposed
fix: a **dual** operator that *raises* every singular value to a floor (a fraction of the top
SV), pulling suppressed directions back toward the dominant band and flattening the spectrum.

**New operator.** `spectral_lift(s, floor_frac=0.25, ref="max")` in
`packages/asn-engine/asn_engine/spectral.py` — `s.clamp(min=floor_frac·s.max())` (also a
`ref="geomean"` variant). Never shrinks a value, so the strong band is preserved. Unit tests
`test_spectral_lift_*` in `tests/test_spectral.py` (suite: **11 pass**). `three_tier_surgery`
and `newton_schulz` are untouched.

**Setup.** Identical to §3.2 (8 Gaussian clusters in 32-dim latent, R^128 ambient, 2-layer
linear encoder, `LOSS=align` no-negatives collapse objective, AUG_SIGMA=1.0, WEIGHT_DECAY=0.0,
STEPS=800), seeds 0/1/2. Four arms swap only the in-loop intervention; everything else (rank-floor
trigger at erank<20, periodic quintic NS on the projector) is held fixed. The lift is applied
across the full serve path (enc1+enc2), since collapse here originates upstream in enc1.
**Command:** `packages/asn-engine/.venv/Scripts/python.exe scripts/collapse_redesign.py`

| arm | served effRank (mean 0/1/2) | kNN acc | surgeries |
|---|---|---|---|
| baseline (alignment, no intervention) | **3.40** (collapsed from raw ~20.8) | **1.000** | 0 |
| three-tier surgery @ cadence 10 (old, §3.2) | **1.02** | 0.831 | 79 |
| **spectral_lift** @ cadence 10 (new) | **2.06** | **1.000** | 79 |
| **spectral_lift** @ cadence 5 (new, 2× freq) | **2.07** | **1.000** | 159 |

**Verdict — Rejected (benefit-over-baseline) / Supported (harm-fix).**

- **Harm FIXED (supported):** the redesign eliminates three-tier's catastrophic failure — served
  rank no longer crashes to ~1.0 (now 2.06) and kNN is **fully preserved** (1.000 vs 0.831). The
  lift is **strictly dominant** over three-tier on both metrics, confirming the §3.2 diagnosis:
  *lifting* the weak band is the right direction, *shrinking* it is the wrong one.
- **Benefit REJECTED:** spectral_lift still sits **below the do-nothing baseline** (2.06 vs 3.40),
  so it does not clear the pre-registered "meaningfully above baseline" bar (Δ>+0.5). Diagnosis:
  each lift makes the weights well-conditioned (weight effrank ~60), but the strong alignment-
  collapse gradient re-collapses the *served* representation between interventions. Raising cadence
  (10→5) does **not** rescue it in this harness — the periodic projector NS conditioning dominates
  the trajectory, not the lift frequency.
- **Honest scope.** A side ablation that drops the projector-NS step lets cadence-5 lift reach
  ~3.76 (just above baseline 3.40, +0.36) — still **inside** the +0.5 margin, so not a meaningful
  win. Net: in a genuine collapse regime, *in-loop weight-space SVD surgery of any flavor* cannot
  beat simply not intervening, because gradient descent on the collapse objective undoes the
  conditioning faster than it is reapplied. A loss-space rank-floor regularizer (penalize low
  effective rank during the backward pass) is the indicated next direction, not weight surgery.

### 3.4 Loss-space rank floor (VICReg) — SUPPORTED (2026-06-27)

**Goal:** test §3.3's indicated fix — move the rank floor into the loss instead of weight
surgery. Implemented VICReg variance + covariance terms (Bardes et al. 2022) in
`asn_engine/losses.py` (`variance_regularization`, `covariance_regularization`).
**Command:** `packages/asn-engine/.venv/Scripts/python.exe scripts/collapse_lossreg.py`
(same synthetic regime as §3.2/§3.3; collapse driver = invariance-only MSE; seeds 0/1/2).

| arm | served effRank | kNN acc |
|---|---|---|
| baseline (invariance only) | **12.06** (raw ≈ 21.1) | 1.000 |
| + VICReg (variance + covariance) | **21.00** (full rank recovered) | 1.000 |

Δ effective rank **+8.94**, Δ kNN **+0.000**, reproduced across seeds 0/1/2.

**Verdict — SUPPORTED.** A loss-space rank floor *does* prevent dimensional collapse where
weight-space surgery of every flavor failed (§3.2 three-tier made it worse; §3.3 spectral_lift
fixed the harm but stayed below do-nothing). The variance term keeps every dimension above a
std floor and covariance decorrelates them; because it acts through the gradient, GD cannot
undo it between steps. **This is the anti-collapse mechanism the ASN method should adopt.**

**Honest scope (not yet product-ready):** demonstrated for the *mechanism* in a controlled
synthetic linear regime with a collapse-prone (invariance-only) base objective. It does NOT yet
show value on real text embeddings vs InfoNCE (which already resists collapse, §3.2 Finding A)
or vs commercial baselines (BGE-M3 / e5 / Qwen3-Embed). Next: train a real encoder with a
VICReg-regularized objective and measure retrieval vs those baselines before any product copy.

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
| Loss-space rank floor (VICReg) prevents collapse | **Measured (mechanism)** | §3.4: served rank 12.1→21.0 (+8.9), kNN preserved, 3 seeds — works where weight surgery failed. Not yet tested on real text/baselines |

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
| 2026-06-28 | Run B fleet: surgeries fire (7–11/run); gate 1 **0/4** — ASN er below baseline |
| 2026-06-27 | Root cause of gate-1 failure found: **batch-capped collapse trigger** fired surgery every 10 steps unconditionally. Fixed to a rolling-window measurement; 30-epoch re-run shows ASN at no-harm parity (surgeries=0). Benefit claim still **Hypothesis** (no collapse regime to test it). New: `scripts/engine_proof.py`. |
| 2026-06-27 | §3.2 collapse-regime experiment (`scripts/collapse_regime.py`): InfoNCE doesn't collapse (wrong framing); in a real collapse regime ASN surgery makes it **worse** (rank 3.4→1.0, kNN −12-21pts, 3 seeds). Mechanism claim **Rejected in current form** — fights anisotropy, not collapse. Method needs redesign. |
| 2026-06-27 | §3.3 anti-collapse redesign (`scripts/collapse_redesign.py`, new `spectral_lift` op + tests): lifting (not shrinking) the weak band **fixes** three-tier's harm — no rank crash (1.0→2.06), kNN preserved (1.000), strictly dominant. But still **below** the do-nothing baseline (2.06 vs 3.40), so benefit-over-baseline **Rejected**. In-loop weight-space SVD surgery can't outrun the collapse gradient; loss-space rank-floor regularizer indicated next. |
| 2026-06-27 | §3.4 loss-space rank floor (`scripts/collapse_lossreg.py`, new VICReg `variance_regularization`/`covariance_regularization` + tests): **SUPPORTED** — served rank 12.1→21.0 (+8.9, full recovery), kNN preserved, 3 seeds. Loss-space regularization prevents collapse where all weight-space surgery failed. Mechanism claim now **Measured**; product claim still needs real-text/commercial-baseline eval. Suite 13/13 green. |
