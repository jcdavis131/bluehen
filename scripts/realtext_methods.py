"""#1 + #2 — Real-text method ranking and fair zero-shot SOTA panel.

#1 (confirm Barlow > VICReg on real text): trains MiniLM via the production train_asn path with
each method (infonce / vicreg / barlow / mrl) on AG News, then evaluates the SERVED Z1 at full
and truncated dims (Matryoshka) on AG News (in-domain) and DBpedia (out-of-domain).

#2 (fair comparison): a zero-shot SOTA panel — raw MiniLM, BGE-small, e5-small — all evaluated
zero-shot on the SAME slices, so model quality is compared apples-to-apples (not our in-domain
fine-tune vs someone else's zero-shot).

RT-402 (corpus mode): pass --corpus <path> to swap the in-domain slice for a real JSONL corpus
(each line has 'text' or 'abstract' — same load pattern as rag_chunk_ablation.load_docs). AG
News then becomes the OOD slice. Corpus text has no topic labels, so in-domain metrics switch
from kNN-label accuracy to pair-based retrieval nDCG (adjacent-chunk positive + hard-jaccard
negative, chunked via datalab.chunk.chunk_text at 256 tokens — same approach as
rag_chunk_ablation.build_pairs) plus effective rank of the anchor embeddings. When --corpus is
omitted, behavior is exactly the original AG News / DBpedia panel.

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py --out data/sweeps/methods.jsonl
      packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py --corpus data/corpora/research/corpus.jsonl
      packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py --corpus data/corpora/research/corpus.jsonl --smoke
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))
sys.path.insert(0, str(REPO / "packages" / "eval-harness"))
sys.path.insert(0, str(REPO / "packages" / "datalab"))
sys.path.insert(0, str(REPO / "scripts"))

from datalab.chunk import chunk_text  # noqa: E402
from domain_sweep import BACKBONE, build_pairs, load_domains  # noqa: E402
from eval_harness.metrics import ndcg_at_k, retrieval_scores  # noqa: E402
from asn_engine.spectral import effective_rank  # noqa: E402
from realtext_validation import encode_texts, evaluate  # noqa: E402

TRUNC_DIMS = (128, 64, 32)
SEEDS = (0, 1)
TRAIN_PAIRS = 800
EPOCHS = 2

# RT-402 corpus-mode constants
CORPUS_MAX_DOCS = 60
CORPUS_MAX_PAIRS = 40
CORPUS_CHUNK_TOKENS = 256
OOD_AGNEWS_N_FULL = 600
OOD_AGNEWS_N_SMOKE = 20

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


def load_corpus_docs(corpus: Path, max_docs: int) -> list[dict]:
    """Same load pattern as rag_chunk_ablation.load_docs."""
    docs = []
    with corpus.open(encoding="utf-8") as fh:
        for line in fh:
            try:
                d = json.loads(line)
            except json.JSONDecodeError:
                continue
            text = d.get("text") or d.get("abstract") or ""
            if len(text.split()) >= 40:
                docs.append({"id": d.get("id", f"doc-{len(docs)}"), "text": text})
            if len(docs) >= max_docs:
                break
    return docs


def build_corpus_pairs(docs: list[dict], max_pairs: int) -> list[dict]:
    """Adjacent-chunk positive + hard-jaccard negative, chunked at CORPUS_CHUNK_TOKENS.

    Same pair-building approach as rag_chunk_ablation.build_pairs, fixed to a single
    chunk size (no arm sweep) since RT-402 only needs one in-domain retrieval slice.
    """
    chunked: list[tuple[str, str]] = []  # (doc_id, text)
    for d in docs:
        for c in chunk_text(d["id"], d["text"], max_tokens=CORPUS_CHUNK_TOKENS, strategy="auto"):
            chunked.append((d["id"], c.text))
    pairs = []
    token_sets = [frozenset(t.lower().split()) for _, t in chunked]
    for i in range(len(chunked) - 1):
        doc_i, text_i = chunked[i]
        doc_j, text_j = chunked[i + 1]
        if doc_i != doc_j:
            continue
        best, best_s = -1, -1.0
        for k, toks in enumerate(token_sets):
            if chunked[k][0] == doc_i:
                continue
            union = len(token_sets[i] | toks)
            s = (len(token_sets[i] & toks) / union) if union else 0.0
            if s > best_s:
                best, best_s = k, s
        if best < 0:
            continue
        pairs.append({"anchor": text_i, "positive": text_j, "negative": chunked[best][1]})
        if len(pairs) >= max_pairs:
            break
    return pairs


def corpus_metrics_for(state_or_name, pairs: list[dict]) -> dict:
    """Pair-based retrieval nDCG + effective rank of anchors (no topic labels needed)."""
    if not pairs:
        return {"ndcg_pairs": 0.0, "effRank": 0.0}
    anchors = [p["anchor"] for p in pairs]
    positives = [p["positive"] for p in pairs]
    negatives = [p["negative"] for p in pairs]
    Za = encode_texts(state_or_name, anchors)
    Zp = encode_texts(state_or_name, positives)
    Zn = encode_texts(state_or_name, negatives)
    ndcgs = []
    for i in range(len(pairs)):
        ranked = retrieval_scores(Za[i].tolist(), [
            ("pos", Zp[i].tolist()),
            ("neg", Zn[i].tolist()),
        ])
        rel = [1.0 if d == "pos" else 0.0 for d, _ in ranked]
        ndcgs.append(ndcg_at_k(rel, k=2))
    return {"ndcg_pairs": round(sum(ndcgs) / len(ndcgs), 4), "effRank": round(effective_rank(Za), 2)}


def load_agnews_ood(seed: int, n: int):
    """AG News test split only — used as the OOD slice in corpus mode (RT-402)."""
    from datasets import load_dataset

    te = load_dataset("fancyzhx/ag_news", split="test").shuffle(seed=seed)
    n = min(n, len(te))
    return [te[i]["text"] for i in range(n)], [te[i]["label"] for i in range(n)]


def main() -> int:
    from asn_engine.train_loop import train_asn

    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=REPO / "data" / "sweeps" / "methods.jsonl")
    ap.add_argument("--corpus", type=Path, default=None,
                     help="RT-402: JSONL corpus path. When given, in-domain = corpus pair-nDCG "
                          "and AG News becomes the OOD slice. Omit for the original panel.")
    ap.add_argument("--smoke", action="store_true",
                     help="RT-402: tiny run — 1 method (infonce), 1 seed, tiny steps, no "
                          "zero-shot panel. For fast sanity checks of --corpus mode.")
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)

    methods, seeds, epochs, train_pairs_n, run_zeroshot = METHODS, SEEDS, EPOCHS, TRAIN_PAIRS, True
    if args.smoke:
        methods = {"infonce": METHODS["infonce"]}
        seeds = (0,)
        epochs = 1
        train_pairs_n = 8
        run_zeroshot = False

    ckdir = REPO / "data" / "methods_ckpts"
    fh = args.out.open("w")

    def emit(row):
        fh.write(json.dumps(row) + "\n")
        fh.flush()
        print("  " + json.dumps(row), flush=True)

    if args.corpus:
        # ---- RT-402 corpus mode: in-domain = corpus pair-nDCG, OOD = AG News ----
        max_docs = 8 if args.smoke else CORPUS_MAX_DOCS
        max_pairs = 4 if args.smoke else CORPUS_MAX_PAIRS
        ood_n = OOD_AGNEWS_N_SMOKE if args.smoke else OOD_AGNEWS_N_FULL

        docs = load_corpus_docs(args.corpus, max_docs)
        half = max(1, len(docs) // 2)
        train_docs = docs[:half]
        eval_docs = docs[half:] or docs[:half]
        train_corpus_pairs = build_corpus_pairs(train_docs, max_pairs) or build_corpus_pairs(docs, max_pairs)
        eval_corpus_pairs = build_corpus_pairs(eval_docs, max_pairs) or train_corpus_pairs
        ood_texts, ood_labels = load_agnews_ood(0, ood_n)

        if run_zeroshot:
            print("=== zero-shot SOTA panel (corpus mode) ===", flush=True)
            for name, hf in SOTA.items():
                try:
                    idm = corpus_metrics_for(hf, eval_corpus_pairs)
                    oodm = metrics_for(encode_texts(hf, ood_texts), ood_labels)
                    emit({"kind": "zeroshot", "model": name, "indomain": idm, "ood_knn": oodm["knn_full"]})
                except Exception as e:
                    emit({"kind": "zeroshot", "model": name, "error": f"{type(e).__name__}: {e}"})

        print("=== trained methods (corpus fine-tune) ===", flush=True)
        for method, extra in methods.items():
            for seed in seeds:
                recipe = {"baseModel": BACKBONE, "epochs": epochs, "batchSize": 32, "lr": 2e-5,
                          "asn": {"enabled": False}, **extra}
                ck = Path(train_asn(train_corpus_pairs, recipe, ckdir / f"{method}_{seed}_corpus").checkpoint_path)
                idm = corpus_metrics_for(ck, eval_corpus_pairs)
                oodm = metrics_for(encode_texts(ck, ood_texts), ood_labels)
                emit({"kind": "trained", "method": method, "seed": seed,
                      "indomain": idm, "ood_knn": oodm["knn_full"]})
        fh.close()

        rows = [json.loads(l) for l in args.out.read_text().splitlines() if l.strip()]
        print("\n=== SUMMARY (corpus mode) ===")
        print(f"{'model/method':<22} {'ndcg_pairs':>10} {'effRank':>8} {'ood_knn':>8}")
        for r in rows:
            if r.get("error"):
                print(f"{r['model']:<22}  ERROR {r['error'][:40]}")
                continue
            name = r.get("model") or f"{r['method']}(s{r['seed']})"
            m = r["indomain"]
            print(f"{name:<22} {m['ndcg_pairs']:>10} {m['effRank']:>8} {r['ood_knn']:>8}")
        print("done", flush=True)
        return 0

    # ---- original AG News (in-domain) / DBpedia (OOD) panel — unchanged ----
    ag, (id_texts, id_labels), (ood_texts, ood_labels) = load_domains(0)

    # #2 — zero-shot SOTA panel (fair: all off-the-shelf, no fine-tune)
    if run_zeroshot:
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
    for method, extra in methods.items():
        for seed in seeds:
            recipe = {"baseModel": BACKBONE, "epochs": epochs, "batchSize": 32, "lr": 2e-5,
                      "asn": {"enabled": False}, **extra}
            pairs = build_pairs(ag, train_pairs_n, seed)
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
