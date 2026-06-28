"""Wave 2 — Bayesian (TPE) search over architectures x methods x hyperparameters.

Wave 1 (scripts/sweep.py) was a brute-force grid that mapped regimes. Wave 2 dials in the
research: an Optuna TPE search that adaptively proposes recipes, optimizing a ROBUSTNESS-
WEIGHTED objective (full kNN + truncation kNN + int8 kNN) — i.e. it hunts for embeddings that
are both accurate AND cheap to serve at the edge (the product thesis from EVIDENCE §3.6).

Search space:
  method  : infonce | vicreg | barlow | dino | mrl | rankfloor   (variety of anti-collapse /
            decorrelation / multi-scale approaches)
  arch    : depth {1,2,3} x width {128,256,512} x act {linear,relu,gelu} x norm {none,bn,ln}
            x projector expander {none, vicreg-style MLP+BN}
  optim   : batch {16,64,256}, lr loguniform(1e-4,5e-3)
  + method-specific coefficients (conditional).

Each trial trains on the discriminative synthetic task (sweep.make_data) over 2 seeds and is
scored by mean robust-quality. Every trial is logged as JSONL so wave 1 + wave 2 aggregate
together. Each worker runs an independent in-memory TPE study (own sampler seed) to avoid
cross-process DB locking; combined they cover the space well.

CLI:
  python scripts/bayes_search.py --trials 75 --worker 0 --out data/sweeps/bayes0.jsonl
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))

import torch  # noqa: E402
import torch.nn as nn  # noqa: E402
import torch.nn.functional as F  # noqa: E402

torch.set_num_threads(int(os.getenv("SWEEP_THREADS", "2")))

import optuna  # noqa: E402

from asn_engine.losses import covariance_regularization, info_nce, variance_regularization  # noqa: E402
from asn_engine.spectral import effective_rank  # noqa: E402
from sweep import D_IN, D_SERVE, int8_quant, knn_acc, make_data  # noqa: E402

optuna.logging.set_verbosity(optuna.logging.WARNING)
ACTS = {"linear": nn.Identity, "relu": nn.ReLU, "gelu": nn.GELU}


def build_net(p: dict) -> nn.Module:
    depth, width, act, norm, expander = p["depth"], p["width"], p["act"], p["norm"], p["expander"]
    layers, dim = [], D_IN
    for i in range(depth):
        out = width if i < depth - 1 else D_SERVE
        layers.append(nn.Linear(dim, out, bias=(norm != "bn")))
        if i < depth - 1:
            if norm == "bn":
                layers.append(nn.BatchNorm1d(out))
            elif norm == "ln":
                layers.append(nn.LayerNorm(out))
            if act != "linear":
                layers.append(ACTS[act]())
        dim = out
    enc = nn.Sequential(*layers)
    if expander == "mlp_bn":
        proj = nn.Sequential(nn.Linear(D_SERVE, 2 * D_SERVE, bias=False), nn.BatchNorm1d(2 * D_SERVE),
                             nn.ReLU(), nn.Linear(2 * D_SERVE, D_SERVE, bias=False))
    else:
        proj = nn.Linear(D_SERVE, D_SERVE, bias=False)

    class Net(nn.Module):
        def __init__(s):
            super().__init__()
            s.enc, s.proj = enc, proj

        def serve(s, x):
            return s.enc(x)

        def forward(s, x):
            return s.proj(s.enc(x))

    return Net()


def soft_effective_rank(z: torch.Tensor) -> torch.Tensor:
    z = z - z.mean(0)
    cov = (z.T @ z) / max(z.shape[0] - 1, 1)
    ev = torch.linalg.eigvalsh(cov).clamp(min=1e-8)
    pp = ev / ev.sum()
    return torch.exp(-(pp * pp.log()).sum())


def barlow_twins(z1, z2, lmbda):
    n = z1.shape[0]
    z1 = (z1 - z1.mean(0)) / (z1.std(0) + 1e-5)
    z2 = (z2 - z2.mean(0)) / (z2.std(0) + 1e-5)
    c = (z1.T @ z2) / n
    on = (torch.diagonal(c) - 1).pow(2).sum()
    off = (c - torch.diag(torch.diagonal(c))).pow(2).sum()
    return on + lmbda * off


def train_eval(p: dict, seed: int) -> dict:
    torch.manual_seed(seed)
    (x_tr, y_tr), (x_te, y_te), g = make_data(seed, "med")
    model = build_net(p)
    opt = torch.optim.AdamW(model.parameters(), lr=p["lr"])
    method, batch, steps, aug = p["method"], p["batch"], p.get("steps", 300), 1.0
    center = torch.zeros(D_SERVE)
    for _ in range(steps):
        bi = torch.randint(0, x_tr.shape[0], (batch,), generator=g)
        x = x_tr[bi]
        z1 = model(x + aug * torch.randn(x.shape, generator=g))
        z2 = model(x + aug * torch.randn(x.shape, generator=g))
        if method == "infonce":
            loss = info_nce(z1, z2, temperature=p["temp"])
        elif method == "vicreg":
            loss = 25.0 * ((z1 - z2) ** 2).sum(-1).mean() \
                + p["vv"] * (variance_regularization(z1) + variance_regularization(z2)) \
                + p["vc"] * (covariance_regularization(z1) + covariance_regularization(z2))
        elif method == "barlow":
            loss = barlow_twins(z1, z2, p["barlow_lambda"])
        elif method == "dino":
            tpt, tps, m = 0.04, p["temp"], 0.9
            t1 = F.softmax((z2.detach() - center) / tpt, dim=-1)
            t2 = F.softmax((z1.detach() - center) / tpt, dim=-1)
            loss = 0.5 * (-(t1 * F.log_softmax(z1 / tps, -1)).sum(-1).mean()
                          - (t2 * F.log_softmax(z2 / tps, -1)).sum(-1).mean())
            center = m * center + (1 - m) * torch.cat([z1, z2]).mean(0).detach()
        elif method == "mrl":  # Matryoshka: InfoNCE summed over nested prefixes
            loss = sum(info_nce(z1[:, :d], z2[:, :d], temperature=p["temp"]) for d in (D_SERVE, 32, 16, 8))
        elif method == "rankfloor":  # InfoNCE + differentiable effective-rank maximization
            loss = info_nce(z1, z2, temperature=p["temp"]) - p["rf"] * soft_effective_rank(torch.cat([z1, z2]))
        else:
            raise ValueError(method)
        opt.zero_grad()
        loss.backward()
        opt.step()
    model.eval()
    with torch.no_grad():
        Ztr, Zte = model.serve(x_tr), model.serve(x_te)
        kf = knn_acc(Ztr, y_tr, Zte, y_te)
        k8 = knn_acc(Ztr[:, :8], y_tr, Zte[:, :8], y_te)
        ki = knn_acc(int8_quant(Ztr), y_tr, int8_quant(Zte), y_te)
        er = effective_rank(Zte)
    return {"knn_full": kf, "knn_t8": k8, "knn_int8": ki, "served_rank": er}


def suggest(trial) -> dict:
    method = trial.suggest_categorical("method", ["infonce", "vicreg", "barlow", "dino", "mrl", "rankfloor"])
    p = {
        "family": "bayes", "method": method,
        "depth": trial.suggest_int("depth", 1, 3),
        "width": trial.suggest_categorical("width", [128, 256, 512]),
        "act": trial.suggest_categorical("act", ["linear", "relu", "gelu"]),
        "norm": trial.suggest_categorical("norm", ["none", "bn", "ln"]),
        "expander": trial.suggest_categorical("expander", ["none", "mlp_bn"]),
        "batch": trial.suggest_categorical("batch", [16, 64, 256]),
        "lr": trial.suggest_float("lr", 1e-4, 5e-3, log=True),
        "temp": trial.suggest_float("temp", 0.03, 0.3, log=True),
    }
    if method == "vicreg":
        p["vv"] = trial.suggest_float("vv", 0.0, 25.0)
        p["vc"] = trial.suggest_float("vc", 0.0, 1.0)
    if method == "barlow":
        p["barlow_lambda"] = trial.suggest_float("barlow_lambda", 1e-3, 1e-1, log=True)
    if method == "rankfloor":
        p["rf"] = trial.suggest_float("rf", 0.0, 2.0)
    return p


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=75)
    ap.add_argument("--worker", type=int, default=0)
    ap.add_argument("--steps", type=int, default=300)
    ap.add_argument("--out", type=Path, default=REPO / "data" / "sweeps" / "bayes0.jsonl")
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    fh = args.out.open("w")
    n_done = [0]

    def objective(trial):
        p = suggest(trial)
        p["steps"] = args.steps
        t0 = time.time()
        seeds = [0, 1]
        ms = [train_eval(p, s) for s in seeds]
        agg = {k: round(sum(m[k] for m in ms) / len(ms), 4) for k in ms[0]}
        # robustness-weighted objective: quality + cheap-serving robustness
        score = agg["knn_full"] + 0.5 * agg["knn_t8"] + 0.5 * agg["knn_int8"]
        row = {**{k: p[k] for k in p if k != "steps"}, **agg,
               "score": round(score, 4), "secs": round(time.time() - t0, 2)}
        fh.write(json.dumps(row) + "\n")
        fh.flush()
        n_done[0] += 1
        if n_done[0] % 10 == 0:
            print(f"  worker{args.worker} [{n_done[0]}/{args.trials}] best={trial.study.best_value:.3f} "
                  f"last={p['method']} score={score:.3f}", flush=True)
        return score

    sampler = optuna.samplers.TPESampler(seed=1000 + args.worker, n_startup_trials=15)
    study = optuna.create_study(direction="maximize", sampler=sampler)
    print(f"worker {args.worker}: {args.trials} TPE trials -> {args.out}", flush=True)
    study.optimize(objective, n_trials=args.trials)
    fh.close()
    bp = study.best_params
    print(f"done worker {args.worker}: best score {study.best_value:.4f} method={bp.get('method')}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
