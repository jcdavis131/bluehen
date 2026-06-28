"""Collapse-regime experiment — can ASN prevent dimensional collapse? (research deliverable)

The engine_proof.py gate showed ASN does no *harm* on a robust pretrained backbone, but it
could not test the *benefit* claim because that backbone never collapses. This experiment
builds a controlled setting where the InfoNCE baseline provably DOES collapse, then asks
whether ASN three-tier spectral surgery defends the served representation's effective rank
*without* destroying downstream quality.

Why this setup induces collapse (Jing et al., ICLR 2022, "Understanding Dimensional Collapse
in Contrastive Self-Supervised Learning"): dimensional collapse in contrastive learning is
driven by (1) strong augmentation along feature directions and (2) implicit low-rank bias of
(over-parameterized) linear projectors under weight decay. We reproduce both with a 2-layer
*linear* encoder, strong Gaussian augmentation, and weight decay. No transformer, no network,
runs in seconds on CPU — the right altitude to isolate the mechanism for a whitepaper.

Data: C Gaussian clusters in a k-dim latent space, linearly embedded in R^d_in. Quality is
kNN cluster accuracy on held-out points (collapse destroys cluster separability). The honest
gate: ASN raises served-rep effective rank vs baseline AND does not regress kNN accuracy.

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/collapse_regime.py
Env:  AUG_SIGMA, WEIGHT_DECAY, STEPS, D_SERVE, RANK_FLOOR, SEED
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))

import torch  # noqa: E402
import torch.nn as nn  # noqa: E402
import torch.nn.functional as F  # noqa: E402

from asn_engine.losses import info_nce  # noqa: E402
from asn_engine.spectral import effective_rank, newton_schulz, three_tier_surgery  # noqa: E402

SEED = int(os.getenv("SEED", "0"))
D_IN = 128
K_LATENT = 32
N_CLUSTERS = 8
N_TRAIN = 1024
N_TEST = 512
D_SERVE = int(os.getenv("D_SERVE", "64"))
AUG_SIGMA = float(os.getenv("AUG_SIGMA", "2.0"))     # strong augmentation -> collapse driver
WEIGHT_DECAY = float(os.getenv("WEIGHT_DECAY", "0.05"))  # implicit low-rank bias
STEPS = int(os.getenv("STEPS", "600"))
BATCH = int(os.getenv("BATCH", "128"))   # small batch = few negatives = weak uniformity = collapse-prone
RANK_FLOOR = float(os.getenv("RANK_FLOOR", "20.0"))
LOSS = os.getenv("LOSS", "infonce")   # "infonce" (anti-collapse) or "align" (collapse-prone)


def make_data():
    g = torch.Generator().manual_seed(SEED)
    centers = torch.randn(N_CLUSTERS, K_LATENT, generator=g) * 3.0
    embed = torch.randn(K_LATENT, D_IN, generator=g)  # latent -> ambient (fixed)

    def sample(n):
        labels = torch.randint(0, N_CLUSTERS, (n,), generator=g)
        z = centers[labels] + torch.randn(n, K_LATENT, generator=g)
        return z @ embed, labels

    x_tr, y_tr = sample(N_TRAIN)
    x_te, y_te = sample(N_TEST)
    return x_tr, y_tr, x_te, y_te


class LinearEncoder(nn.Module):
    """2-layer LINEAR encoder (collapse-prone) + a small projector for the contrastive loss.
    serve() returns the deployed representation; the projector is discarded (ASN convention)."""

    def __init__(self) -> None:
        super().__init__()
        self.enc1 = nn.Linear(D_IN, 256, bias=False)
        self.enc2 = nn.Linear(256, D_SERVE, bias=False)   # served-rep producer (surgery target)
        self.proj = nn.Linear(D_SERVE, D_SERVE, bias=False)

    def serve(self, x):
        return self.enc2(self.enc1(x))

    def forward(self, x):
        return self.proj(self.serve(x))


def knn_accuracy(train_z, train_y, test_z, test_y, k=10) -> float:
    train_z = F.normalize(train_z, dim=-1)
    test_z = F.normalize(test_z, dim=-1)
    sims = test_z @ train_z.T
    idx = sims.topk(k, dim=-1).indices
    votes = train_y[idx]
    pred = torch.mode(votes, dim=-1).values
    return float((pred == test_y).float().mean())


def train_arm(asn: bool, x_tr, x_te, y_tr, y_te) -> dict:
    torch.manual_seed(SEED)
    model = LinearEncoder()
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=WEIGHT_DECAY)
    gen = torch.Generator().manual_seed(SEED + 1)
    buf: list[torch.Tensor] = []
    surgeries = 0

    for step in range(STEPS):
        bi = torch.randint(0, x_tr.shape[0], (BATCH,), generator=gen)
        x = x_tr[bi]
        # two strongly-augmented views (the collapse driver)
        v1 = x + AUG_SIGMA * torch.randn(x.shape, generator=gen)
        v2 = x + AUG_SIGMA * torch.randn(x.shape, generator=gen)
        z1, z2 = model(v1), model(v2)
        if LOSS == "align":
            # no-negatives alignment objective (BYOL/SimSiam-style WITHOUT collapse
            # safeguards) -> the canonical dimensional-collapse setting: trivially minimized
            # by mapping everything to one point. This is where anti-collapse must earn its keep.
            loss = ((F.normalize(z1, dim=-1) - F.normalize(z2, dim=-1)) ** 2).sum(-1).mean()
        else:
            loss = info_nce(z1, z2, temperature=0.2)

        opt.zero_grad()
        loss.backward()
        opt.step()

        with torch.no_grad():
            buf.append(model.serve(v1).detach())
            rows = sum(t.shape[0] for t in buf)
            while rows > 512 and len(buf) > 1:
                rows -= buf.pop(0).shape[0]

        if asn and step % 10 == 0 and step > 0:
            with torch.no_grad():
                er = effective_rank(torch.cat(buf, dim=0))
                if er < RANK_FLOOR:
                    w = model.enc2.weight.data            # (D_SERVE, 256)
                    u, s, vh = torch.linalg.svd(w, full_matrices=False)
                    s_adj = three_tier_surgery(s, strong_k=8, tail_k=8, lam=0.5)
                    model.enc2.weight.data = u @ torch.diag(s_adj) @ vh
                    surgeries += 1
                if step % 50 == 0:
                    model.proj.weight.data = newton_schulz(model.proj.weight.data, steps=5)

    model.eval()
    with torch.no_grad():
        z_tr = model.serve(x_tr)
        z_te = model.serve(x_te)
        er = effective_rank(z_te)
        acc = knn_accuracy(z_tr, y_tr, z_te, y_te)
    return {"effectiveRank": er, "knnAcc": acc, "surgeries": surgeries}


def main() -> int:
    x_tr, y_tr, x_te, y_te = make_data()
    # reference: effective rank of the raw inputs (latent dim is 32, ambient 128)
    raw_er = effective_rank(x_te)
    print(f"collapse-regime: d_in={D_IN} k_latent={K_LATENT} clusters={N_CLUSTERS} "
          f"d_serve={D_SERVE} aug_sigma={AUG_SIGMA} wd={WEIGHT_DECAY} steps={STEPS} seed={SEED}")
    print(f"raw input effective rank (eval) = {raw_er:.2f}  (latent dim = {K_LATENT})\n")

    base = train_arm(False, x_tr, x_te, y_tr, y_te)
    asn = train_arm(True, x_tr, x_te, y_tr, y_te)

    print("  arm                  servedEffRank   kNN acc   surgeries")
    print(f"  baseline (InfoNCE)   {base['effectiveRank']:11.3f}   {base['knnAcc']:.3f}     {base['surgeries']}")
    print(f"  ASN (surgery + NS)   {asn['effectiveRank']:11.3f}   {asn['knnAcc']:.3f}     {asn['surgeries']}")

    d_rank = asn["effectiveRank"] - base["effectiveRank"]
    d_acc = asn["knnAcc"] - base["knnAcc"]
    collapsed = base["effectiveRank"] < 0.6 * raw_er    # did the baseline actually collapse?
    rank_ok = d_rank > 0.5
    acc_ok = d_acc >= -0.01

    print(f"\n  baseline collapsed?  {'YES' if collapsed else 'NO'} "
          f"(served {base['effectiveRank']:.1f} vs raw {raw_er:.1f})")
    print(f"  delta served effRank = {d_rank:+.3f}")
    print(f"  delta kNN accuracy   = {d_acc:+.3f}")

    if not collapsed:
        print("\n  INCONCLUSIVE: baseline did not collapse in this config; benefit claim "
              "untested. Tune AUG_SIGMA / WEIGHT_DECAY / STEPS upward.")
        return 2
    if rank_ok and acc_ok:
        print("\n  RESULT: ASN DEFENDS against collapse (higher served rank, no accuracy "
              "regression) -- benefit claim SUPPORTED in this controlled regime.")
        return 0
    print("\n  RESULT: ASN does NOT prevent the collapse here -- benefit claim REJECTED in "
          "this regime. Honest negative; record it.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
