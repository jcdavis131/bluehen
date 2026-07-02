"""Autoresearch prepare — FIXED evaluation contract. Do not modify during agent runs.

Adapted from karpathy/autoresearch prepare.py: constants, data generation, and scoring
are stable so experiments are comparable across train.py edits.

See program.md for the research loop.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import torch

# --- fixed budget (autoresearch: comparable experiments) ---
TIME_BUDGET_SEC = int(__import__("os").getenv("AUTORESEARCH_BUDGET_SEC", "180"))
# Wave 2 TPE used ~300 steps (~5s). Set AUTORESEARCH_STEPS=300 for apples-to-apples; 0 = wall-clock only.
TRAIN_STEPS = int(__import__("os").getenv("AUTORESEARCH_STEPS", "300"))
SEEDS = (0, 1)  # mean over seeds for robustness

# --- paths ---
REPO = Path(__file__).resolve().parents[1]
AUTORESEARCH_DIR = REPO / "data" / "autoresearch"
PROGRESS_PATH = AUTORESEARCH_DIR / "progress.jsonl"
BEST_PATH = AUTORESEARCH_DIR / "best.json"

# --- re-use sweep testbed (frozen) ---
import sys

sys.path.insert(0, str(REPO / "packages" / "asn-engine"))
sys.path.insert(0, str(REPO / "scripts"))

from sweep import D_SERVE, int8_quant, knn_acc, make_data  # noqa: E402
from asn_engine.spectral import effective_rank  # noqa: E402


def robust_score(knn_full: float, knn_t8: float, knn_int8: float) -> float:
    return knn_full + 0.5 * knn_t8 + 0.5 * knn_int8


def evaluate(model, seed: int) -> dict:
    """Score served embeddings on held-out synthetic clusters."""
    torch.manual_seed(seed)
    (x_tr, y_tr), (x_te, y_te), _ = make_data(seed, "med")
    model.eval()
    with torch.no_grad():
        z_tr = model.serve(x_tr) if hasattr(model, "serve") else model(x_tr)
        z_te = model.serve(x_te) if hasattr(model, "serve") else model(x_te)
        kf = knn_acc(z_tr, y_tr, z_te, y_te)
        k8 = knn_acc(z_tr[:, :8], y_tr, z_te[:, :8], y_te)
        ki = knn_acc(int8_quant(z_tr), y_tr, int8_quant(z_te), y_te)
        er = float(effective_rank(z_te))
    score = robust_score(kf, k8, ki)
    return {
        "knn_full": round(kf, 4),
        "knn_t8": round(k8, 4),
        "knn_int8": round(ki, 4),
        "served_rank": round(er, 4),
        "robust_score": round(score, 4),
    }


def evaluate_multi_seed(model) -> dict:
    rows = [evaluate(model, s) for s in SEEDS]
    out = {k: round(sum(r[k] for r in rows) / len(rows), 4) for k in rows[0]}
    out["seeds"] = list(SEEDS)
    return out


def load_best() -> dict:
    if BEST_PATH.exists():
        return json.loads(BEST_PATH.read_text(encoding="utf-8"))
    # seed from Wave 2 interim leader (SWEEP_REPORT.md)
    return {
        "robust_score": 1.465,
        "knn_full": 0.8562,
        "note": "initial baseline from barlow Wave 2",
    }


def check_constraints(metrics: dict, best: dict) -> tuple[bool, str]:
    if metrics["served_rank"] < 8.0:
        return False, f"collapse: served_rank={metrics['served_rank']:.2f} < 8"
    if metrics["knn_full"] < best.get("knn_full", 0) - 0.02:
        return False, f"knn_full regression: {metrics['knn_full']:.4f}"
    return True, "ok"


def log_run(*, metrics: dict, secs: float, keep: bool, reason: str) -> None:
    AUTORESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    row = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "keep": keep,
        "reason": reason,
        "secs": round(secs, 2),
        **metrics,
    }
    with PROGRESS_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")
    if keep:
        BEST_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
