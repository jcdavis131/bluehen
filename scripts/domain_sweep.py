"""Family C — real-text domain adaptation + out-of-domain forgetting sweep.

Tests the measured product lever (EVIDENCE §3.6: domain fine-tune beats zero-shot SOTA
in-domain) across fine-tune size / epochs / VICReg, and quantifies the COST — out-of-domain
forgetting. Train MiniLM on AG News (news); evaluate kNN topic accuracy in-domain (AG News)
and out-of-domain (DBpedia ontology). Forgetting = OOD kNN drop vs raw MiniLM.

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/domain_sweep.py --out data/sweeps/C0.jsonl
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))
sys.path.insert(0, str(REPO / "scripts"))

import torch  # noqa: E402

from realtext_validation import encode_texts, evaluate  # noqa: E402

BACKBONE = "sentence-transformers/all-MiniLM-L6-v2"
N_EVAL = 600


def load_domains(seed: int):
    from datasets import load_dataset

    ag = load_dataset("fancyzhx/ag_news", split="train").shuffle(seed=seed)
    ag_te = load_dataset("fancyzhx/ag_news", split="test").shuffle(seed=seed)
    db_te = load_dataset("fancyzhx/dbpedia_14", split="test").shuffle(seed=seed)
    indomain = ([ag_te[i]["text"] for i in range(N_EVAL)], [ag_te[i]["label"] for i in range(N_EVAL)])
    ood = ([db_te[i]["content"] for i in range(N_EVAL)], [db_te[i]["label"] for i in range(N_EVAL)])
    return ag, indomain, ood


def build_pairs(ag, n_pairs: int, seed: int) -> list[dict]:
    by_topic: dict[int, list[str]] = {}
    for i in range(min(len(ag), 8000)):
        by_topic.setdefault(ag[i]["label"], []).append(ag[i]["text"])
    g = torch.Generator().manual_seed(seed)
    topics = list(by_topic)
    pairs = []
    while len(pairs) < n_pairs:
        t = topics[int(torch.randint(len(topics), (1,), generator=g))]
        docs = by_topic[t]
        i, j = torch.randint(len(docs), (2,), generator=g).tolist()
        if i != j:
            pairs.append({"anchor": docs[i], "positive": docs[j]})
    return pairs


def main() -> int:
    from asn_engine.train_loop import train_asn

    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=REPO / "data" / "sweeps" / "C0.jsonl")
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)

    ag, indomain, ood = load_domains(0)
    id_texts, id_labels = indomain
    ood_texts, ood_labels = ood

    # raw baseline (once)
    raw_id = evaluate(encode_texts(BACKBONE, id_texts), id_labels)
    raw_ood = evaluate(encode_texts(BACKBONE, ood_texts), ood_labels)
    print(f"raw MiniLM: in-domain kNN {raw_id['knnAcc']:.3f}, OOD kNN {raw_ood['knnAcc']:.3f}", flush=True)

    vic_axis = (False,) if args.arm == "barlow" else (False, True)
    grid = [(size, ep, vic, seed)
            for size in (300, 1200)
            for ep in (2,)
            for vic in vic_axis
            for seed in (0, 1)]

    out = REPO / "data" / "domain_sweep_ckpts"
    with args.out.open("w") as fh:
        # record the raw baseline as a row too
        fh.write(json.dumps({"family": "C", "arm": "raw", "knn_indomain": raw_id["knnAcc"],
                             "knn_ood": raw_ood["knnAcc"]}) + "\n")
        for size, ep, vic, seed in grid:
            recipe = {"baseModel": BACKBONE, "epochs": ep, "batchSize": 32, "lr": 2e-5,
                      "asn": {"enabled": False},
                      "loss": {"infoNceTemp": 0.05,
                               **({"vicregVar": 1.0, "vicregCov": 0.04} if vic else {})}}
            pairs = build_pairs(ag, size, seed)
            ckpt = Path(train_asn(pairs, recipe, out / f"{size}_{ep}_{vic}_{seed}").checkpoint_path)
            id_m = evaluate(encode_texts(ckpt, id_texts), id_labels)
            ood_m = evaluate(encode_texts(ckpt, ood_texts), ood_labels)
            row = {"family": "C", "arm": "vicreg" if vic else "infonce",
                   "train_pairs": size, "epochs": ep, "seed": seed,
                   "knn_indomain": round(id_m["knnAcc"], 4), "knn_ood": round(ood_m["knnAcc"], 4),
                   "ndcg_indomain": round(id_m["ndcg10"], 4),
                   "forgetting": round(raw_ood["knnAcc"] - ood_m["knnAcc"], 4),
                   "indomain_gain": round(id_m["knnAcc"] - raw_id["knnAcc"], 4)}
            fh.write(json.dumps(row) + "\n")
            if os.environ.get("CLEAN_CKPTS") == "1":
                import shutil

                shutil.rmtree(out / f"{size}_{ep}_{vic}_{seed}", ignore_errors=True)
            fh.flush()
            print(f"  size{size} ep{ep} {'vic' if vic else 'inf'} s{seed}: "
                  f"ID {row['knn_indomain']} (+{row['indomain_gain']}) "
                  f"OOD {row['knn_ood']} (forget {row['forgetting']})", flush=True)
    print("done", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
