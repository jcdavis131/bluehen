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
| `mrlWithinTolerance` | Matryoshka truncate tolerance | **Not measured** | Fails closed in `gates.py` when MRL retrieval unmeasured (no stub `True`) — implement measurement before claiming MRL |
| `sufficientEvalPairs` | ≥ 8 real collection pairs | **Measured (gate mechanics)** | REV-905 (2026-07-02): `services/core-api/app/services/eval.py` now fails closed below 8 real pairs — no silent demo-pair substitution. Tests `services/core-api/tests/test_eval.py` (6 cases: 0/7/8/12 pairs + `allow_demo` opt-in). Train minimum stays 10 |

Implementation: `packages/eval-harness/eval_harness/gates.py`, `services/core-api/app/services/eval.py`

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

### Run C — hub 10-epoch three-arm (InfoNCE vs ASN+surgery vs InfoNCE+VICReg) — 2026-06-28T04:27Z

**Command:** `uv run python scripts/collect_evidence.py --ablation --site hub --vicreg --epochs 10`  
**Snapshot:** `data/evidence/latest.json` (ablation block)

| arm | eval erank | nDCG@10 | surgeries |
|---|---|---|---|
| InfoNCE baseline | 7.398 | 0.9539 | 0 |
| ASN + three-tier surgery | 7.379 | **0.9654** | 8 |
| InfoNCE + VICReg (no surgery) | 7.358 | **0.9654** | 0 |

**Findings:**
1. **Gate 1 still fails** — no arm raises eval effective rank above baseline (all ~7.4 on tiny hub corpus).
2. **VICReg matches ASN surgery on nDCG** (+0.0115 vs baseline) without weight interventions — same
   nDCG as Run B hub (+0.011) but via loss regularization only.
3. **Prefer VICReg over surgery** when nDCG lift is the goal: identical retrieval, zero surgery overhead,
   no rank harm beyond baseline noise.

**Next:** tenant BGE baseline panel (`pnpm evidence:tenant`) — **done §3.7**.

### Run D — fleet three-arm with VICReg (2026-06-28T04:48Z)

**Command:** `pnpm evidence:vicreg`  
**Snapshot:** `data/evidence/latest.json` (`ablationFleet`)

| site | base nDCG | ASN+surgery | VICReg | surgeries | VICReg ΔnDCG |
|---|---|---|---|---|---|
| hub | 0.9539 | **0.9654** | **0.9654** | 8 | **+0.0115** |
| benchmark-lab | 0.9769 | 0.9769 | 0.9769 | 10 | 0 |
| research-rag | **1.0000** | 1.0000 | 0.9885 | 11 | **−0.0115** |
| dumbmodel | 0.9885 | 0.9885 | 0.9885 | 7 | 0 |

**Gate 1: 0/4** (ASN never beats baseline on rank). **VICReg fleet verdict:** helps only on hub
(same +0.0115 as surgery, zero interventions); neutral on 2 sites; **hurts** research-rag at
saturated nDCG. **Default recipe:** plain InfoNCE; enable VICReg per-tenant when ablation shows
gain; keep `asn.enabled: false` fleet-wide until rank gate passes.

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

### 3.5 Sleep-inspired consolidation (AwakenedSleepNet) — REJECTED as a pattern (2026-06-27)

**Goal:** advance VICReg with the project's namesake biology — SHY synaptic downscaling, dream
pruning, and wake/sleep replay consolidation. **Bio-inspired, NOT bio-equivalent** (SCIENCE_REVIEW
§2). New `asn_engine/sleep.py` (`synaptic_downscale`, `magnitude_prune`, `sleep_phase`) + tests.
**Command:** `scripts/sleep_consolidation.py` (same synthetic collapse regime; seeds 0/1/2).

| arm | effRank | kNN | VICReg steps |
|---|---|---|---|
| baseline (invariance only) | 12.06 | 1.000 | 0 |
| VICReg continuous | **21.00** | 1.000 | 800 |
| sleep_homeostatic (downscale+prune only) | 12.3 – 14.0 | 1.000 | 0 |
| sleep_consolidate (periodic VICReg "dreams") | **9.99** (day_len 50) / **5.71** (day_len 10) | 1.000 | 160 / 320 |

**Verdict — REJECTED as a computational pattern.** Three honest sub-findings:
1. Homeostatic downscaling + pruning **alone do not prevent collapse** (~12–14 vs raw 21) — the
   anti-collapse force must come from the *loss*, confirming §3.4.
2. Phasing the rank floor into a periodic "sleep" makes it **fail** (9.99), and making sleep
   *more frequent* makes it **worse** (5.71), not better.
3. Only **continuous** co-optimization of the rank floor with the task holds full rank (21.0).
This is the same mechanism-level lesson as §3.2/§3.3 (intermittent weight surgery): gradient
descent re-collapses the representation between any phasic intervention. **What survives from the
biology:** the *persistent homeostatic floor* — VICReg's per-dimension variance term is itself a
"keep every unit active" homeostatic constraint, applied every step. The *phasic sleep* metaphor
does not map to an effective algorithm here. `synaptic_downscale` remains useful as a
collapse-neutral renormalizer (it preserves the spectrum shape), just not as an anti-collapse tool.

### 3.6 Real-text validation — VICReg neutral; domain fine-tune beats SOTA in-domain (2026-06-27, **reconfirmed 2026-06-28**)

**Goal:** does VICReg help on REAL text via the production path, and how do we compare to a real
SOTA baseline? Trained MiniLM through `train_asn` (InfoNCE vs InfoNCE+VICReg) on AG News; scored
served embeddings on 800 held-out docs. **Command:** `pnpm evidence:realtext` (env: `EPOCHS=3`, `BGE=0`).  
**Snapshot:** `data/evidence/realtext_agnews.json`

| model | effRank | kNN acc | nDCG@10 |
|---|---|---|---|
| raw MiniLM (untrained) | 279.09 | 0.875 | 0.7764 |
| MiniLM + InfoNCE (3 ep) | 272.03 | **0.887** | 0.8223 |
| MiniLM + InfoNCE + VICReg | 273.06 | 0.884 | **0.8265** |
| BGE-small-en-v1.5 (SOTA ref, zero-shot) | 285.0 | 0.877 | 0.776 |

**2026-06-28 rerun (3 epochs, seed 0):** Δ VICReg vs InfoNCE — **dRank +1.04**, **dKNN −0.004**,
**dNDCG +0.0042**. Verdict unchanged: **~NEUTRAL** (tiny nDCG bump within noise).

**Findings (honest):**
1. **VICReg is ~NEUTRAL on real text** (Δrank +0.7–1.0, ΔkNN ≈ 0, ΔnDCG ≈ 0). Exactly as §3.2
   Finding A predicted: InfoNCE already resists collapse (effRank ~270 of 384, no collapse to
   fix), so the rank floor adds nothing measurable here. VICReg is *insurance for collapse-prone
   objectives*, not a differentiator on standard contrastive fine-tuning. **Status: Measured (neutral).**
2. **The real, measured product lever is domain fine-tuning.** Our in-domain fine-tuned MiniLM
   (kNN 0.887–0.892 / nDCG 0.822) **beats zero-shot BGE-small** (0.877 / 0.776) on the in-domain task.
   **Caveat (do not overclaim):** AG News is in-domain for our fine-tune and out-of-domain for BGE,
   so this measures the *value of domain adaptation*, not that our model is better in general. That
   is still the defensible product thesis: domain-tuned org embeddings beat general commercial
   embeddings *on the tenant's domain*. **Status: Measured (in-domain, single dataset).**
3. nDCG@10 with 4 topics is partially saturated; kNN accuracy is the cleaner signal. Next: a
   harder, multi-domain / finer-grained benchmark (MTEB slice) and a fair zero-shot-vs-zero-shot
   comparison before any cross-domain quality claim.

### 3.7 Tenant corpus vs commercial baseline (Phase A fleet) — 2026-06-28

**Goal:** does domain-tuned InfoNCE beat zero-shot BGE on each org's own corpus?
**Command:** `pnpm evidence:tenant`  
**Snapshot:** `data/evidence/tenant_baseline.json`

| site | BGE zero-shot | InfoNCE tuned (10 ep) | Δ nDCG |
|---|---|---|---|
| hub | 0.8962 | **0.9539** | +0.058 |
| benchmark-lab | 0.9423 | **0.9769** | +0.035 |
| research-rag | 0.9769 | **1.0000** | +0.023 |
| dumbmodel | 0.9308 | **0.9885** | +0.058 |

**Verdict — 4/4 sites:** domain fine-tune beats BGE zero-shot on tenant corpora (+0.023 to +0.058 nDCG).
Same defensible product thesis as §3.6: org-specific training beats general commercial embeddings
*in-domain*. BGE occasionally beats raw MiniLM on some sites; tuning always wins. **Caveat:** tiny
corpora + pairwise k=2 proxy — not cross-domain MTEB yet.

### 3.8 Large-scale VICReg campaign (500 runs) — 2026-06-28

**Command:** `pnpm evidence:campaign` (~27 min, fast mode)  
**Report:** `EXPERIMENT_CAMPAIGN_REPORT.md` · **Raw:** `data/evidence/campaign/results.jsonl`

100 seeds × 5 invariance-collapse arms (baseline + 4 VICReg weight configs). All 500 runs
synthetic; confirms §3.4 at scale:

| arm | mean erank | mean kNN |
|---|---|---|
| baseline (invariance only) | 12.03 | 1.000 |
| vicreg_default | **21.83** | 1.000 |
| vicreg_strong | **22.12** | 1.000 |
| vicreg_weak | 16.11 | 1.000 |
| vicreg_var_only | 13.58 | 1.000 |

**Verdict:** VICReg wins effective rank in **100/100** seed pairs (+0.5 threshold); kNN unchanged.
Strongest arms: default + strong (≈ +10 erank). Var-only weakly helps; confirms variance term drives
most of the anti-collapse benefit.

### 3.9 Production head-only split — first chartered prod deploy — 2026-07-03

**Setup.** Railway 1 GB plan container (api + in-proc worker thread, one
resident MiniLM backbone). Recipe: `freezeBackbone` head-only (frozen
all-MiniLM-L6-v2, ProjectionHead 384→1024→384, InfoNCE τ=0.07, 3 epochs,
feature-cached extraction batch 2 / max_len 128). Corpus: research tenant,
200 synth pairs from the 1.1 MB arXiv corpus (collection `8cf3b985`).
Eval: prod worker gate slice (first-32 pairs, `retrieval_scores` +
`ndcg_at_k` k=2), measured on the SERVED representation (head output).

| Model | nDCG@10 | Effective rank | Provenance |
|---|---|---|---|
| **asn-head-8282654 (deployed)** | **0.9077** | **26.03** | prod eval, gate slice |
| BAAI/bge-small-en-v1.5 | 0.9193 | 22.83 | local, same pairs + metric code |
| all-MiniLM-L6-v2 (raw backbone) | 0.8847 | 25.97 | local, same pairs + metric code |

**Verdict (no claim above gates).** Head-tune improves its own frozen
backbone by **+0.023 nDCG@10** on the tenant slice and passes all deploy
gates (rank > 8 baseline, nDCG ≥ 0.35). It does **not** beat bge-small
(−0.012). Gates authorized deploy via the active research charter;
`/v1/search` serves it live (702 chunks re-indexed through the head;
model artifact = 3.2 MB head stored in Postgres, backbone from the baked
HF cache at serve time). Baseline provenance differs by host (1 GB prod
box cannot hold a second model) — identical pair set and metric code.
No ASN weight surgery on this path (rejected 0/4, §5).

### 3.10 Refinery catalog load posture — measured — 2026-07-03

Probe: `scripts/load_probe_catalog.py` (httpx, single client IP) against
prod `/v1/catalog/*` on the 1 GB Railway container.

| Measurement | Value |
|---|---|
| /v1/catalog/stats p50 / p95 / max (140 req, conc 8) | **121.5 / 312.1 / 369.6 ms** |
| Rate limiter engagement | exactly at 120/min/IP: 120×200 then 20×429 (Retry-After set) |
| Cache posture | `public, s-maxage=60, stale-while-revalidate=300` on all catalog reads |
| Bucket scope (design fact) | one `catalog` bucket per IP across stats+list+detail |

**Honest scope.** A single-IP probe measures origin latency under the
limiter and the limiter itself — not absolute origin throughput. Public
fan-out is absorbed by CDN caching by design (s-maxage 60); multi-origin
scale claims require a distributed test and are NOT made here.

### 3.11 Chunk-size ablation (research corpus, fixed encoder) — 2026-07-03

`scripts/rag_chunk_ablation.py`: 40 arXiv docs, raw MiniLM held constant,
adjacent-chunk positives + hard-jaccard cross-doc negatives, prod metric
code. sentence-128: **nDCG 1.000 / ER 26.05** (32 pairs) · sentence-256:
0.954 / 27.25 (32) · sentence-512: 0.870 / **ER 15.63** (17 pairs — long
chunks also yield fewer usable pairs).

**Verdict (scoped).** On this corpus and protocol, smaller chunks
separate confusable negatives better and 512-token chunks lose rank.
Protocol caveat, stated plainly: adjacent-chunk positives become easier
as chunks shrink (more lexical continuity), so part of the 128-token
advantage is construction; the 512 rank collapse (15.6) is protocol-
independent and actionable. Current prod default (256) sits in the sane
middle. No default change without a query-grounded re-test.

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
| Loss-space rank floor (VICReg) prevents collapse | **Measured (mechanism)** | §3.4: served rank 12.1→21.0 (+8.9), kNN preserved, 3 seeds — works where weight surgery failed |
| VICReg helps on real-text contrastive training | **Measured (neutral)** | §3.6: ΔnDCG −0.0005, ΔkNN −0.004 vs InfoNCE on AG News — neutral; InfoNCE already resists collapse. Insurance, not a differentiator |
| Sleep/SHY consolidation (phasic) prevents collapse | **Rejected (pattern)** | §3.5: homeostasis-only ~no effect; periodic VICReg "dreams" worse than baseline (9.99 / 5.71). Anti-collapse must be continuous, in the loss |
| Domain-tuned org embeddings beat general commercial embeddings *in-domain* | **Measured (in-domain, 1 dataset)** | §3.6: fine-tuned MiniLM nDCG 0.822 > zero-shot BGE-small 0.776 on AG News. Caveat: in-domain vs zero-shot; needs MTEB + fair comparison |
| Anti-collapse benefit grows as negatives shrink (H-A) | **Measured** | §3.7 sweep: InfoNCE Δ +0.066@batch4→~0@batch≥16; SimSiam +0.32; alignment +0.10. Regime-specific |
| Barlow Twins > VICReg as decorrelation method | **Measured (synthetic)** | §3.7 wave-2 TPE (891 runs): barlow robust-score 1.42 > infonce 1.39 > vicreg 1.17; barlow keeps full quality, VICReg trades it for truncation robustness |
| Covariance decorrelation aids retrieval / truncation / int8 | **Rejected** | §3.7 (B,D): cov hurts full kNN (0.85→0.73) and knn_t8; int8 is lossless anyway. Truncation robustness comes from MRL training, not decorrelation |
| Domain fine-tune causes OOD forgetting | **Rejected (favorable)** | §3.7 (C): +1.5–3.0% in-domain, OOD kNN *improved* (no catastrophic forgetting at this scale) |

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
| 2026-06-28 | 500× campaign: VICReg wins rank **100/100** seeds (12.0→18–22 erank); kNN preserved |
| 2026-06-28 | §3.7 fleet tenant baseline: tuned beats BGE **4/4** sites (+0.023–0.058 nDCG) |
| 2026-06-28 | §3.6 AG News reconfirmed: VICReg **neutral** vs InfoNCE (dNDCG +0.004); mechanism validated only in synthetic collapse regime |
| 2026-06-27 | Root cause of gate-1 failure found: **batch-capped collapse trigger** fired surgery every 10 steps unconditionally. Fixed to a rolling-window measurement; 30-epoch re-run shows ASN at no-harm parity (surgeries=0). Benefit claim still **Hypothesis** (no collapse regime to test it). New: `scripts/engine_proof.py`. |
| 2026-06-27 | §3.2 collapse-regime experiment (`scripts/collapse_regime.py`): InfoNCE doesn't collapse (wrong framing); in a real collapse regime ASN surgery makes it **worse** (rank 3.4→1.0, kNN −12-21pts, 3 seeds). Mechanism claim **Rejected in current form** — fights anisotropy, not collapse. Method needs redesign. |
| 2026-06-27 | §3.3 anti-collapse redesign (`scripts/collapse_redesign.py`, new `spectral_lift` op + tests): lifting (not shrinking) the weak band **fixes** three-tier's harm — no rank crash (1.0→2.06), kNN preserved (1.000), strictly dominant. But still **below** the do-nothing baseline (2.06 vs 3.40), so benefit-over-baseline **Rejected**. In-loop weight-space SVD surgery can't outrun the collapse gradient; loss-space rank-floor regularizer indicated next. |
| 2026-06-27 | §3.4 loss-space rank floor (`scripts/collapse_lossreg.py`, new VICReg `variance_regularization`/`covariance_regularization` + tests): **SUPPORTED** — served rank 12.1→21.0 (+8.9, full recovery), kNN preserved, 3 seeds. Loss-space regularization prevents collapse where all weight-space surgery failed. Mechanism claim now **Measured**; product claim still needs real-text/commercial-baseline eval. Suite 13/13 green. |
| 2026-06-27 | §3.5 sleep/SHY consolidation (`asn_engine/sleep.py` + `scripts/sleep_consolidation.py`): bio-inspired wake/sleep **REJECTED as a pattern** — homeostasis-only ~no effect; periodic VICReg "dreams" worse than baseline (9.99 @day50, 5.71 @day10). Same lesson as §3.2/§3.3: anti-collapse must be continuous in the loss. `synaptic_downscale` kept as collapse-neutral renormalizer. |
| 2026-06-27 | §3.6 real-text validation (`scripts/realtext_validation.py`, AG News): VICReg vs InfoNCE **neutral** (ΔnDCG −0.0005) — InfoNCE already resists collapse on real text. Domain-tuned MiniLM (nDCG 0.822) **beats zero-shot BGE-small** (0.776) in-domain → domain adaptation is the measured product lever (caveat: in-domain vs zero-shot). |
| 2026-06-28 | §3.7 two-wave sweep (**891 runs**, `scripts/sweep.py`+`bayes_search.py`+`domain_sweep.py`; see SWEEP_FINDINGS.md/SWEEP_REPORT.md): H-A confirmed (anti-collapse value regime-specific: SimSiam +0.32, InfoNCE ~0 @batch≥16); **Barlow Twins beats VICReg** (TPE robust-score 1.42 vs 1.17); H-B/H-D rejected (decorrelation doesn't aid truncation/retrieval; int8 free; MRL is the truncation lever); domain fine-tune +1.5–3% in-domain with **no OOD forgetting**. |
| 2026-07-04 | AR-311 (first cert-driven ticket, Spec 0021): auxiliary Barlow on served `[:, :8]`, weight 0.25 — **KEEP**, robust 1.411→1.4216, knn_t8 0.3862→0.40, knn_full 0.8113→0.815 (2 seeds, synthetic harness); weight 1.0 arm DISCARD (1.4182). Baseline re-recorded per AR-310 (`best.json` from unchanged-champion null run; stale Wave-2 seed 1.465/0.8562 retired — it had made every KEEP unreachable). Origin gate `mrlWithinTolerance` still fails (drop 0.415 vs 0.05 tolerance) → no BD promotion; flagged 0.05 absolute drop tolerance at 8-of-64 dims as a possible Spec 0008 calibration issue. |
| 2026-07-02 | REV-905: eval gate now **fails closed** below 8 real collection pairs — removed the silent demo-pair fallback in `services/core-api/app/services/eval.py` that could pass gates on 3 hard-coded demo pairs. Added `sufficientEvalPairs` gate, `MIN_REAL_PAIRS_EVAL=8` (train minimum unchanged at 10), `allow_demo` manual-smoke opt-in, and `services/core-api/tests/test_eval.py` (6 cases). Spec 0008 gate table + §2 updated. |
