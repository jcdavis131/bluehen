"""Contrastive losses."""

from __future__ import annotations

import torch
import torch.nn.functional as F
from torch import Tensor


def info_nce(z_a: Tensor, z_b: Tensor, temperature: float = 0.07) -> Tensor:
    """Symmetric InfoNCE over a batch of paired views (van den Oord 2018; SimCLR).

    z_a, z_b: (batch, dim). Positives are matched indices; negatives are all other items
    in the batch. Returns the mean of both directions.
    """
    z_a = F.normalize(z_a, dim=-1)
    z_b = F.normalize(z_b, dim=-1)
    logits = (z_a @ z_b.T) / temperature
    targets = torch.arange(z_a.shape[0], device=z_a.device)
    return 0.5 * (F.cross_entropy(logits, targets) + F.cross_entropy(logits.T, targets))


def cosine_contrastive(
    anchor: Tensor, other: Tensor, label: Tensor, margin: float = 0.2
) -> Tensor:
    """Cosine contrastive loss (Source 2 form).

    label = +1 for positive pairs, -1 for negative pairs.
      positives: (1 - cos)            -> pulls together
      negatives: max(0, cos - margin) -> pushes apart beyond the margin
    """
    cos = F.cosine_similarity(anchor, other, dim=-1)
    pos = (label > 0).float() * (1.0 - cos)
    neg = (label < 0).float() * torch.clamp(cos - margin, min=0.0)
    return (pos + neg).mean()


def variance_regularization(z: Tensor, gamma: float = 1.0, eps: float = 1e-4) -> Tensor:
    """VICReg variance term (Bardes et al. 2022) — a loss-space rank floor.

    Hinges each embedding dimension's per-batch standard deviation up to ``gamma``. A
    collapsed (or low-rank) representation has dimensions with ~zero variance, which this
    penalizes directly — pushing every dimension to stay 'alive', which raises effective
    rank. This is the anti-collapse mechanism EVIDENCE.md §3.2/§3.3 showed weight-space
    surgery cannot provide: it acts on the loss, so gradient descent cannot undo it between
    steps. ``z`` is (batch, dim); needs batch > 1.
    """
    std = torch.sqrt(z.var(dim=0) + eps)
    return torch.mean(F.relu(gamma - std))


def covariance_regularization(z: Tensor) -> Tensor:
    """VICReg covariance term — decorrelate embedding dimensions.

    Penalizes the squared off-diagonal covariances of the batch, spreading information
    across dimensions (rather than letting it concentrate in a few), complementing the
    variance floor. ``z`` is (batch, dim); needs batch > 1.
    """
    n, d = z.shape
    zc = z - z.mean(dim=0)
    cov = (zc.T @ zc) / max(n - 1, 1)
    off_diag = cov - torch.diag(torch.diag(cov))
    return (off_diag**2).sum() / d
