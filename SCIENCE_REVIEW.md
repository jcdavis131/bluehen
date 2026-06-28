# Science-Integrity Review — ASN Whitepaper

**Reviewer role:** lead AI research fellow.
**Verdict:** The *core mechanisms* are real, well-grounded, and buildable. The *framing* is
overstated and the *citations* are substantially unreliable. We build on the verified
mechanisms and strip the unverifiable claims before any of this reaches product copy.

This file is normative: anything marked **DROP** must not appear in marketing, docs, or
code comments; anything marked **VERIFY** must be checked against a primary source before it
becomes load-bearing.

**Primary input:** [`docs/sources/03-asn-scientific-novelty-review.md`](./docs/sources/03-asn-scientific-novelty-review.md)
(deep literature review). Educational and integration sources (`01`, `06`) must defer here.

---

## 1. Verified — real, standard, and safe to build on

| Mechanism in the paper | Reality | Notes |
|---|---|---|
| **Effective rank** = `exp(H(p))` over normalized singular values | ✅ Roy & Vetterli, *The effective rank* (2007) | Implemented and unit-tested in `asn-engine` (rank-1 → 1.0; isotropic → ≈ full). |
| **Newton-Schulz orthogonalization** | ✅ Real; basis of the **Muon** optimizer | See §3 — the paper's cubic is valid but suboptimal; we use the quintic. |
| **Dimensional / representation collapse** in contrastive SSL | ✅ Jing et al., *Understanding Dimensional Collapse in Contrastive SSL* (ICLR 2022) | The motivating problem is genuine. |
| **InfoNCE / contrastive learning** | ✅ van den Oord et al. (2018); SimCLR (Chen et al. 2020) | Standard. |
| **Uniformity & alignment** metrics | ✅ Wang & Isola (2020) | Used as an intrinsic diagnostic in `eval-harness`. |
| **Synaptic Homeostasis Hypothesis (SHY)** | ✅ Tononi & Cirelli | Legitimate neuroscience; *inspiration*, not a theorem about networks. |
| **Orthogonal Procrustes via SVD** (`R = UVᵀ`) | ✅ Schönemann (1966) | Correct as written in Source 2's spec. |
| **Mixture of Experts** | ✅ Shazeer et al. (2017); standard since | Fine. |
| **Differentiable Sharpe ratio + turnover penalty** (MTNN) | ✅ Real in deep portfolio optimization | Correct shape; see risk note in `PLAN.md` §10. |
| **PEFT / LoRA** | ✅ Hu et al. (2021) | The cost-control backbone of the Conductor. |

---

## 2. Overstated — keep the idea, downgrade the claim

- **"Mathematically equivalent" (biology ⇄ ML).** The paper repeatedly says sleep/synaptic
  homeostasis is *mathematically equivalent* to spectral regularization. It is an **analogy
  / inspiration**, not an equivalence. There is no proof of isomorphism. → Reword everywhere
  to "inspired by."
- **Information-bottleneck bounds** `I(Y;Z₁) ≥ I(Z₁;R) − I(Z₁;Z₂) + const` and the
  upper bound containing `+ H(Z₁)`. The projection-head-as-IB *direction* is a real research
  thread, but these specific inequalities need derivation against the cited source before we
  treat them as design constraints. → **VERIFY** before they drive architecture.
- **"Hebbian dynamics are an epiphenomenon of gradient descent"** and **"heterosynaptic
  circuits are universal gradient machines."** Interesting, plausibly from real 2025
  preprints, but strong claims. → **VERIFY**; treat as hypotheses, not foundations.
- **Specific empirical numbers** (e.g., effective rank "stagnates at ~16," expands "16 → 38"
  on CIFAR-10; "<15ms" / "sub-millisecond" latency). Unsourced or from unverifiable
  citations. → Do not quote as fact; reproduce ourselves and report our own numbers.
- **Related frameworks cited in Source 03 but not in v1 ASN:** Rank-enhancing Token Fuser (RTF),
  Spectral Disentanglement and Enhancement (SDE), HyperGCL, IConE batch-decoupling. Legitimate
  adjacent work → **VERIFY** if we adopt; not shipped in `asn-engine` today.
- **Optogenetic "awake sleep" as proof of algorithmic equivalence.** Real neuroscience (Cirelli/
  Tononi line); use as **inspiration** for localized layer triggers only — not as a theorem.

---

## 3. Technical correction (found during verification)

The paper proposes the orthogonalization iteration `f(X) = (3X − X³)/2`. I tested it:

- It **is** a valid Newton-Schulz iteration (fixed points at the singular-value target 1),
  but the scalar cubic converges slowly and **diverges for singular values ≳ 1.7**, so it
  requires careful spectral-norm pre-normalization and many steps.
- **Correction (2026-06-27, measured — supersedes the earlier note below).** An earlier draft
  claimed the **quintic Muon coefficients** `a,b,c = (3.4445, −4.7750, 2.0315)` "drive singular
  values to ≈ 1 in ~5 steps." Direct measurement shows that is **false**, and that the two
  iterations play the *opposite* roles to what was written:
  - **Quintic (Muon)** is a fast **semi-orthogonalizer**. It pulls the spectrum into a
    **stable band ≈ [0.68, 1.27]** and stays there — `steps` = 5, 8, 15, 30 all return the
    same band, so it is a *fixed point*, not convergence-in-progress. The coefficients are
    tuned for a steep slope near zero (fast escape from collapsed directions), not for σ→1.
    This is the correct tool for **fast in-loop conditioning** of the projection head — which
    is exactly how `train_loop.py` uses it.
  - **Cubic** `f(X) = (3X − X XᵀX)/2` is the **true orthogonalizer**: measured σ → 1.0000 by
    ~40 steps. Slower, and diverges for σ ≳ 1.7 without pre-normalization, but it is the one
    to reach for when genuine orthogonality is required.
  - The earlier "Frobenius vs spectral pre-norm" root-cause guess is **disproven**:
    pre-normalizing by σ_max gives the *identical* [0.68, 1.13] band. The band is intrinsic to
    the coefficients, not a pre-norm artifact.
- **Test gate (resolved 2026-06-27).** The old `test_newton_schulz_orthogonalizes` asserted
  `s.min() > 0.7` against the quintic — testing an orthogonalization property the quintic does
  not have (band floor ≈0.68, *stable*). Replaced by two measurement-derived tests:
  `test_newton_schulz_quintic_conditions_spectrum` (real band + fixed-point + conditioning) and
  `test_newton_schulz_cubic_orthogonalizes` (σ→1 for the cubic). We fit the assertion to the
  measured behavior — neither overstating nor weakening the science.

---

## 4. Unreliable citations — **DROP** until independently confirmed

The "Works cited" list mixes plausible real references with ones I cannot stand behind:

- **Future-dated arXiv IDs** that I could not verify: e.g. `2603.28964`, `2604.17878`,
  `2606.12883`, `2602.09066`, `2601.21986`, `2603.06698`, `2603.15263`. The `26xx` prefix
  implies 2026; several look fabricated or conflated. *Action:* none of these may be cited in
  product material until the DOI/arXiv page is confirmed by hand.
- **Mismatched PubMed IDs** for the awake-mouse ON/OFF result (the same finding is given
  three different PMIDs). The underlying Cirelli/Tononi line of work is real; the specific
  identifiers are not trustworthy as printed.
- **The phrase "100% scientifically accurate"** appears in the abstract and conclusion. Real
  papers never self-certify accuracy. → **DROP** outright. It is a credibility liability in
  any investor, customer, or peer-facing document.

I did not have reliable external lookup for every ID in this pass. I can run a citation-
verification pass (resolve each arXiv/PMID, flag dead/duplicate/fabricated) on request and
produce a corrected bibliography.

---

## 5. What this means for the build

1. The **engine is sound**: effective rank, Newton-Schulz, InfoNCE, spectral partitioning,
   and a projection head are all real and implementable — that is enough for a genuinely
   novel, defensible product.
2. We **measure instead of assert**: every claim ASN makes becomes an evaluation gate
   (`eval-harness`) so it is falsifiable in CI rather than asserted in prose. Living ledger:
   [`EVIDENCE.md`](./EVIDENCE.md) — when a gate fails, downgrade the claim (see 2026-06-28 gate 1).
3. We **scrub the narrative**: replace "equivalent" with "inspired by," delete the accuracy
   self-certification, and quarantine unverifiable citations until checked.
4. The math **primitives** are sound, but the **training-loop integration is not yet proven**.
   Two integration defects were found and fixed (2026-06-27): (i) the docstrings/§3 had the
   Newton-Schulz roles backwards (quintic semi-orthogonalizes, cubic orthogonalizes); (ii) the
   collapse trigger measured effective rank on a single batch — capped by batch size — so
   spectral surgery fired unconditionally and *hurt* the baseline (see `EVIDENCE.md` §3.1). With
   the trigger fixed, ASN reaches no-harm parity on non-collapsing data. The central product
   claim — **ASN raises effective rank under collapse without nDCG loss** — is still
   **Hypothesis**: it cannot be tested on a robust pretrained backbone with toy data (no collapse
   occurs). Do not put "collapse-resistant, better-than-commercial" in product copy until a
   collapse-regime experiment vs real baselines moves that row to **Measured**.
