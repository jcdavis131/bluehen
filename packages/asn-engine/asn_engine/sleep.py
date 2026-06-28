"""Sleep-inspired consolidation operators (the 'Sleep' in AwakenedSleepNet).

BIO-INSPIRED, NOT BIO-EQUIVALENT. These are engineering heuristics loosely motivated by the
Synaptic Homeostasis Hypothesis (Tononi & Cirelli) and sleep-dependent synaptic pruning /
replay. SCIENCE_REVIEW.md §2 is normative: we say "inspired by," never "equivalent," and every
mechanism earns its place by a measured result in EVIDENCE.md — not by the analogy.

The anti-collapse work (EVIDENCE §3.2–§3.4) established that the rank floor must live in the
LOSS (VICReg), not in weight-space surgery. These operators are *complements* to that loss,
applied during a periodic "sleep" phase, not replacements for it.
"""

from __future__ import annotations

import torch
from torch import Tensor, nn


def synaptic_downscale(weight: Tensor, factor: float) -> Tensor:
    """SHY-inspired global downscaling: multiply weights by ``factor`` (0<factor<=1).

    Sleep is hypothesized to renormalize synaptic strength downward while *preserving relative
    differences* (signal-to-noise improves, saturation is relieved). A scalar multiply does
    exactly that — it leaves every pairwise ratio, and the matrix's singular-value *spectrum
    shape* (hence effective rank), unchanged; only the overall scale shrinks. This is why
    downscaling is collapse-neutral, unlike the weak-band shrink of three_tier_surgery.
    """
    if not 0.0 < factor <= 1.0:
        raise ValueError(f"factor must be in (0, 1], got {factor}")
    return weight * factor


def magnitude_prune(weight: Tensor, frac: float) -> Tensor:
    """Dream-inspired pruning: zero the smallest-|w| fraction of synapses.

    Removes the weakest ``frac`` of connections by absolute value (unstructured magnitude
    pruning), the standard analogue of sleep-dependent elimination of weak/spurious synapses.
    ``frac=0`` is a no-op; ``frac=1`` zeros everything.
    """
    if not 0.0 <= frac < 1.0:
        raise ValueError(f"frac must be in [0, 1), got {frac}")
    if frac == 0.0:
        return weight.clone()
    k = int(frac * weight.numel())
    if k == 0:
        return weight.clone()
    thresh = weight.abs().flatten().kthvalue(k).values
    return torch.where(weight.abs() > thresh, weight, torch.zeros_like(weight))


@torch.no_grad()
def sleep_phase(
    module: nn.Module,
    *,
    downscale: float = 1.0,
    prune_frac: float = 0.0,
) -> None:
    """Apply one 'night' of homeostatic maintenance to every 2-D weight in ``module``.

    Downscaling first (SHY renormalization), then pruning (synaptic elimination). Both are
    spectrum-shape-preserving or sparsifying — neither shrinks a singular band, so neither
    induces collapse on its own. Pair with a VICReg rank floor in the loss for the actual
    anti-collapse force (EVIDENCE §3.4). Operates in-place.
    """
    for p in module.parameters():
        if p.ndim == 2:
            w = p.data
            if downscale != 1.0:
                w = synaptic_downscale(w, downscale)
            if prune_frac > 0.0:
                w = magnitude_prune(w, prune_frac)
            p.data = w
