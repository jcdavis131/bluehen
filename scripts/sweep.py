"""Sweep harness — parametrized embedding experiments for the ASN research program.

Runs hundreds of fast synthetic experiments (and a smaller real-text family) over a config
grid, logging one JSON line per run. Families map to hypotheses (see SWEEP_REPORT / EVIDENCE):
  A  regime map        : when does VICReg beat the base objective? (objective x batch x vicreg)
  B  matryoshka/int8   : does covariance decorrelation aid truncation + int8 robustness?
  D  anisotropy        : does the covariance (whitening) term help retrieval w/o collapse?
  C  domain/forgetting : real-text (MiniLM) in-domain gain vs out-of-domain forgetting

Design notes:
- Synthetic task is tuned so kNN is *discriminative* (16 closish clusters), unlike the earlier
  well-separated testbed where kNN saturated at 1.0. This lets truncation/quant/collapse show.
- Anti-collapse / regularization is loss-space VICReg (EVIDENCE §3.4); weight surgery and sleep
  were rejected (§3.2/§3.3/§3.5) so they are not swept here.

CLI:
  python scripts/sweep.py --family A --shard 0:6 --out data/sweeps/A_0.jsonl [--steps 400]
  python scripts/sweep.py --aggregate data/sweeps --report SWEEP_REPORT.md
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

from asn_engine.losses import (  # noqa: E402
    covariance_regularization,
    info_nce,
    variance_regularization,
)
from asn_engine.spectral import effective_rank  # noqa: E402

D_IN, K_LATENT, N_CLUSTERS = 128, 32, 16
N_TRAIN, N_TEST, D_SERVE = 1500, 800, 64
SIM_COEF = 25.0


def make_data(seed: int, anisotropy: str = "med", sep: float = 0.7):
    g = torch.Generator().manual_seed(seed)
    # anisotropy: scale latent dims by a decaying profile so the data spectrum is shaped
    decay = {"low": 0.0, "med": 1.0, "high": 2.5}[anisotropy]
    scale = torch.exp(-decay * torch.linspace(0, 1, K_LATENT))
    centers = torch.randn(N_CLUSTERS, K_LATENT, generator=g) * sep * scale
    embed = torch.randn(K_LATENT, D_IN, generator=g)

    def sample(n):
        y = torch.randint(0, N_CLUSTERS, (n,), generator=g)
        z = (centers[y] + torch.randn(n, K_LATENT, generator=g) * scale) @ embed
        return z, y

    return sample(N_TRAIN), sample(N_TEST), g


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


def knn_acc(tr_z, tr_y, te_z, te_y, k=10) -> float:
    tr_z, te_z = F.normalize(tr_z, dim=-1), F.normalize(te_z, dim=-1)
    idx = (te_z @ tr_z.T).topk(k, dim=-1).indices
    return float((torch.mode(tr_y[idx], dim=-1).values == te_y).float().mean())


def int8_quant(z: torch.Tensor) -> torch.Tensor:
    """Per-vector symmetric int8 quantize -> dequantize (simulates edge serving)."""
    scale = z.abs().amax(dim=-1, keepdim=True).clamp(min=1e-8) / 127.0
    return torch.round(z / scale).clamp(-127, 127) * scale


def run_one(cfg: dict) -> dict:
    t0 = time.time()
    seed = cfg["seed"]
    torch.manual_seed(seed)
    (x_tr, y_tr), (x_te, y_te), g = make_data(seed, cfg.get("anisotropy", "med"))
    model = Net()
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
    obj = cfg["objective"]
    batch = cfg["batch"]
    vvar, vcov = cfg.get("vicreg_var", 0.0), cfg.get("vicreg_cov", 0.0)
    steps = cfg.get("steps", 400)
    aug = cfg.get("aug", 1.0)

    for _ in range(steps):
        bi = torch.randint(0, x_tr.shape[0], (batch,), generator=g)
        x = x_tr[bi]
        v1 = x + aug * torch.randn(x.shape, generator=g)
        v2 = x + aug * torch.randn(x.shape, generator=g)
        z1, z2 = model(v1), model(v2)
        if obj == "infonce":
            loss = info_nce(z1, z2, temperature=0.2)
        elif obj == "alignment":
            loss = SIM_COEF * ((z1 - z2) ** 2).sum(-1).mean()
        elif obj == "simsiam":  # negative-free, stop-grad — collapse-prone
            loss = -0.5 * (F.cosine_similarity(z1, z2.detach(), dim=-1).mean()
                           + F.cosine_similarity(z2, z1.detach(), dim=-1).mean())
        else:
            raise ValueError(obj)
        if vvar > 0:
            loss = loss + vvar * (variance_regularization(z1) + variance_regularization(z2))
        if vcov > 0:
            loss = loss + vcov * (covariance_regularization(z1) + covariance_regularization(z2))
        opt.zero_grad()
        loss.backward()
        opt.step()

    model.eval()
    out = dict(cfg)
    with torch.no_grad():
        Ztr, Zte = model.serve(x_tr), model.serve(x_te)
        out["served_rank"] = round(effective_rank(Zte), 3)
        out["knn_full"] = round(knn_acc(Ztr, y_tr, Zte, y_te), 4)
        for d in (32, 16, 8):  # Matryoshka prefix truncation
            out[f"knn_t{d}"] = round(knn_acc(Ztr[:, :d], y_tr, Zte[:, :d], y_te), 4)
        out["knn_int8"] = round(knn_acc(int8_quant(Ztr), y_tr, int8_quant(Zte), y_te), 4)
    out["secs"] = round(time.time() - t0, 2)
    return out


def grid(family: str) -> list[dict]:
    cfgs = []
    if family == "A":  # regime map: 3 obj x 4 batch x 5 vicreg x 5 seed = 300
        vicregs = [(0, 0), (1, 0), (0, 1), (1, 0.04), (25, 1)]
        for obj in ("infonce", "alignment", "simsiam"):
            for batch in (4, 16, 64, 256):
                for vv, vc in vicregs:
                    for seed in range(5):
                        cfgs.append({"family": "A", "objective": obj, "batch": batch,
                                     "vicreg_var": vv, "vicreg_cov": vc, "seed": seed})
    elif family == "B":  # matryoshka/int8: 3 cov x 2 var x 4 batch x 8 seed = 192
        # truncation + int8 are measured on every run (knn_t32/t16/t8/int8 columns)
        for vc in (0, 0.04, 1):
            for vv in (0, 1):
                for batch in (4, 16, 64, 256):
                    for seed in range(8):
                        cfgs.append({"family": "B", "objective": "infonce", "batch": batch,
                                     "vicreg_var": vv, "vicreg_cov": vc, "seed": seed})
    elif family == "D":  # anisotropy: 3 aniso x 3 cov x 2 batch x 5 seed = 90
        for aniso in ("low", "med", "high"):
            for vc in (0, 0.04, 1):
                for batch in (64, 256):
                    for seed in range(5):
                        cfgs.append({"family": "D", "objective": "infonce", "batch": batch,
                                     "anisotropy": aniso, "vicreg_var": 0, "vicreg_cov": vc,
                                     "seed": seed})
    else:
        raise ValueError(f"unknown family {family}")
    return cfgs


def aggregate(sweep_dir: Path, report: Path) -> None:
    rows = []
    for f in sorted(sweep_dir.glob("*.jsonl")):
        for line in f.read_text().splitlines():
            if line.strip():
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    pass  # skip partial last line of a file being written concurrently
    report.write_text(_summarize(rows), encoding="utf-8")
    print(f"aggregated {len(rows)} runs -> {report}")


def _mean(rows, key):
    vals = [r[key] for r in rows if key in r]
    return sum(vals) / len(vals) if vals else float("nan")


def _summarize(rows: list[dict]) -> str:
    import statistics
    L = [f"# Sweep report — {len(rows)} experiments\n"]
    fams = sorted({r["family"] for r in rows})
    L.append(f"Families: {', '.join(fams)}\n")

    # Family A: VICReg benefit vs baseline (0,0) per objective x batch
    A = [r for r in rows if r["family"] == "A"]
    if A:
        L.append("\n## A — regime map: VICReg(25,1) kNN minus baseline(0,0) kNN\n")
        L.append("| objective | batch | base kNN | +VICReg kNN | Δ kNN | base rank | +VICReg rank |")
        L.append("|---|---|---|---|---|---|---|")
        for obj in sorted({r["objective"] for r in A}):
            for batch in sorted({r["batch"] for r in A}):
                base = [r for r in A if r["objective"] == obj and r["batch"] == batch
                        and r["vicreg_var"] == 0 and r["vicreg_cov"] == 0]
                vic = [r for r in A if r["objective"] == obj and r["batch"] == batch
                       and r["vicreg_var"] == 25 and r["vicreg_cov"] == 1]
                if base and vic:
                    bk, vk = _mean(base, "knn_full"), _mean(vic, "knn_full")
                    L.append(f"| {obj} | {batch} | {bk:.3f} | {vk:.3f} | {vk-bk:+.3f} | "
                             f"{_mean(base,'served_rank'):.1f} | {_mean(vic,'served_rank'):.1f} |")

    # Family B: truncation/int8 robustness by covariance setting
    B = [r for r in rows if r["family"] == "B"]
    if B:
        L.append("\n## B — Matryoshka + int8 robustness by covariance coefficient\n")
        L.append("| vicreg_cov | knn_full | knn_t32 | knn_t16 | knn_t8 | knn_int8 | drop@8 |")
        L.append("|---|---|---|---|---|---|---|")
        for vc in sorted({r["vicreg_cov"] for r in B}):
            g = [r for r in B if r["vicreg_cov"] == vc]
            full, t8 = _mean(g, "knn_full"), _mean(g, "knn_t8")
            L.append(f"| {vc} | {full:.3f} | {_mean(g,'knn_t32'):.3f} | {_mean(g,'knn_t16'):.3f} | "
                     f"{t8:.3f} | {_mean(g,'knn_int8'):.3f} | {full-t8:+.3f} |")

    # Family D: anisotropy x covariance
    D = [r for r in rows if r["family"] == "D"]
    if D:
        L.append("\n## D — anisotropy × covariance (kNN_full)\n")
        L.append("| anisotropy | cov=0 | cov=0.04 | cov=1 |")
        L.append("|---|---|---|---|")
        for aniso in ("low", "med", "high"):
            cells = []
            for vc in (0, 0.04, 1):
                g = [r for r in D if r.get("anisotropy") == aniso and r["vicreg_cov"] == vc]
                cells.append(f"{_mean(g,'knn_full'):.3f}" if g else "—")
            L.append(f"| {aniso} | {cells[0]} | {cells[1]} | {cells[2]} |")

    # Wave 2 — Bayesian (TPE) search over architectures x methods
    BZ = [r for r in rows if r.get("family") == "bayes"]
    if BZ:
        L.append(f"\n## Wave 2 — Bayesian search ({len(BZ)} trials)\n")
        L.append("### Method ranking (by robust score = knn_full + 0.5·knn_t8 + 0.5·knn_int8)\n")
        L.append("| method | n | mean score | best score | mean knn_full | mean knn_t8 | mean knn_int8 |")
        L.append("|---|---|---|---|---|---|---|")
        for m in sorted({r["method"] for r in BZ}, key=lambda m: -_mean([r for r in BZ if r["method"] == m], "score")):
            g = [r for r in BZ if r["method"] == m]
            best = max(r["score"] for r in g)
            L.append(f"| {m} | {len(g)} | {_mean(g,'score'):.3f} | {best:.3f} | "
                     f"{_mean(g,'knn_full'):.3f} | {_mean(g,'knn_t8'):.3f} | {_mean(g,'knn_int8'):.3f} |")
        L.append("\n### Architecture effects (mean robust score)\n")
        for knob in ("norm", "act", "expander", "depth", "batch"):
            parts = []
            for v in sorted({str(r[knob]) for r in BZ}):
                g = [r for r in BZ if str(r[knob]) == v]
                parts.append(f"{knob}={v}: {_mean(g,'score'):.3f}")
            L.append("- " + " · ".join(parts))
        top = sorted(BZ, key=lambda r: -r["score"])[:5]
        L.append("\n### Top 5 recipes\n")
        L.append("| score | method | depth | width | act | norm | expander | batch | knn_full | knn_t8 | knn_int8 |")
        L.append("|---|---|---|---|---|---|---|---|---|---|---|")
        for r in top:
            L.append(f"| {r['score']:.3f} | {r['method']} | {r['depth']} | {r['width']} | {r['act']} | "
                     f"{r['norm']} | {r['expander']} | {r['batch']} | {r['knn_full']} | {r['knn_t8']} | {r['knn_int8']} |")

    # Family C — real-text domain adaptation / forgetting
    C = [r for r in rows if r.get("family") == "C"]
    if C:
        L.append(f"\n## C — real-text domain adaptation + OOD forgetting ({len(C)} rows)\n")
        raw = [r for r in C if r.get("arm") == "raw"]
        if raw:
            L.append(f"raw MiniLM: in-domain kNN {raw[0]['knn_indomain']:.3f}, OOD kNN {raw[0]['knn_ood']:.3f}\n")
        L.append("| arm | train_pairs | in-domain kNN | in-domain gain | OOD kNN | forgetting |")
        L.append("|---|---|---|---|---|---|")
        for r in sorted([r for r in C if r.get("arm") != "raw"], key=lambda r: (r.get("arm"), r.get("train_pairs", 0))):
            L.append(f"| {r['arm']} | {r.get('train_pairs','—')} | {r['knn_indomain']:.3f} | "
                     f"{r.get('indomain_gain',0):+.3f} | {r['knn_ood']:.3f} | {r.get('forgetting',0):+.3f} |")

    L.append("\n_Generated by scripts/sweep.py --aggregate._\n")
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--family", choices=["A", "B", "D"])
    ap.add_argument("--shard", default="0:1", help="i:N — run shard i of N")
    ap.add_argument("--out", type=Path)
    ap.add_argument("--steps", type=int, default=400)
    ap.add_argument("--aggregate", type=Path)
    ap.add_argument("--report", type=Path, default=REPO / "SWEEP_REPORT.md")
    args = ap.parse_args()

    if args.aggregate:
        aggregate(args.aggregate, args.report)
        return 0

    i, n = map(int, args.shard.split(":"))
    cfgs = [c for k, c in enumerate(grid(args.family)) if k % n == i]
    for c in cfgs:
        c["steps"] = args.steps
    args.out.parent.mkdir(parents=True, exist_ok=True)
    print(f"family {args.family} shard {i}/{n}: {len(cfgs)} runs -> {args.out}", flush=True)
    with args.out.open("w") as fh:
        for k, c in enumerate(cfgs):
            r = run_one(c)
            fh.write(json.dumps(r) + "\n")
            fh.flush()
            if k % 10 == 0:
                print(f"  [{k}/{len(cfgs)}] {c['objective']} b{c['batch']} "
                      f"v{c.get('vicreg_var',0)}/{c.get('vicreg_cov',0)} -> knn {r['knn_full']}", flush=True)
    print(f"done {len(cfgs)} runs", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
