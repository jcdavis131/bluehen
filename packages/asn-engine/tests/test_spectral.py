"""Verified-math tests for the ASN engine. CPU-only, seeded, fast.

These encode the acceptance criteria from specs/0003-asn-embedding-engine.md.
"""

import torch

from asn_engine.spectral import (
    effective_rank,
    newton_schulz,
    newton_schulz_cubic,
    three_tier_surgery,
)
from asn_engine.losses import info_nce, cosine_contrastive
from asn_engine.align import procrustes

torch.manual_seed(0)


def test_effective_rank_rank_one():
    u = torch.randn(256, 1)
    v = torch.randn(1, 64)
    assert abs(effective_rank(u @ v) - 1.0) < 1e-3


def test_effective_rank_isotropic():
    x = torch.randn(256, 64)
    er = effective_rank(x)
    assert er >= 0.9 * 64  # near full rank for a Gaussian matrix


def test_newton_schulz_quintic_conditions_spectrum():
    """The quintic Muon map is a fast *semi*-orthogonalizer, not an exact one.

    Measured behavior (SCIENCE_REVIEW.md §3): it drives the singular spectrum into a
    stable band (~[0.68, 1.27]) and stays there — it does NOT converge to exactly 1.
    We assert the real band with margin, that it is a fixed point (8 vs 20 steps agree),
    and that it sharply conditions the spectrum relative to the raw input.
    """
    m = torch.randn(64, 64)
    s8 = torch.linalg.svdvals(newton_schulz(m, steps=8))
    s20 = torch.linalg.svdvals(newton_schulz(m, steps=20))
    assert s8.min() > 0.6 and s8.max() < 1.3       # the quintic's true stable band
    # the band edges are a fixed point: extra steps don't widen or shift them
    assert abs(float(s8.min() - s20.min())) < 1e-2
    assert abs(float(s8.max() - s20.max())) < 1e-2
    # conditioning: the condition number (σ_max/σ_min) collapses from ~hundreds to ~1.7
    raw = torch.linalg.svdvals(m)
    assert (s8.max() / s8.min()) < 0.05 * (raw.max() / raw.min())


def test_newton_schulz_cubic_orthogonalizes():
    """The cubic map f(X) = (3X - X XᵀX)/2 is the *true* orthogonalizer.

    With enough steps its singular values converge to exactly 1 (the polar factor),
    which the quintic deliberately does not. See SCIENCE_REVIEW.md §3.
    """
    m = torch.randn(64, 64)
    s = torch.linalg.svdvals(newton_schulz_cubic(m, steps=40))
    assert s.min() > 0.99 and s.max() < 1.01


def test_procrustes_recovers_rotation():
    d = 16
    q, _ = torch.linalg.qr(torch.randn(d, d))  # a true rotation
    x = torch.randn(512, d)
    y = x @ q
    r = procrustes(x, y)
    assert torch.linalg.norm(r - q) < 1e-4


def test_info_nce_is_low_for_aligned_pairs():
    z = torch.randn(32, 64)
    loss_aligned = info_nce(z, z.clone())
    loss_random = info_nce(z, torch.randn(32, 64))
    assert loss_aligned < loss_random


def test_cosine_contrastive_sign():
    a = torch.randn(8, 32)
    pos = cosine_contrastive(a, a.clone(), torch.ones(8))
    assert pos < 1e-5  # identical positives -> ~0 loss


def test_three_tier_surgery_penalizes_only_weak_band():
    s = torch.linspace(10, 1, steps=10)
    out = three_tier_surgery(s, strong_k=2, tail_k=2, lam=0.5)
    assert torch.equal(out[:2], s[:2])      # strong preserved
    assert torch.equal(out[-2:], s[-2:])    # tail protected
    assert torch.all(out[2:-2] < s[2:-2])   # weak band shrunk
