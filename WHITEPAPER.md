# AwakenedSleepNet (ASN)
### Sleep-Inspired Spectral Regularization for Collapse-Resistant Embedding Models

**A technical whitepaper.** Status: working draft (v3). This document is the scientific
center of the project; the platform (`PLAN.md`) exists to collect data for, train, validate,
deploy, and serve models that implement the method defined here.

> **Integrity contract.** Every empirical/mathematical claim below is (a) traceable to a
> cited, verified source, (b) a standard result reproduced correctly, or (c) explicitly
> labeled a hypothesis or design choice to be settled by the evaluation protocol in §8.
> Biological mechanisms are **inspiration**, not proven equivalences. There is no
> self-certification of accuracy anywhere in this document; correctness is established by
> measurement, not assertion. See `SCIENCE_REVIEW.md` for the audit behind this revision.

---

## Abstract

Contrastive embedding models suffer **dimensional collapse**: learned representations
concentrate variance in a few directions and leave most of the embedding space unused,
capping retrieval quality and robustness (Jing et al., 2022). We present **AwakenedSleepNet
(ASN)**, a training method that treats collapse as a problem of *spectral health*. ASN adds
three mechanisms to a standard contrastive loop: (1) continuous monitoring of the embedding
**effective rank** (Roy & Vetterli, 2007), used as a state-dependent trigger; (2) a
**three-tier spectral surgery** operator that preserves dominant task directions and a
protected fine-grained tail while attenuating an intermediate band of spurious, anisotropic
directions, with per-direction attenuation modulated by an EMA of gradient activity
("heterosynaptic protection"); and (3) periodic **quintic Newton–Schulz orthogonalization**
of weight matrices to rebalance the spectrum without a full SVD (Jordan, 2024). A discardable
**information-bottleneck projection head** (Su et al., 2025) is used during training only.
ASN composes with continuous-relevance (zELO) distillation and Matryoshka compression. The
design is *inspired by* the synaptic-homeostasis account of NREM sleep — recently shown to be
inducible as a local cortical operation in awake mice (Nature Neuroscience, 2026) — but no
biological equivalence is claimed. Every component is defined to be falsifiable by the
intrinsic + extrinsic evaluation gates in §8.

---

## 1. Notation

| Symbol | Meaning |
|---|---|
| `x, x⁺, x⁻` | anchor, positive, negative inputs |
| `f_θ` | encoder (transformer backbone + mean pooling) |
| `g_φ` | projection head (training only; discarded at serving) |
| `z = f_θ(x)` | encoder embedding, `z ∈ ℝ^d` (the served representation) |
| `h = g_φ(z)` | projector embedding (used only by the contrastive loss) |
| `H ∈ ℝ^{n×d}` | matrix of `n` encoder embeddings |
| `σ₁ ≥ … ≥ σ_r` | singular values of a matrix, `r = min(n,d)` |
| `erank(·)` | effective rank (Def. 3.1) |
| `τ` | InfoNCE temperature |
| `W` | a trainable weight matrix subject to orthogonalization |
| `k_s, k_t` | sizes of the strong (top) and tail (bottom) spectral tiers |
| `λ` | base attenuation applied to the weak/middle tier |
| `ŵ_i` | EMA of normalized gradient energy in singular direction `i` |

---

## 2. Problem: dimensional collapse

Dense retrieval and representation systems are trained with contrastive objectives whose
well-documented failure mode is **dimensional (spectral) collapse**: variance concentrates in
a few leading directions while the rest of the space goes unused (Jing, Vincent, LeCun &
Tian, 2022). The usual countermeasures — very large batches (for implicit negatives) and
uniform weight decay — are blunt: large batches are memory-bound and often infeasible for
high-dimensional/long-context corpora, and uniform decay wrongly assumes every layer and
every spectral direction deserves equal penalty. ASN intervenes in the spectral domain, only
where and when collapse is occurring.

---

## 3. Collapse, formalized

**Definition 3.1 (Effective rank; Roy & Vetterli, 2007).** For `H` with singular values
`{σ_k}` let `p_k = σ_k / Σ_j σ_j`. Then

```
erank(H) = exp( − Σ_k p_k ln p_k ).
```

`erank ∈ [1, r]`: it equals 1 under total collapse (all variance in one direction) and `r`
for a flat (isotropic) spectrum. It is a smooth proxy for "dimensions actually used."
*Verified numerically:* rank-1 → `erank ≈ 1.000`; Gaussian `256×64` → `erank ≈ 62` (ceiling
64).

**Why monitor rather than directly maximize.** `erank` is differentiable and could be added
to the loss; RankMe (Garrido et al., 2023) shows rank is a strong unsupervised predictor of
downstream quality. But directly maximizing entropy of the spectrum can flatten *genuinely*
important dominant directions and is numerically delicate near degenerate spectra. ASN
therefore uses `erank` as a **trigger and diagnostic**, and acts through the structured,
tier-aware operator of §4.2, which protects the directions a naive rank objective would harm.

A complementary geometric check is the **alignment/uniformity** pair (Wang & Isola, 2020),
reported alongside `erank`.

---

## 4. The ASN method

ASN augments a contrastive fine-tuning loop. The base objective is symmetric **InfoNCE**
(van den Oord et al., 2018; Chen et al., 2020):

```
ℓ_InfoNCE = −(1/2)[ CE(softmax(HₐHᵦᵀ/τ), I) + CE(softmax(HᵦHₐᵀ/τ), I) ],
```

with `Hₐ, Hᵦ` the L2-normalized projector embeddings of paired views and `I` the
identity-matched targets. Collapse control is added on top.

### 4.1 Effective-rank trigger

On held-out batches ASN tracks `erank(H_enc)` (encoder space). When it falls below a target
band `[r_lo, r_hi]` — i.e., the spectrum is concentrating — ASN fires a recalibration: the
spectral surgery of §4.2 and/or the orthogonalization of §4.3. Acting on a trigger (rather
than every step) keeps the intervention local in time, mirroring the homeostatic,
on-demand nature of the biological motivation (§5) and limiting overhead.

### 4.2 Three-tier spectral surgery (heterosynaptic protection)

Let a target matrix `M` (a weight matrix, or a batch covariance `HᵀH`) have SVD
`M = U Σ Vᵀ`, `Σ = diag(σ_1,…,σ_r)`. ASN applies a **per-direction gate** `g_i` and
reconstructs `M' = U diag(g_i σ_i) Vᵀ`, with three tiers:

```
            ┌ g_i = 1                      , i ≤ k_s            (STRONG: preserve)
   g_i  =   ┤ g_i = 1 − λ·(1 − ŵ_i)        , k_s < i ≤ r − k_t  (WEAK: attenuate)
            └ g_i = 1                      , i > r − k_t        (TAIL: protect)
```

- **Strong tier** (`k_s` largest): dominant task-critical directions — preserved.
- **Weak/middle tier**: where spurious, dataset-specific, anisotropic structure accumulates —
  attenuated by `λ`, *softened* per-direction by `ŵ_i ∈ [0,1]`, an EMA of normalized gradient
  energy along direction `i`. Directions that are consistently, productively active (high
  `ŵ_i`) are spared even inside the weak band — the "heterosynaptic" analogue of sleep
  sparing consolidated traces while down-selecting saturated bulk.
- **Tail tier** (`k_t` smallest): rare, fine-grained features that matter for high-precision
  retrieval — protected. (Uniform small-singular-value thresholding is the wrong default
  precisely because it destroys this tail.)

`k_s`, `k_t`, `λ` are hyperparameters; §8 specifies how they are set and ablated.

### 4.3 Newton–Schulz orthogonalization (quintic; corrected)

To rebalance a weight matrix `W` toward isotropy without a per-step SVD, ASN uses **Newton–
Schulz iteration**, the orthogonalization primitive of the Muon optimizer (Jordan, 2024;
Bernstein & Newhouse, 2024). Normalize `X₀ = W/‖W‖_F`, then iterate (typically 5×):

```
A = Xₖ Xₖᵀ
Xₖ₊₁ = a·Xₖ + (b·A + c·A²)·Xₖ ,   (a,b,c) = (3.4445, −4.7750, 2.0315).
```

This drives the singular values of `X` toward 1 (verified: 5–8 steps bring them into
≈[0.7,1.3] from random init), yielding an approximately orthogonal `X` (the polar factor).

**Complexity & why NS, not SVD.** A thin SVD of a `d×d` matrix costs `O(d³)` with a memory
pattern dominated by sequential eigen-routines that parallelize poorly and can be numerically
fragile in low precision. Newton–Schulz costs `k` matmuls, `O(k·d³)` — *not asymptotically
cheaper* — but it is **matmul-only** (GPU-optimal, batchable), **stable in bf16/fp16**, and
**differentiable end-to-end**. The win is constant-factor throughput, hardware fit, and
stability, not big-O.

> **Correction from earlier drafts.** The cubic map `f(X)=(3X−X³)/2` is a valid NS iteration
> (scalar fixed point at 1) but converges slowly and **diverges for singular values ≳ 1.7**.
> The quintic coefficients above are the production choice; the cubic is a documented, slower
> fallback only.

### 4.4 Information-bottleneck projection head

ASN attaches an MLP projection head during training and **discards it for serving** (standard
since SimCLR). Su et al. ("Projection Head is Secretly an Information Bottleneck," ICLR 2025,
arXiv:2503.00507) show *why*: an effective projector acts as an **information bottleneck**,
filtering information irrelevant to the contrastive objective so the **encoder** retains more
downstream-useful signal. ASN adopts the two practical levers that follow — regularizing the
information flow between encoder and projector features, and optionally **discretizing** the
projector output (e.g., a straight-through codebook) to lower its entropy. These are used
**qualitatively**; ASN does not treat any specific mutual-information inequality as a hard
design constraint until it is re-derived against that source (see §9). The evaluation gates
decide whether each lever earns its place.

### 4.5 Algorithm

```
Algorithm 1 — ASN training step
Input: batch B; encoder f_θ, projector g_φ; temperature τ; tiers (k_s,k_t); λ;
       NS steps K; EMA decay β; trigger band [r_lo, r_hi]; orthogonalize-every T.
1:  views (x_a, x_b) ← augment(B)
2:  H_a ← g_φ(f_θ(x_a)); H_b ← g_φ(f_θ(x_b))      # projector space
3:  L ← ℓ_InfoNCE(H_a, H_b; τ)  [ + λ_zelo · ℓ_zELO  if graded labels ]   # §4.6
4:  L ← L  [ + Σ_m w_m · ℓ_InfoNCE(H_a[:m], H_b[:m]) ]                     # Matryoshka, §7
5:  backprop L; update (θ, φ)
6:  ŵ ← β·ŵ + (1−β)·normalized_grad_energy_per_direction()                # heterosynaptic EMA
7:  if step % eval_period == 0:
8:      e ← erank(encoder_embeddings(holdout))
9:      if e < r_lo:                                                       # §4.1 trigger
10:         apply three_tier_surgery(weights; k_s,k_t,λ,ŵ)                 # §4.2
11: if step % T == 0:
12:     for W in orthogonalizable_layers: W ← newton_schulz(W, K)         # §4.3
```

### 4.6 Optional: continuous-relevance (zELO) distillation

Binary positive/negative labels punish a partially-relevant document like an irrelevant one.
When graded relevance is available or synthesizable, ASN incorporates **zELO** (ZeroEntropy,
arXiv:2509.12541): pairwise LLM/cross-encoder preferences → Thurstone model → continuous
scores; the student matches them (e.g., MSE between predicted cosine similarity and the zELO
target). zELO improves the *target*; ASN keeps the *representation* from collapsing while
fitting it. (zELO was developed for rerankers; bi-encoder distillation is a reasonable but not
independently validated extension — flagged in §9.)

### 4.7 Legacy-space alignment (Procrustes)

To avoid re-indexing a corpus when a model is replaced, ASN maps a legacy space `X` to the new
space `Y` via orthogonal **Procrustes** (Schönemann, 1966): from `XᵀY = UΣVᵀ`,
`R = UVᵀ` solves `min_R ‖XR − Y‖_F` s.t. `RᵀR = I`. *Verified:* recovers a known rotation to
`‖R − R*‖_F < 1e-4`.

---

## 5. Biological inspiration (and its limits)

The **Synaptic Homeostasis Hypothesis (SHY)**: wakeful learning nets up synaptic strength,
and NREM sleep renormalizes (down-selects) synapses to restore signal-to-noise, energy
efficiency, and future learning capacity (Tononi & Cirelli, 2006; 2014). A 2026 *Nature
Neuroscience* study showed that locally inducing alternating cortical **ON/OFF periods** in
*awake* mice reproduces sleep's restorative signatures — local reduction of subsequent
slow-wave activity, reduced synaptic-strength markers, and restored memory consolidation under
sleep deprivation — without global sleep (Nature Neuroscience, 2026; NIH, 2026). The borrowed
bias is narrow: the restorative operation is **local** and **homeostatic** — weaken an
over-potentiated bulk while protecting consolidated structure. That maps onto §4.2
(attenuate the weak middle, protect strong + tail) and §4.1 (act on a homeostatic trigger).
**We claim inspiration, not equivalence.** Only §8 is evidence.

---

## 6. From method to product (the lifecycle)

ASN is the training method; the platform turns it into continuously improving,
domain-specialized models through a four-stage lifecycle (mirrored by the synthetic-org
agents in `apps/`):

1. **Collect data.** Domain adaptation by masked-language modeling (MLM) on the tenant
   corpus, masking domain entities (acronyms, codes) at elevated rates; semantic chunking via
   **LMAR** (arXiv:2508.05672) and synthetic query–evidence pair generation.
2. **Train / validate.** ASN contrastive fine-tuning (Algorithm 1), optionally zELO-distilled,
   with intrinsic + extrinsic gates (§8).
3. **Applied test.** Evaluate the candidate in the target application (e.g., retrieval against
   rotating, freshly-synthesized eval slices and live-like queries) before promotion.
4. **Real-world use.** Promote to serving with **Matryoshka** truncation (Kusupati et al.,
   2022) + int8/binary quantization; monitor drift and feed it back to stage 1.

ASN's anti-collapse behavior matters most at stage 2 and pays off at stage 4: a healthier
effective rank means truncated Matryoshka prefixes keep more usable signal.

---

## 7. Compression and multi-task heads

**Matryoshka loss.** To make a single vector truncatable, ASN sums the contrastive loss over
nested prefixes `m ∈ M` (e.g., {64,128,256,512,1024}):

```
ℓ_MRL = Σ_{m∈M} w_m · ℓ_InfoNCE(H[:m]) ,
```

front-loading information so a 1024-d vector truncates to 256/128/64 with bounded loss
(Kusupati et al., 2022). Quantization to int8 (4×) or binary (32×, Hamming/`POPCNT` recall)
follows at serving.

**Multi-task balancing (applied heads).** When a mini-org trains auxiliary heads (e.g. the
finance vertical's volatility / masked-market / portfolio heads), static loss weights are
brittle. ASN uses **GradNorm** (Chen et al., 2018) or **uncertainty weighting** (Kendall et
al., 2018) so no head's gradient dominates — this is the answer to the open question the MTNN
source ended on (static vs. dynamic λ): use dynamic.

---

## 8. Evaluation protocol (how every claim is falsified)

**Intrinsic (geometry):** effective-rank trajectory of held-out encoder embeddings; Wang–Isola
alignment & uniformity.

**Extrinsic (utility):** retrieval nDCG@10 and Recall@k on held-out, **rotating** eval slices
(rotation prevents overfitting a static benchmark) and on public **MTEB** tasks for
comparability.

**Baselines:** plain InfoNCE/SimCLR; InfoNCE + uniform weight decay; InfoNCE + RankMe-style
rank regularization.

**Ablations (each removed independently):** (a) no spectral surgery; (b) uniform thresholding
instead of three-tier; (c) no heterosynaptic `ŵ` softening; (d) no Newton–Schulz; (e) cubic
instead of quintic NS; (f) no projection-head bottleneck; (g) no Matryoshka.

**CI-enforced gates:**
1. ASN holds effective rank **above** the plain-InfoNCE baseline at **equal-or-better**
   nDCG@10.
2. Matryoshka truncation to 256/128/64 degrades nDCG@10 by less than a stated tolerance.
3. Any biological/theoretical motivation that cannot be reduced to a measurable gate is
   treated as narrative, not a product claim.

**Reproducibility:** fixed seeds, pinned data versions, logged recipes; every run writes its
metric delta to the experiment ledger.

---

## 9. Relationship to prior work

ASN composes verified primitives around a collapse-control objective and a sleep-homeostasis
bias: collapse & spectra (Jing et al., 2022; Roy & Vetterli, 2007; RankMe, Garrido et al.,
2023); contrastive learning (van den Oord et al., 2018; SimCLR, Chen et al., 2020; Wang &
Isola, 2020); orthogonalization (Muon — Jordan, 2024; Bernstein & Newhouse, 2024);
projection-head theory (Su et al., 2025); relevance distillation (zELO, 2025); compression
(Matryoshka, Kusupati et al., 2022); multi-task balancing (GradNorm — Chen et al., 2018;
uncertainty weighting — Kendall et al., 2018); biology (SHY — Tononi & Cirelli, 2006/2014;
awake ON/OFF — Nature Neuroscience, 2026). The contribution is the **integration**: an
effective-rank-triggered, tier-aware, heterosynaptically-protected spectral regularizer for
contrastive embedding training, with a production lifecycle and falsifiable gates around it.

---

## 10. Limitations & open questions

- **The biology is analogy, not evidence.** Only §8 is evidence.
- **Projection-head bounds** are used qualitatively pending first-principles re-derivation.
- **Tier boundaries (`k_s,k_t,λ`) and the EMA protection** are hypotheses to validate per
  domain (ablations f/c/d in §8).
- **zELO→bi-encoder distillation** is an unvalidated extension here.
- **State-of-the-art claims are deferred** until the gates in §8 are met against named
  baselines/datasets. No accuracy self-certification appears in this paper.

---

## 11. Conclusion

ASN reframes embedding collapse as spectral health and treats it with a small set of verified,
correctly-implemented primitives — effective-rank monitoring, tier-aware
heterosynaptically-protected spectral surgery, quintic Newton–Schulz orthogonalization, and an
information-bottleneck projection head — organized by a sleep-homeostasis bias and held to an
explicit, falsifiable evaluation protocol. It is buildable today, composes with a modern
enterprise pipeline (MLM → LMAR → ASN/zELO → Matryoshka), and is engineered so that every
claim is proven or disproven by measurement.

---

## References

1. B. Roy, M. Vetterli. *The effective rank: a measure of effective dimensionality.* EUSIPCO 2007.
2. L. Jing, P. Vincent, Y. LeCun, Y. Tian. *Understanding Dimensional Collapse in Contrastive Self-Supervised Learning.* ICLR 2022. arXiv:2110.09348.
3. A. van den Oord, Y. Li, O. Vinyals. *Representation Learning with Contrastive Predictive Coding.* 2018. arXiv:1807.03748.
4. T. Chen, S. Kornblith, M. Norouzi, G. Hinton. *A Simple Framework for Contrastive Learning of Visual Representations (SimCLR).* ICML 2020. arXiv:2002.05709.
5. T. Wang, P. Isola. *Understanding Contrastive Representation Learning through Alignment and Uniformity on the Hypersphere.* ICML 2020. arXiv:2005.10242.
6. Q. Garrido, R. Balestriero, L. Najman, Y. LeCun. *RankMe: Assessing the Downstream Performance of Self-Supervised Representations by their Rank.* ICML 2023. arXiv:2210.02885.
7. G. Tononi, C. Cirelli. *Sleep function and synaptic homeostasis.* Sleep Med. Rev. 2006; *Sleep and the Price of Plasticity.* Neuron 2014.
8. *Induction of cortical ON/OFF periods in awake mice fulfills sleep functions.* Nature Neuroscience 2026 (doi:10.1038/s41593-026-02318-9; PMC12632314); NIH news release, 2026.
9. K. Jordan. *Muon: An optimizer for the hidden layers of neural networks.* 2024. (Newton–Schulz orthogonalization.) J. Bernstein, L. Newhouse, *Old Optimizer, New Norm.* 2024.
10. Y. Su et al. *Projection Head is Secretly an Information Bottleneck.* ICLR 2025. arXiv:2503.00507. Code: github.com/PKU-ML/Projector_Theory.
11. ZeroEntropy. *zELO: ELO-inspired Training Method for Rerankers and Embedding Models.* 2025. arXiv:2509.12541.
12. A. Kusupati et al. *Matryoshka Representation Learning.* NeurIPS 2022. arXiv:2205.13147.
13. P. H. Schönemann. *A generalized solution of the orthogonal Procrustes problem.* Psychometrika 1966.
14. Z. Chen et al. *GradNorm: Gradient Normalization for Adaptive Loss Balancing.* ICML 2018. arXiv:1711.02257.
15. A. Kendall, Y. Gal, R. Cipolla. *Multi-Task Learning Using Uncertainty to Weigh Losses.* CVPR 2018. arXiv:1705.07115.
16. *LMAR: Language Model Augmented Retriever for domain-specific knowledge indexing.* 2025. arXiv:2508.05672.

> References are limited to sources verified directly. A full citation-verification pass
> (resolving each DOI/arXiv ID with access dates) is recommended before external distribution.
