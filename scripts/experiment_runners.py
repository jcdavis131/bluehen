"""Shared experiment runners for tiered / Bayesian search."""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "asn-engine"))
sys.path.insert(0, str(ROOT / "packages" / "eval-harness"))

import torch
import torch.nn as nn
import torch.nn.functional as F

from asn_engine.losses import covariance_regularization, info_nce, variance_regularization
from asn_engine.spectral import effective_rank, three_tier_surgery

D_IN, K_LATENT, N_CLUSTERS = 128, 32, 8
N_TRAIN, N_TEST, D_SERVE = 1024, 512, 64
SIM_COEF = 25.0
PHASE_A_SITES = ("hub", "benchmark-lab", "research-rag", "dumbmodel")


def make_cluster_data(seed: int):
    g = torch.Generator().manual_seed(seed)
    centers = torch.randn(N_CLUSTERS, K_LATENT, generator=g) * 3.0
    embed = torch.randn(K_LATENT, D_IN, generator=g)

    def sample(n: int):
        labels = torch.randint(0, N_CLUSTERS, (n,), generator=g)
        z = centers[labels] + torch.randn(n, K_LATENT, generator=g)
        return z @ embed, labels

    return sample(N_TRAIN), sample(N_TEST)


class LinearEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.enc1 = nn.Linear(D_IN, 256, bias=False)
        self.enc2 = nn.Linear(256, D_SERVE, bias=False)
        self.proj = nn.Linear(D_SERVE, D_SERVE, bias=False)

    def serve(self, x):
        return self.enc2(self.enc1(x))

    def forward(self, x):
        return self.proj(self.serve(x))


def knn_acc(tr_z, tr_y, te_z, te_y, k=10) -> float:
    tr_z, te_z = F.normalize(tr_z, dim=-1), F.normalize(te_z, dim=-1)
    idx = (te_z @ tr_z.T).topk(k, dim=-1).indices
    pred = torch.mode(tr_y[idx], dim=-1).values
    return float((pred == te_y).float().mean())


def run_invariance_vicreg(
    *,
    seed: int,
    var_coef: float,
    cov_coef: float,
    steps: int = 400,
    aug_sigma: float = 1.0,
    batch: int = 256,
) -> dict:
    torch.manual_seed(seed)
    (x_tr, y_tr), (x_te, y_te) = make_cluster_data(seed)
    model = LinearEncoder()
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
    gen = torch.Generator().manual_seed(seed + 1)
    use_vicreg = var_coef > 0 or cov_coef > 0
    for _ in range(steps):
        bi = torch.randint(0, x_tr.shape[0], (batch,), generator=gen)
        x = x_tr[bi]
        z1 = model(x + aug_sigma * torch.randn(x.shape, generator=gen))
        z2 = model(x + aug_sigma * torch.randn(x.shape, generator=gen))
        inv = ((z1 - z2) ** 2).sum(-1).mean()
        if use_vicreg:
            loss = SIM_COEF * inv
            if var_coef > 0:
                loss = loss + var_coef * (variance_regularization(z1) + variance_regularization(z2))
            if cov_coef > 0:
                loss = loss + cov_coef * (covariance_regularization(z1) + covariance_regularization(z2))
        else:
            loss = inv
        opt.zero_grad()
        loss.backward()
        opt.step()
    model.eval()
    with torch.no_grad():
        er = float(effective_rank(model.serve(x_te)))
        acc = knn_acc(model.serve(x_tr), y_tr, model.serve(x_te), y_te)
    baseline_er = float(effective_rank(make_cluster_data(seed + 9999)[1][0]))
    return {
        "servedEffRank": er,
        "knnAcc": acc,
        "baselineEffRank": baseline_er,
        "rankLift": er - 12.0,
    }


def run_infonce_surgery(
    *,
    seed: int,
    asn_lambda: float,
    surgery_every: int = 20,
    k_strong: int = 4,
    k_tail: int = 4,
    steps: int = 400,
    aug_sigma: float = 2.0,
    batch: int = 128,
) -> dict:
    torch.manual_seed(seed)

    def _train(use_surgery: bool) -> tuple[float, float, int]:
        (x_tr, y_tr), (x_te, y_te) = make_cluster_data(seed)
        model = LinearEncoder()
        opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.05)
        gen = torch.Generator().manual_seed(seed + 7)
        surgeries = 0
        for step in range(steps):
            bi = torch.randint(0, x_tr.shape[0], (batch,), generator=gen)
            x = x_tr[bi]
            z1 = model(x + aug_sigma * torch.randn(x.shape, generator=gen))
            z2 = model(x + aug_sigma * torch.randn(x.shape, generator=gen))
            loss = info_nce(z1, z2, temperature=0.07)
            opt.zero_grad()
            loss.backward()
            opt.step()
            if use_surgery and asn_lambda > 0 and step > 0 and step % surgery_every == 0:
                with torch.no_grad():
                    for p in model.parameters():
                        if p.dim() == 2:
                            u, s, vh = torch.linalg.svd(p, full_matrices=False)
                            s_adj = three_tier_surgery(
                                s,
                                strong_k=k_strong,
                                tail_k=k_tail,
                                lam=asn_lambda,
                            )
                            p.copy_(u @ torch.diag(s_adj) @ vh)
                            surgeries += 1
        model.eval()
        with torch.no_grad():
            er = float(effective_rank(model.serve(x_te)))
            acc = knn_acc(model.serve(x_tr), y_tr, model.serve(x_te), y_te)
        return er, acc, surgeries

    base_er, base_acc, _ = _train(use_surgery=False)
    surg_er, surg_acc, surgeries = _train(use_surgery=True)
    return {
        "baseEffRank": base_er,
        "servedEffRank": surg_er,
        "rankDelta": surg_er - base_er,
        "knnAcc": surg_acc,
        "baseKnnAcc": base_acc,
        "surgeries": surgeries,
    }


def synth_pairs(corpus_path: Path, n: int, seed: int) -> list[dict]:
    docs: list[dict] = []
    with corpus_path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                docs.append(json.loads(line))
    rng = random.Random(seed)
    pairs: list[dict] = []
    for _ in range(n):
        i = rng.randint(0, len(docs) - 1)
        j = i if rng.random() < 0.5 else min(i + 1, len(docs) - 1)
        neg = rng.randint(0, len(docs) - 1)
        while neg == i:
            neg = rng.randint(0, len(docs) - 1)
        a, b, c = docs[i], docs[j], docs[neg]
        pairs.append(
            {
                "anchor": f"{a.get('title', '')}. {a.get('text', '')}",
                "positive": f"{b.get('title', '')}. {b.get('text', '')}",
                "negative": f"{c.get('title', '')}. {c.get('text', '')}",
            }
        )
    return pairs


def run_tenant_recipe(
    *,
    site_id: str,
    seed: int,
    vicreg_var: float,
    vicreg_cov: float,
    info_nce_temp: float,
    epochs: int,
    lr: float,
    pairs_n: int = 64,
) -> dict:
    from asn_engine.train_loop import train_asn_with_seed
    from eval_harness.runner import evaluate_checkpoint

    corpus = ROOT / "data" / "corpora" / site_id / "corpus.jsonl"
    if not corpus.exists():
        return {"error": f"no corpus for {site_id}", "ndcg10": 0.0, "evalEffectiveRank": 0.0}

    random.seed(seed)
    pairs = synth_pairs(corpus, pairs_n, seed)
    loss: dict = {"infoNceTemp": info_nce_temp}
    if vicreg_var > 0:
        loss["vicregVar"] = vicreg_var
    if vicreg_cov > 0:
        loss["vicregCov"] = vicreg_cov
    recipe = {
        "baseModel": "sentence-transformers/all-MiniLM-L6-v2",
        "epochs": epochs,
        "batchSize": 8,
        "lr": lr,
        "loss": loss,
        "asn": {"enabled": False},
    }
    out_dir = ROOT / "data" / "evidence" / "bayesian" / site_id
    out_dir.mkdir(parents=True, exist_ok=True)
    train_out = train_asn_with_seed(pairs, recipe, out_dir / f"t{seed}", seed=seed)
    eval_out = evaluate_checkpoint(Path(train_out.checkpoint_path), pairs)
    return {
        "siteId": site_id,
        "ndcg10": eval_out["ndcg10"],
        "evalEffectiveRank": eval_out["effectiveRank"],
        "finalLoss": train_out.final_loss,
    }
