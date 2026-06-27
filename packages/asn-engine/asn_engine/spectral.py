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
# Verified to drive singular values toward 1 in ~5 steps. See SCIENCE_REVIEW.md §3.
_NS_A, _NS_B, _NS_C = 3.4445, -4.7750, 2.0315


def newton_schulz(g: Tensor, steps: int = 5, eps: float = 1e-7) -> Tensor:
    """Orthogonalize a matrix via quintic Newton-Schulz iteration (no SVD).

    Pre-normalizes by the spectral (Frobenius upper-bound) norm so the iteration stays in
    its convergent region, then applies the quintic map ``steps`` times. Operates on the
    shorter dimension by transposing when rows > cols.
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
    """The whitepaper's cubic variant f(X) = (3X - X^3)/2. VALID BUT SLOWER.

    Kept only as a documented fallback. Diverges for singular values >~1.7, so it needs
    aggressive pre-normalization and many more steps than the quintic. Prefer newton_schulz.
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
