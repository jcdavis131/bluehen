"""Tests for sleep-inspired consolidation operators. CPU-only, seeded, fast."""

import torch
from torch import nn

from asn_engine.sleep import magnitude_prune, sleep_phase, synaptic_downscale
from asn_engine.spectral import effective_rank


def test_synaptic_downscale_preserves_spectrum_shape():
    """SHY downscaling shrinks scale but leaves the spectrum *shape* (effective rank) intact."""
    torch.manual_seed(0)
    w = torch.randn(32, 48)
    out = synaptic_downscale(w, 0.5)
    assert torch.allclose(out, w * 0.5)
    # effective rank is scale-invariant -> downscaling must not change it (collapse-neutral)
    assert abs(effective_rank(out) - effective_rank(w)) < 1e-4


def test_magnitude_prune_removes_weakest():
    w = torch.tensor([[0.1, -2.0], [3.0, -0.05]])
    pruned = magnitude_prune(w, 0.5)  # zero the smallest 50% by |w|
    assert pruned[0, 0] == 0.0 and pruned[1, 1] == 0.0   # the two smallest gone
    assert pruned[0, 1] == -2.0 and pruned[1, 0] == 3.0  # the two largest kept
    assert torch.equal(magnitude_prune(w, 0.0), w)       # frac=0 is a no-op


def test_sleep_phase_applies_inplace_to_2d_weights():
    torch.manual_seed(0)
    lin = nn.Linear(16, 8, bias=True)
    before_bias = lin.bias.data.clone()
    norm_before = lin.weight.data.norm().item()
    sleep_phase(lin, downscale=0.5, prune_frac=0.25)
    assert lin.weight.data.norm().item() < norm_before     # downscaled (+ some pruned)
    assert (lin.weight.data == 0).any()                     # pruning created zeros
    assert torch.equal(lin.bias.data, before_bias)          # 1-D params untouched
