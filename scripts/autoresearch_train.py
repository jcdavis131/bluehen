"""Autoresearch train — THE ONLY FILE AGENTS EDIT.

Wave 2 TPE champion (bayes0.jsonl score=1.4697, seeds 0+1 mean):
  method=barlow  depth=1 (single Linear 128→64)  act=linear  norm=none
  batch=64  lr≈0.002  barlow_lambda≈0.0215
  knn_full≈0.864  knn_t8≈0.35  knn_int8≈0.863  robust_score≈1.470

Note: SWEEP table "width=256 gelu" rows used depth≥2 in bayes_search.build_net;
TPE best cluster is depth=1 linear (width param unused at depth=1).

Edit ONLY this file → uv run python scripts/autoresearch_run.py [cursor|claude]
DISCARD auto-reverts to data/autoresearch/champion_train.py
"""

from __future__ import annotations

import time

import torch
import torch.nn as nn

D_IN = 128
D_SERVE = 64
BATCH = 64
LR = 2.0e-3
WEIGHT_DECAY = 1e-4
AUG = 1.0
BARLOW_LAMBDA = 0.022


class Net(nn.Module):
    """TPE depth=1: one linear encoder + linear projector (matches bayes_search.build_net)."""

    def __init__(self):
        super().__init__()
        self.enc = nn.Linear(D_IN, D_SERVE, bias=False)
        self.proj = nn.Linear(D_SERVE, D_SERVE, bias=False)

    def serve(self, x: torch.Tensor) -> torch.Tensor:
        return self.enc(x)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.proj(self.serve(x))


def barlow_twins(z1: torch.Tensor, z2: torch.Tensor, lmbda: float) -> torch.Tensor:
    n = z1.shape[0]
    z1 = (z1 - z1.mean(0)) / (z1.std(0) + 1e-5)
    z2 = (z2 - z2.mean(0)) / (z2.std(0) + 1e-5)
    c = (z1.T @ z2) / n
    on = (torch.diagonal(c) - 1).pow(2).sum()
    off = (c - torch.diag(torch.diagonal(c))).pow(2).sum()
    return on + lmbda * off


def train_loop(
    model: nn.Module,
    *,
    x_tr: torch.Tensor,
    g: torch.Generator,
    budget_sec: float,
    train_steps: int = 0,
) -> None:
    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    t0 = time.time()
    step = 0
    while True:
        if train_steps > 0 and step >= train_steps:
            break
        if train_steps <= 0 and time.time() - t0 >= budget_sec:
            break
        bi = torch.randint(0, x_tr.shape[0], (BATCH,), generator=g)
        x = x_tr[bi]
        z1 = model(x + AUG * torch.randn(x.shape, generator=g))
        z2 = model(x + AUG * torch.randn(x.shape, generator=g))
        loss = barlow_twins(z1, z2, BARLOW_LAMBDA)
        opt.zero_grad()
        loss.backward()
        opt.step()
        step += 1


def build_and_train(budget_sec: float, train_steps: int = 0) -> nn.Module:
    from autoresearch_prepare import make_data  # noqa: WPS433

    torch.manual_seed(0)
    (x_tr, y_tr), (_, _), g = make_data(0, "med")
    _ = y_tr
    model = Net()
    train_loop(model, x_tr=x_tr, g=g, budget_sec=budget_sec, train_steps=train_steps)
    return model
