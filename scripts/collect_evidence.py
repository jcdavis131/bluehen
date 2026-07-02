#!/usr/bin/env python3
"""Collect reproducible evidence for EVIDENCE.md and data/evidence/latest.json."""

from __future__ import annotations

import argparse
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "asn-engine"))
sys.path.insert(0, str(ROOT / "packages" / "eval-harness"))

import torch
from asn_engine.spectral import effective_rank, newton_schulz, newton_schulz_cubic

PHASE_A_SITES = ("storefront", "validation", "research", "dumbmodel")
DEFAULT_SEED = 42


def measure_math() -> dict:
    torch.manual_seed(0)
    u = torch.randn(256, 1)
    v = torch.randn(1, 64)
    rank1 = effective_rank(u @ v)

    x = torch.randn(256, 64)
    iso = effective_rank(x)

    m = torch.randn(64, 64)
    s8 = torch.linalg.svdvals(newton_schulz(m, steps=8))
    s20 = torch.linalg.svdvals(newton_schulz(m, steps=20))
    raw = torch.linalg.svdvals(m)
    cubic = torch.linalg.svdvals(newton_schulz_cubic(m, steps=40))

    return {
        "effectiveRankRank1": round(rank1, 6),
        "effectiveRankIsotropic256x64": round(iso, 4),
        "quinticSigmaMin8": round(float(s8.min()), 4),
        "quinticSigmaMax8": round(float(s8.max()), 4),
        "quinticFixedPointDeltaMin": round(float(abs(s8.min() - s20.min())), 6),
        "quinticConditionRatio": round(float((s8.max() / s8.min()) / (raw.max() / raw.min())), 6),
        "cubicSigmaMin40": round(float(cubic.min()), 6),
        "cubicSigmaMax40": round(float(cubic.max()), 6),
    }


def _synth_pairs(corpus_path: Path, n: int = 128) -> list[dict]:
    docs: list[dict] = []
    with corpus_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                docs.append(json.loads(line))
    if len(docs) < 2:
        raise ValueError(f"need >= 2 docs in {corpus_path}")
    pairs: list[dict] = []
    for _ in range(n):
        i = random.randint(0, len(docs) - 1)
        j = i if random.random() < 0.5 else min(i + 1, len(docs) - 1)
        neg = random.randint(0, len(docs) - 1)
        while neg == i:
            neg = random.randint(0, len(docs) - 1)
        a, b, c = docs[i], docs[j], docs[neg]
        pairs.append(
            {
                "anchor": f"{a.get('title', '')}. {a.get('text', '')}",
                "positive": f"{b.get('title', '')}. {b.get('text', '')}",
                "negative": f"{c.get('title', '')}. {c.get('text', '')}",
            }
        )
    return pairs


def _base_recipe(*, epochs: int, enabled: bool, vicreg: bool = False) -> dict:
    loss: dict = {"infoNceTemp": 0.07}
    if vicreg:
        loss["vicregVar"] = 1.0
        loss["vicregCov"] = 0.04
    return {
        "baseModel": "sentence-transformers/all-MiniLM-L6-v2",
        "epochs": epochs,
        "batchSize": 8,
        "lr": 2e-5,
        "rankFloor": 8.0 if enabled else 12.0,
        "loss": loss,
        "asn": {
            "enabled": enabled,
            "kStrong": 8,
            "kTail": 8,
            "lambda": 0.5,
            "newtonSchulzSteps": 5,
            "heteroEmaBeta": 0.9,
            "rankDropDelta": 2.0,
            "rankWindow": 256,
            "surgeryCheckEvery": 10,
            "newtonSchulzEvery": 50,
        },
    }


def _train_eval(
    *,
    label: str,
    pairs: list[dict],
    recipe: dict,
    out_dir: Path,
    seed: int,
) -> dict:
    from asn_engine.train_loop import train_asn_with_seed
    from eval_harness.runner import evaluate_checkpoint

    ckpt_dir = out_dir / label
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    train_out = train_asn_with_seed(pairs, recipe, ckpt_dir, seed=seed)
    eval_out = evaluate_checkpoint(Path(train_out.checkpoint_path), pairs)
    return {
        "effectiveRankTrain": round(train_out.effective_rank, 4),
        "finalLoss": round(train_out.final_loss, 4),
        "surgeries": train_out.surgeries,
        "evalEffectiveRank": eval_out["effectiveRank"],
        "ndcg10": eval_out["ndcg10"],
        "gates": eval_out["gates"],
        "allPassed": eval_out["allPassed"],
        "checkpoint": train_out.checkpoint_path,
    }


def run_ablation(
    *,
    site_id: str = "storefront",
    epochs: int = 10,
    pairs_n: int = 128,
    seed: int = DEFAULT_SEED,
    include_vicreg: bool = False,
) -> dict:
    corpus = ROOT / "data" / "corpora" / site_id / "corpus.jsonl"
    if not corpus.exists():
        return {"skipped": True, "reason": f"no corpus at {corpus}"}

    random.seed(seed)
    pairs = _synth_pairs(corpus, n=pairs_n)
    out_dir = ROOT / "data" / "evidence" / "checkpoints" / site_id
    out_dir.mkdir(parents=True, exist_ok=True)

    results: dict = {"siteId": site_id, "epochs": epochs, "pairs": pairs_n, "seed": seed}
    arms: list[tuple[str, bool, bool]] = [
        ("infoNceBaseline", False, False),
        ("asnEnabled", True, False),
    ]
    if include_vicreg:
        arms.append(("infoNceVicreg", False, True))

    for label, enabled, vicreg in arms:
        recipe = _base_recipe(epochs=epochs, enabled=enabled, vicreg=vicreg)
        results[label] = _train_eval(
            label=label, pairs=pairs, recipe=recipe, out_dir=out_dir, seed=seed
        )

    base_er = results["infoNceBaseline"]["evalEffectiveRank"]
    asn_er = results["asnEnabled"]["evalEffectiveRank"]
    base_ndcg = results["infoNceBaseline"]["ndcg10"]
    asn_ndcg = results["asnEnabled"]["ndcg10"]
    results["gate1AsnRankAboveBaseline"] = asn_er > base_er
    results["gate1NdcgNonRegression"] = asn_ndcg >= base_ndcg
    results["gate1Both"] = results["gate1AsnRankAboveBaseline"] and results["gate1NdcgNonRegression"]
    if include_vicreg:
        vic = results["infoNceVicreg"]
        results["vicregVsBaseline"] = {
            "dRank": round(vic["evalEffectiveRank"] - base_er, 4),
            "dNdcg": round(vic["ndcg10"] - base_ndcg, 4),
            "rankAboveBaseline": vic["evalEffectiveRank"] > base_er,
            "ndcgNonRegression": vic["ndcg10"] >= base_ndcg,
        }
    return results


def run_fleet_ablation(
    *,
    epochs: int = 10,
    pairs_n: int = 128,
    seed: int = DEFAULT_SEED,
    include_vicreg: bool = False,
) -> dict:
    fleet: dict = {}
    passed = 0
    for site_id in PHASE_A_SITES:
        fleet[site_id] = run_ablation(
            site_id=site_id, epochs=epochs, pairs_n=pairs_n, seed=seed, include_vicreg=include_vicreg
        )
        if fleet[site_id].get("gate1Both"):
            passed += 1
    return {
        "epochs": epochs,
        "pairs": pairs_n,
        "seed": seed,
        "sites": list(PHASE_A_SITES),
        "gate1PassedSites": passed,
        "gate1PassedAll": passed == len(PHASE_A_SITES),
        "bySite": fleet,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect ASN evidence snapshot")
    parser.add_argument("--ablation", action="store_true", help="Run ASN vs baseline train")
    parser.add_argument("--all-sites", action="store_true", help="Ablation on all Phase A corpora")
    parser.add_argument("--site", default="storefront", help="Corpus site id (single-site ablation)")
    parser.add_argument("--vicreg", action="store_true", help="Add InfoNCE+VICReg arm (no surgery)")
    parser.add_argument("--epochs", type=int, default=10, help="Training epochs per run")
    parser.add_argument("--pairs", type=int, default=128, help="Synthetic pairs per site")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    payload = {
        "collectedAt": datetime.now(timezone.utc).isoformat(),
        "mathTests": measure_math(),
        "pytestCommand": "uv run pytest packages/asn-engine/tests packages/eval-harness -q",
    }
    if args.ablation:
        if args.all_sites:
            payload["ablationFleet"] = run_fleet_ablation(
                epochs=args.epochs,
                pairs_n=args.pairs,
                seed=args.seed,
                include_vicreg=args.vicreg,
            )
        else:
            payload["ablation"] = run_ablation(
                site_id=args.site,
                epochs=args.epochs,
                pairs_n=args.pairs,
                seed=args.seed,
                include_vicreg=args.vicreg,
            )

    out_dir = ROOT / "data" / "evidence"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "latest.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(f"\nWrote {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
