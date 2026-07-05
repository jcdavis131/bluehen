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

RT-404 (harder in-domain eval): the 1-pos-vs-1-neg pair nDCG (ndcg_pairs) saturated at ~0.935
for every method — no separation. In corpus mode we additionally rank each anchor's positive
against a pool of K hard negatives (highest-jaccard non-positive chunks, same jaccard machinery
as build_corpus_pairs' single hardest negative, extended to top-K with a seeded random fallback
fill when the corpus doesn't have K distinct cross-doc candidates). Reported as
ndcg_pool{K} (nDCG@10 over the K+1 candidate ranking) alongside the existing ndcg_pairs/effRank.
K=16 in a full run, K=4 under --smoke. Pool construction is seeded off CORPUS_POOL_SEED so the
same corpus always yields the same pools regardless of which model/method is being scored.

AR-510 (instruction-conditioned heads, Spec 0030 §2): --instructions (corpus mode only) prefixes
every text with an Instructor-style task instruction — anchors/queries get "Represent this
research passage for retrieval: ", candidates (positive/negative/pool) get "Represent this
research passage: ", and the OOD AG News slice gets "Represent this news passage for
classification: ". Prefixing is applied symmetrically at train time (pair building fed to
train_asn) and eval time (corpus_metrics_for + pool ranking) so a with/without run isolates the
instruction-prefix effect on the SAME backbone+method. Rows gain "instructions": true|false.

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py --out data/sweeps/methods.jsonl
      packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py --corpus data/corpora/research/corpus.jsonl
      packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py --corpus data/corpora/research/corpus.jsonl --smoke
      packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py --corpus data/corpora/research/corpus.jsonl --smoke --instructions
"""

from __future__ import annotations

import argparse
import os
import json
import random
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

# RT-404 hard-negative pool constants
CORPUS_POOL_K_FULL = 16
CORPUS_POOL_K_SMOKE = 4
CORPUS_POOL_SEED = 0

# AR-510 instruction-conditioned-heads prefixes (Instructor-style). Query/anchor prefix differs
# from the candidate (positive/negative/pool) prefix; OOD (AG News) gets its own task framing.
INSTR_QUERY = "Represent this research passage for retrieval: "
INSTR_CANDIDATE = "Represent this research passage: "
INSTR_NEWS = "Represent this news passage for classification: "

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


def chunk_corpus_docs(docs: list[dict]) -> tuple[list[tuple[str, str]], list[frozenset]]:
    """Chunk docs at CORPUS_CHUNK_TOKENS and precompute jaccard token sets for each chunk."""
    chunked: list[tuple[str, str]] = []  # (doc_id, text)
    for d in docs:
        for c in chunk_text(d["id"], d["text"], max_tokens=CORPUS_CHUNK_TOKENS, strategy="auto"):
            chunked.append((d["id"], c.text))
    token_sets = [frozenset(t.lower().split()) for _, t in chunked]
    return chunked, token_sets


def build_corpus_pairs(chunked: list[tuple[str, str]], token_sets: list[frozenset],
                        max_pairs: int) -> list[dict]:
    """Adjacent-chunk positive + single hardest-jaccard negative.

    Same pair-building approach as rag_chunk_ablation.build_pairs. Each pair also carries
    anchor_idx (the anchor's position in `chunked`) so RT-404's pool builder can rank the
    same jaccard scores over the top-K hardest negatives instead of just the single hardest.
    """
    pairs = []
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
        pairs.append({"anchor_idx": i, "anchor": text_i, "positive": text_j, "negative": chunked[best][1]})
        if len(pairs) >= max_pairs:
            break
    return pairs


def build_hard_neg_pool(chunked: list[tuple[str, str]], token_sets: list[frozenset],
                         anchor_idx: int, positive_text: str, k: int, rng: random.Random) -> list[str]:
    """RT-404: top-K hardest (highest-jaccard) non-positive chunks for one anchor.

    Prefers cross-doc candidates (same jaccard scoring as build_corpus_pairs). If the corpus
    doesn't have K distinct cross-doc candidates, fills the remaining slots with a seeded
    random sample from any other non-positive chunk (including same-doc) so --smoke corpora
    still produce a full-size pool.
    """
    doc_i = chunked[anchor_idx][0]
    anchor_toks = token_sets[anchor_idx]
    scored = []
    for idx, toks in enumerate(token_sets):
        if idx == anchor_idx or chunked[idx][0] == doc_i:
            continue
        text = chunked[idx][1]
        if text == positive_text:
            continue
        union = len(anchor_toks | toks)
        s = (len(anchor_toks & toks) / union) if union else 0.0
        scored.append((s, idx))
    scored.sort(key=lambda x: (-x[0], x[1]))
    chosen = [idx for _, idx in scored[:k]]
    if len(chosen) < k:
        chosen_set = set(chosen) | {anchor_idx}
        fallback = [idx for idx in range(len(chunked))
                    if idx not in chosen_set and chunked[idx][1] != positive_text]
        rng.shuffle(fallback)
        chosen += fallback[: k - len(chosen)]
    return [chunked[idx][1] for idx in chosen]


def _prefix(texts: list[str], prefix: str) -> list[str]:
    """AR-510: prepend an Instructor-style task instruction to each text."""
    return [prefix + t for t in texts]


def corpus_metrics_for(state_or_name, pairs: list[dict], chunked: list[tuple[str, str]],
                        token_sets: list[frozenset], pool_k: int, seed: int,
                        instructions: bool = False) -> dict:
    """Pair-based retrieval nDCG + effective rank, plus RT-404's harder pool-ranked nDCG.

    AR-510: when `instructions` is set, anchors (queries) and positives/negatives/pool
    candidates are prefixed before encoding — symmetric with the train-time prefixing applied
    to the pairs handed to train_asn. `chunked`/`token_sets` and the pair dicts themselves stay
    raw (unprefixed): they're also used for jaccard scoring and exact-text dedup in
    build_hard_neg_pool, which must keep matching on the corpus's original text.
    """
    pool_key = f"ndcg_pool{pool_k}"
    if not pairs:
        return {"ndcg_pairs": 0.0, "effRank": 0.0, pool_key: 0.0}
    anchors = [p["anchor"] for p in pairs]
    positives = [p["positive"] for p in pairs]
    negatives = [p["negative"] for p in pairs]
    if instructions:
        anchors = _prefix(anchors, INSTR_QUERY)
        positives = _prefix(positives, INSTR_CANDIDATE)
        negatives = _prefix(negatives, INSTR_CANDIDATE)
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

    # RT-404: rank the positive among a pool of pool_k hard negatives (deterministic per seed)
    rng = random.Random(seed)
    pools = [build_hard_neg_pool(chunked, token_sets, p["anchor_idx"], p["positive"], pool_k, rng)
             for p in pairs]
    uniq_negs = sorted({t for pool in pools for t in pool})
    neg_vecs = {}
    if uniq_negs:
        # Encode with the candidate prefix (if instructions is on) but key neg_vecs by the raw
        # text `t` — pools are built from raw chunk text, so lookups by pool entries still hit.
        enc_negs = _prefix(uniq_negs, INSTR_CANDIDATE) if instructions else uniq_negs
        Zneg = encode_texts(state_or_name, enc_negs)
        neg_vecs = {t: Zneg[j].tolist() for j, t in enumerate(uniq_negs)}
    pool_ndcgs = []
    for i, pool in enumerate(pools):
        candidates = [("pos", Zp[i].tolist())] + [(f"neg{j}", neg_vecs[t]) for j, t in enumerate(pool)]
        ranked = retrieval_scores(Za[i].tolist(), candidates)
        rel = [1.0 if d == "pos" else 0.0 for d, _ in ranked]
        pool_ndcgs.append(ndcg_at_k(rel, k=10))

    return {
        "ndcg_pairs": round(sum(ndcgs) / len(ndcgs), 4),
        "effRank": round(effective_rank(Za), 2),
        pool_key: round(sum(pool_ndcgs) / len(pool_ndcgs), 4) if pool_ndcgs else 0.0,
    }


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
    ap.add_argument("--instructions", action="store_true",
                     help="AR-510 (corpus mode only): prefix every text with an Instructor-style "
                          "task instruction — queries get 'Represent this research passage for "
                          "retrieval: ', candidates get 'Represent this research passage: ', and "
                          "the OOD AG News slice gets 'Represent this news passage for "
                          "classification: '. Applied symmetrically at train time and eval time "
                          "so the comparison vs plain text isolates the prefix effect on the "
                          "same backbone+method.")
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)

    methods, seeds, epochs, train_pairs_n, run_zeroshot = METHODS, SEEDS, EPOCHS, TRAIN_PAIRS, True
    if args.smoke:
        import os as _os

        # RDPIPE-002: auto-probes pick their arms via SMOKE_METHODS=a,b
        wanted = [m.strip() for m in _os.environ.get("SMOKE_METHODS", "infonce").split(",")
                  if m.strip() in METHODS]
        methods = {m: METHODS[m] for m in (wanted or ["infonce"])}
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
        pool_k = CORPUS_POOL_K_SMOKE if args.smoke else CORPUS_POOL_K_FULL
        pool_key = f"ndcg_pool{pool_k}"

        docs = load_corpus_docs(args.corpus, max_docs)
        half = max(1, len(docs) // 2)
        train_docs = docs[:half]
        eval_docs = docs[half:] or docs[:half]

        train_chunked, train_tokens = chunk_corpus_docs(train_docs)
        train_corpus_pairs = build_corpus_pairs(train_chunked, train_tokens, max_pairs)
        if not train_corpus_pairs:
            train_chunked, train_tokens = chunk_corpus_docs(docs)
            train_corpus_pairs = build_corpus_pairs(train_chunked, train_tokens, max_pairs)

        eval_chunked, eval_tokens = chunk_corpus_docs(eval_docs)
        eval_corpus_pairs = build_corpus_pairs(eval_chunked, eval_tokens, max_pairs)
        if not eval_corpus_pairs:
            eval_chunked, eval_tokens = train_chunked, train_tokens
            eval_corpus_pairs = train_corpus_pairs

        ood_texts, ood_labels = load_agnews_ood(0, ood_n)
        # AR-510: OOD (AG News) gets its own task-framing prefix, applied once up front so
        # both the zero-shot and trained loops encode the identical (prefixed) OOD text.
        ood_texts_enc = _prefix(ood_texts, INSTR_NEWS) if args.instructions else ood_texts

        # AR-510: train-time prefixing mirrors corpus_metrics_for's eval-time prefixing —
        # anchor -> query prefix, positive -> candidate prefix. train_asn only reads
        # "anchor"/"positive" off each pair dict, so this is the sole train-side hook needed;
        # train_corpus_pairs itself (and its anchor_idx/negative fields) stays raw for eval reuse.
        train_pairs_for_fit = train_corpus_pairs
        if args.instructions:
            train_pairs_for_fit = [
                {**p, "anchor": INSTR_QUERY + p["anchor"], "positive": INSTR_CANDIDATE + p["positive"]}
                for p in train_corpus_pairs
            ]

        if run_zeroshot:
            print("=== zero-shot SOTA panel (corpus mode) ===", flush=True)
            for name, hf in SOTA.items():
                try:
                    idm = corpus_metrics_for(hf, eval_corpus_pairs, eval_chunked, eval_tokens,
                                              pool_k, CORPUS_POOL_SEED, instructions=args.instructions)
                    oodm = metrics_for(encode_texts(hf, ood_texts_enc), ood_labels)
                    emit({"kind": "zeroshot", "model": name, "instructions": args.instructions,
                          "indomain": idm, "ood_knn": oodm["knn_full"]})
                except Exception as e:
                    emit({"kind": "zeroshot", "model": name, "instructions": args.instructions,
                          "error": f"{type(e).__name__}: {e}"})

        print("=== trained methods (corpus fine-tune) ===", flush=True)
        for method, extra in methods.items():
            for seed in seeds:
                recipe = {"baseModel": BACKBONE, "epochs": epochs, "batchSize": 32, "lr": 2e-5,
                          "asn": {"enabled": False}, **extra}
                ck_name = f"{method}_{seed}_corpus" + ("_instr" if args.instructions else "")
                ck = Path(train_asn(train_pairs_for_fit, recipe, ckdir / ck_name).checkpoint_path)
                idm = corpus_metrics_for(ck, eval_corpus_pairs, eval_chunked, eval_tokens,
                                          pool_k, CORPUS_POOL_SEED, instructions=args.instructions)
                oodm = metrics_for(encode_texts(ck, ood_texts_enc), ood_labels)
                emit({"kind": "trained", "method": method, "seed": seed, "instructions": args.instructions,
                      "indomain": idm, "ood_knn": oodm["knn_full"]})
                if os.environ.get("CLEAN_CKPTS") == "1":
                    # checkpoints are ~500MB each and re-derivable; metrics
                    # are already emitted — reclaim disk as we go
                    import shutil

                    shutil.rmtree(ck.parent if ck.parent != ckdir else ck, ignore_errors=True)
        fh.close()

        rows = [json.loads(l) for l in args.out.read_text().splitlines() if l.strip()]
        print("\n=== SUMMARY (corpus mode) ===")
        print(f"{'model/method':<22} {'ndcg_pairs':>10} {pool_key:>12} {'effRank':>8} {'ood_knn':>8}")
        for r in rows:
            if r.get("error"):
                print(f"{r['model']:<22}  ERROR {r['error'][:40]}")
                continue
            name = r.get("model") or f"{r['method']}(s{r['seed']})"
            m = r["indomain"]
            print(f"{name:<22} {m['ndcg_pairs']:>10} {m.get(pool_key, '—'):>12} "
                  f"{m['effRank']:>8} {r['ood_knn']:>8}")
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
