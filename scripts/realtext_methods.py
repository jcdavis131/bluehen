"""#1 + #2 — Real-text method ranking and fair zero-shot SOTA panel.

#1 (confirm Barlow > VICReg on real text): trains MiniLM via the production train_asn path with
each method (infonce / vicreg / barlow / mrl) on AG News, then evaluates the SERVED Z1 at full
and truncated dims (Matryoshka) on AG News (in-domain) and DBpedia (out-of-domain).

#2 (fair comparison): a zero-shot SOTA panel — raw MiniLM, BGE-small, e5-small — all evaluated
zero-shot on the SAME slices, so model quality is compared apples-to-apples (not our in-domain
fine-tune vs someone else's zero-shot).

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py --out data/sweeps/methods.jsonl
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))
sys.path.insert(0, str(REPO / "scripts"))

from domain_sweep import BACKBONE, build_pairs, load_domains  # noqa: E402
from realtext_validation import encode_texts, evaluate  # noqa: E402

TRUNC_DIMS = (128, 64, 32)
SEEDS = (0, 1)
TRAIN_PAIRS = 800
EPOCHS = 2

METHODS = {
    "infonce": {"loss": {"infoNceTemp": 0.05}},
    "vicreg": {"loss": {"infoNceTemp": 0.05, "vicregVar": 1.0, "vicregCov": 0.04}},
    "barlow": {"loss": {"method": "barlow", "barlowLambda": 0.02}},
    "mrl": {"loss": {"method": "mrl", "infoNceTemp": 0.05}},
}
SOTA = {
    "raw-MiniLM": BACKBONE,
    "BGE-small": "BAAI/bge-small-en-v1.5",
    "e5-small": "intfloat/e5-small-v2",
}


def metrics_for(Z, labels) -> dict:
    full = evaluate(Z, labels)
    out = {"effRank": round(full["effRank"], 2), "knn_full": round(full["knnAcc"], 4),
           "ndcg_full": round(full["ndcg10"], 4)}
    for d in TRUNC_DIMS:
        if Z.shape[1] >= d:
            out[f"knn_t{d}"] = round(evaluate(Z[:, :d], labels)["knnAcc"], 4)
    return out


def main() -> int:
    from asn_engine.train_loop import train_asn

    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=REPO / "data" / "sweeps" / "methods.jsonl")
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)

    ag, (id_texts, id_labels), (ood_texts, ood_labels) = load_domains(0)
    ckdir = REPO / "data" / "methods_ckpts"
    fh = args.out.open("w")

    def emit(row):
        fh.write(json.dumps(row) + "\n")
        fh.flush()
        print("  " + json.dumps(row), flush=True)

    # #2 — zero-shot SOTA panel (fair: all off-the-shelf, no fine-tune)
    print("=== zero-shot SOTA panel ===", flush=True)
    for name, hf in SOTA.items():
        try:
            idm = metrics_for(encode_texts(hf, id_texts), id_labels)
            oodm = metrics_for(encode_texts(hf, ood_texts), ood_labels)
            emit({"kind": "zeroshot", "model": name, "indomain": idm, "ood_knn": oodm["knn_full"]})
        except Exception as e:
            emit({"kind": "zeroshot", "model": name, "error": f"{type(e).__name__}: {e}"})

    # #1 — trained method ranking (fine-tuned on AG News)
    print("=== trained methods (AG News fine-tune) ===", flush=True)
    for method, extra in METHODS.items():
        for seed in SEEDS:
            recipe = {"baseModel": BACKBONE, "epochs": EPOCHS, "batchSize": 32, "lr": 2e-5,
                      "asn": {"enabled": False}, **extra}
            pairs = build_pairs(ag, TRAIN_PAIRS, seed)
            ck = Path(train_asn(pairs, recipe, ckdir / f"{method}_{seed}").checkpoint_path)
            idm = metrics_for(encode_texts(ck, id_texts), id_labels)
            oodm = metrics_for(encode_texts(ck, ood_texts), ood_labels)
            emit({"kind": "trained", "method": method, "seed": seed,
                  "indomain": idm, "ood_knn": oodm["knn_full"]})
    fh.close()

    # summary
    rows = [json.loads(l) for l in args.out.read_text().splitlines() if l.strip()]
    print("\n=== SUMMARY ===")
    print(f"{'model/method':<22} {'knn_full':>9} {'ndcg_full':>10} {'knn_t64':>8} {'knn_t32':>8} {'ood_knn':>8}")
    for r in rows:
        if r.get("error"):
            print(f"{r['model']:<22}  ERROR {r['error'][:40]}")
            continue
        name = r.get("model") or f"{r['method']}(s{r['seed']})"
        m = r["indomain"]
        print(f"{name:<22} {m['knn_full']:>9} {m['ndcg_full']:>10} "
              f"{m.get('knn_t64','—'):>8} {m.get('knn_t32','—'):>8} {r['ood_knn']:>8}")
    print("done", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
