"""Spectral diagnostics and surgery.

All three functions are verified in tests/test_spectral.py.
Math references are in ../../SCIENCE_REVIEW.md §1 and §3.
"""

from __future__ import annotations

import torch
from torch import Tensor


def effective_rank(x: Tensor, eps: float = 1e-12) -> float:
    """Effective rank = exp(Shannon entropy of the normalized singular-value spectrum).

    Roy & Vetterli (2007). Returns ~1.0 for a rank-1 matrix and ~min(n, d) for an
    isotropic (full-rank, uniform-spectrum) matrix.
    """
    s = torch.linalg.svdvals(x)
    s = s[s > eps]
    if s.numel() == 0:
        return 0.0
    p = s / s.sum()
    entropy = -(p * p.log()).sum()
    return float(torch.exp(entropy))


# Quintic Newton-Schulz coefficients from the Muon optimizer (Bernstein/Jordan et al.).
# These are tuned for a steep slope near zero (fast escape from collapsed directions),
# NOT for exact convergence to 1. Measured fixed band ≈ [0.68, 1.27]; it is stable (5 vs
# 20 steps agree). For exact orthogonalization (σ→1) use newton_schulz_cubic. See
# SCIENCE_REVIEW.md §3.
_NS_A, _NS_B, _NS_C = 3.4445, -4.7750, 2.0315


def newton_schulz(g: Tensor, steps: int = 5, eps: float = 1e-7) -> Tensor:
    """Semi-orthogonalize a matrix via quintic Newton-Schulz iteration (no SVD).

    Pre-normalizes by the Frobenius norm so the iteration stays in its convergent region,
    then applies the quintic Muon map ``steps`` times. This is a *fast conditioner*: it
    pulls the singular spectrum into a stable band ≈ [0.68, 1.27] (it does NOT drive σ to
    exactly 1 — that is a deliberate Muon tradeoff). Ideal for keeping a projection head
    well-conditioned in-loop. Operates on the shorter dimension by transposing when
    rows > cols. For an exact orthogonal factor, use ``newton_schulz_cubic``.
    """
    assert g.ndim == 2, "newton_schulz expects a 2D matrix"
    x = g.to(torch.float32)
    x = x / (x.norm() + eps)
    transpose = x.shape[0] > x.shape[1]
    if transpose:
        x = x.T
    for _ in range(steps):
        a = x @ x.T
        b = _NS_B * a + _NS_C * (a @ a)
        x = _NS_A * x + b @ x
    if transpose:
        x = x.T
    return x.to(g.dtype)


def newton_schulz_cubic(g: Tensor, steps: int = 15, eps: float = 1e-7) -> Tensor:
    """The whitepaper's cubic variant f(X) = (3X - X XᵀX)/2 — the EXACT orthogonalizer.

    Unlike the quintic, this converges to the true polar factor: with enough steps every
    singular value goes to exactly 1 (measured: σ→1.0000 by ~40 steps). The cost is speed —
    it converges slowly and diverges for singular values ≳ 1.7, so it needs aggressive
    spectral-norm pre-normalization and many more steps. Use this when you need genuine
    orthogonality; use ``newton_schulz`` (quintic) for fast in-loop conditioning.
    """
    x = g.to(torch.float32)
    x = x / (x.norm() + eps)
    transpose = x.shape[0] > x.shape[1]
    if transpose:
        x = x.T
    for _ in range(steps):
        x = 1.5 * x - 0.5 * (x @ x.T @ x)
    if transpose:
        x = x.T
    return x.to(g.dtype)


def three_tier_surgery(
    singular_values: Tensor,
    strong_k: int,
    tail_k: int,
    lam: float,
    weak_weights: Tensor | None = None,
) -> Tensor:
    """Three-tiered spectral surgery (ASN core).

    Partition the ordered singular-value spectrum into:
      * strong (top ``strong_k``): preserved (task-critical semantics);
      * tail (bottom ``tail_k``): protected (fine-grained / episodic features);
      * weak (the middle): penalized by ``lam`` — the spurious/anisotropic band.

    ``weak_weights`` (per-index, in [0,1]) implements heterosynaptic protection: directions
    with a high EMA of gradient activity are shrunk less. Defaults to uniform.

    Returns an adjusted spectrum (same shape). This is the diagonal operator; the caller
    reconstructs ``U @ diag(s') @ V^T`` (or applies it to weights) as needed.
    """
    s = singular_values.clone()
    n = s.numel()
    if strong_k + tail_k >= n:
        return s  # nothing in the weak band; no-op
    weak = slice(strong_k, n - tail_k)
    if weak_weights is None:
        keep = torch.full_like(s[weak], 1.0 - lam)
    else:
        ww = weak_weights[weak].clamp(0.0, 1.0)
        keep = 1.0 - lam * (1.0 - ww)  # protected (ww→1) keeps more
    s[weak] = s[weak] * keep
    return s


def spectral_lift(
    singular_values: Tensor,
    floor_frac: float = 0.25,
    ref: str = "max",
) -> Tensor:
    """Anti-collapse spectral lift (rank-floor operator).

    The DUAL of ``three_tier_surgery``. Three-tier surgery *shrinks* the weak band to
    combat **anisotropy** (too few *dominant* directions). Dimensional **collapse** is the
    opposite pathology — too few *active* directions — so shrinking weak singular values
    only finishes the collapse (measured: served rank 3.4→1.0; see EVIDENCE.md §3.2).

    This operator instead *raises* every singular value to at least a floor, pulling the
    suppressed directions back toward the dominant band and flattening the spectrum. A flatter
    spectrum has higher effective rank (= exp Shannon entropy of the normalized spectrum), so
    the served representation regains usable directions instead of losing them.

    Args:
      singular_values: ordered (descending) singular-value spectrum, shape ``(n,)``.
      floor_frac: floor as a fraction in [0, 1] of the reference value. ``0`` is a no-op.
      ref: reference for the floor —
        * ``"max"``    → floor = ``floor_frac * s.max()`` (fraction of the top SV);
        * ``"geomean"``→ floor = ``floor_frac * geometric_mean(s>0)`` (gentler, scale-free).

    Returns:
      An adjusted spectrum (same shape), with every value clamped up to the floor. Never
      shrinks a singular value, so the strong band is preserved exactly. The caller
      reconstructs ``U @ diag(s') @ V^T`` as needed.
    """
    s = singular_values.clone()
    pos = s[s > 0]
    if pos.numel() == 0:
        return s
    if ref == "max":
        floor = floor_frac * s.max()
    elif ref == "geomean":
        floor = floor_frac * torch.exp(pos.log().mean())
    else:
        raise ValueError(f"ref must be 'max' or 'geomean', got {ref!r}")
    return s.clamp(min=floor)
