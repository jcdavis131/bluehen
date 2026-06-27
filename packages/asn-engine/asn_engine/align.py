"""Orthogonal Procrustes alignment (Schönemann 1966)."""

from __future__ import annotations

import torch
from torch import Tensor


def procrustes(x: Tensor, y: Tensor) -> Tensor:
    """Solve  min_R ||X R - Y||_F  s.t.  R^T R = I.

    Closed form via SVD of X^T Y = U S V^T  ->  R = U V^T.
    Used to remap a legacy embedding space onto a newly trained one without re-indexing.
    """
    m = x.T @ y
    u, _, vh = torch.linalg.svd(m, full_matrices=False)
    return u @ vh
