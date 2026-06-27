"""Projection head: used during pretraining, discarded for serving.

Acts as an information bottleneck between the encoder and the contrastive objective.
NOTE: the specific information-theoretic bounds in the whitepaper are marked VERIFY in
SCIENCE_REVIEW.md §2 and are NOT yet load-bearing here.
"""

from __future__ import annotations

import torch
from torch import Tensor, nn


class ProjectionHead(nn.Module):
    """MLP projection head with optional output discretization.

    Discretization (snap to a learned codebook) lowers projector entropy H(Z2), the
    bottleneck lever discussed in the source material. Off by default until the bounds
    are verified.
    """

    def __init__(
        self,
        in_dim: int,
        hidden_dim: int = 2048,
        out_dim: int = 256,
        discretize: bool = False,
        codebook_size: int = 1024,
    ) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.Linear(hidden_dim, out_dim),
        )
        self.discretize = discretize
        if discretize:
            self.codebook = nn.Parameter(torch.randn(codebook_size, out_dim))

    def forward(self, x: Tensor) -> Tensor:
        z = self.net(x)
        if self.discretize:
            # nearest-codeword snap with straight-through gradient
            d = torch.cdist(z, self.codebook)
            idx = d.argmin(dim=-1)
            q = self.codebook[idx]
            z = z + (q - z).detach()
        return z
