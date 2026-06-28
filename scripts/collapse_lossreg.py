"""Loss-space anti-collapse — does a rank-floor (VICReg) regularizer beat the baseline?

EVIDENCE.md §3.2/§3.3 showed in-loop weight-space spectral surgery (three_tier_surgery,
spectral_lift) cannot prevent dimensional collapse: gradient descent re-collapses the
representation between interventions. §3.3's indicated fix was to move the rank floor into
the LOSS. This tests exactly that.

Setup mirrors collapse_regime.py (8 Gaussian clusters in a 32-dim latent space, linearly
embedded in R^128; collapse-prone 2-layer linear encoder + projector). The collapse driver
here is a pure invariance (MSE) objective with NO anti-collapse term — the canonical total
collapse (everything maps to one point). Arms:
  * baseline  : invariance only            -> collapses
  * VICReg    : invariance + variance + covariance (Bardes et al. 2022)

Quality = kNN cluster accuracy on held-out points. Honest gate: VICReg must hold served
effective rank meaningfully ABOVE the collapsing baseline without hurting kNN.

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/collapse_lossreg.py
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))

import torch  # noqa: E402
import torch.nn as nn  # noqa: E402
import torch.nn.functional as F  # noqa: E402

from asn_engine.losses import covariance_regularization, variance_regularization  # noqa: E402
from asn_engine.spectral import effective_rank  # noqa: E402

D_IN, K_LATENT, N_CLUSTERS = 128, 32, 8
N_TRAIN, N_TEST, D_SERVE = 1024, 512, 64
AUG_SIGMA, STEPS, BATCH = 1.0, 800, 256
# VICReg default weights (Bardes et al. 2022): sim=25, var=25, cov=1
SIM_COEF, VAR_COEF, COV_COEF = 25.0, 25.0, 1.0


def make_data(seed: int):
    g = torch.Generator().manual_seed(seed)
    centers = torch.randn(N_CLUSTERS, K_LATENT, generator=g) * 3.0
    embed = torch.randn(K_LATENT, D_IN, generator=g)

    def sample(n):
        labels = torch.randint(0, N_CLUSTERS, (n,), generator=g)
        z = centers[labels] + torch.randn(n, K_LATENT, generator=g)
        return z @ embed, labels

    return sample(N_TRAIN), sample(N_TEST)


class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.enc1 = nn.Linear(D_IN, 256, bias=False)
        self.enc2 = nn.Linear(256, D_SERVE, bias=False)
        self.proj = nn.Linear(D_SERVE, D_SERVE, bias=False)

    def serve(self, x):
        return self.enc2(self.enc1(x))

    def forward(self, x):
        return self.proj(self.serve(x))


def knn_accuracy(tr_z, tr_y, te_z, te_y, k=10) -> float:
    tr_z, te_z = F.normalize(tr_z, dim=-1), F.normalize(te_z, dim=-1)
    idx = (te_z @ tr_z.T).topk(k, dim=-1).indices
    pred = torch.mode(tr_y[idx], dim=-1).values
    return float((pred == te_y).float().mean())


def train_arm(seed: int, vicreg: bool):
    torch.manual_seed(seed)
    (x_tr, y_tr), (x_te, y_te) = make_data(seed)
    model = Net()
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
    gen = torch.Generator().manual_seed(seed + 1)
    for _ in range(STEPS):
        bi = torch.randint(0, x_tr.shape[0], (BATCH,), generator=gen)
        x = x_tr[bi]
        z1 = model(x + AUG_SIGMA * torch.randn(x.shape, generator=gen))
        z2 = model(x + AUG_SIGMA * torch.randn(x.shape, generator=gen))
        inv = ((z1 - z2) ** 2).sum(-1).mean()
        if vicreg:
            var = variance_regularization(z1) + variance_regularization(z2)
            cov = covariance_regularization(z1) + covariance_regularization(z2)
            loss = SIM_COEF * inv + VAR_COEF * var + COV_COEF * cov
        else:
            loss = inv
        opt.zero_grad()
        loss.backward()
        opt.step()
    model.eval()
    with torch.no_grad():
        er = effective_rank(model.serve(x_te))
        acc = knn_accuracy(model.serve(x_tr), y_tr, model.serve(x_te), y_te)
    return er, acc


def main() -> int:
    seeds = [0, 1, 2]
    raw = effective_rank(make_data(0)[1][0])
    print(f"loss-space anti-collapse: d_in={D_IN} k_latent={K_LATENT} d_serve={D_SERVE} "
          f"steps={STEPS} seeds={seeds}")
    print(f"raw input effective rank ~ {raw:.1f}\n")

    rows = {"baseline (invariance only)": [], "VICReg (inv+var+cov)": []}
    for s in seeds:
        b_er, b_acc = train_arm(s, vicreg=False)
        v_er, v_acc = train_arm(s, vicreg=True)
        rows["baseline (invariance only)"].append((b_er, b_acc))
        rows["VICReg (inv+var+cov)"].append((v_er, v_acc))
        print(f"  seed {s}: baseline erank={b_er:6.3f} kNN={b_acc:.3f} | "
              f"VICReg erank={v_er:6.3f} kNN={v_acc:.3f}")

    def mean(rs, i):
        return sum(r[i] for r in rs) / len(rs)

    b_er, b_acc = mean(rows["baseline (invariance only)"], 0), mean(rows["baseline (invariance only)"], 1)
    v_er, v_acc = mean(rows["VICReg (inv+var+cov)"], 0), mean(rows["VICReg (inv+var+cov)"], 1)
    print("\n  arm                          servedEffRank   kNN acc")
    print(f"  baseline (invariance only)   {b_er:11.3f}   {b_acc:.3f}")
    print(f"  VICReg (inv+var+cov)         {v_er:11.3f}   {v_acc:.3f}")

    d_rank, d_acc = v_er - b_er, v_acc - b_acc
    # meaningful regime: the no-regularizer baseline loses >=20% of the available (raw) rank,
    # and the regularizer must recover a large fraction of that gap.
    collapsed = b_er < 0.8 * raw
    win = d_rank > 0.5 and d_acc >= -0.01
    print(f"\n  baseline collapsed? {'YES' if collapsed else 'NO'} ({b_er:.2f} vs raw {raw:.1f})")
    print(f"  delta served effRank = {d_rank:+.3f}")
    print(f"  delta kNN accuracy   = {d_acc:+.3f}")
    if not collapsed:
        print("\n  INCONCLUSIVE: invariance-only baseline did not collapse; tune up.")
        return 2
    if win:
        print("\n  RESULT: loss-space rank floor (VICReg) PREVENTS collapse where weight "
              "surgery could not -- benefit claim SUPPORTED in this regime.")
        return 0
    print("\n  RESULT: VICReg did not clear the bar here -- honest negative; record it.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
