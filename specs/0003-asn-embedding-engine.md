# 0003 — ASN Embedding Engine

- **Status:** Draft
- **Related specs:** 0001, 0005
- **Reviewer note:** all math here is checked against `SCIENCE_REVIEW.md`.

## Problem
Contrastive embedding training collapses into a low-rank cone, wasting representational
capacity. ASN counters this with effective-rank monitoring + spectral surgery +
orthogonalization + an information-bottleneck projection head — inspired by (not equivalent
to) sleep-driven synaptic homeostasis.

## Goals
- A pure-ML package (no web/db) implementing the verified ASN mechanisms with tests.
- Deterministic, seedable, framework-idiomatic PyTorch.

## Non-goals
- Claims of biological equivalence. We say "inspired by." (See SCIENCE_REVIEW §2.)

## Design / Contract
Modules in `packages/asn-engine/asn_engine/`:

- `spectral.effective_rank(X) -> float` — `exp(entropy(normalized singular values))`.
  Verified: rank-1 → 1.0; isotropic → ≈ min(n,d).
- `spectral.newton_schulz(G, steps=5) -> Tensor` — quintic Muon orthogonalization
  (coeffs 3.4445, −4.7750, 2.0315). Drives singular values → 1. Cubic variant kept as
  documented fallback.
- `spectral.three_tier_surgery(S, strong_k, noise_k, lambda_) -> S'` — partition singular
  values into strong (preserve) / weak (penalize by `lambda_`) / tail (protect); returns
  adjusted spectrum. Heterosynaptic `lambda_` is EMA-gradient-weighted (protect consistently
  active directions).
- `losses.info_nce(z_a, z_b, temperature)` — standard InfoNCE.
- `losses.cosine_contrastive(a, p, n, margin)` — the Source-2 contrastive form.
- `projection_head.ProjectionHead` — MLP used in pretraining, discarded for serving;
  optional discretization to lower projector entropy (info-bottleneck).
- `align.procrustes(X, Y) -> R` — orthogonal Procrustes via SVD (`R = UVᵀ`).
- `model.ASNEncoder` — backbone (HF `transformers`) + mean pooling + projection head;
  forward returns (encoder_features, projector_features).

## Acceptance criteria
1. `effective_rank` returns 1.0 (±1e-3) for a rank-1 matrix and ≥ 0.9·min(n,d) for Gaussian.
2. `newton_schulz` output has singular values within [0.7, 1.3] in ≤ 8 steps on random
   square inputs (verified empirically).
3. `procrustes` recovers a known rotation to ‖R−R*‖_F < 1e-5.
4. `info_nce` matches a reference implementation to 1e-6 on fixed inputs.

## Test plan
- `tests/test_spectral.py`, `tests/test_losses.py`, `tests/test_align.py` (CPU, seeded).

## Evaluation gate
- **Metric:** effective rank of held-out embeddings + retrieval nDCG@10.
- **Dataset:** a small fixed corpus checked into `eval-harness` fixtures.
- **Rule:** an ASN training run must hold effective rank **above** the plain-InfoNCE
  baseline at **equal or better** nDCG@10. CI fails the PR otherwise.

## Risks
- Newton-Schulz divergence on ill-scaled inputs → pre-normalize by spectral norm; covered by
  tests at extreme scales.
