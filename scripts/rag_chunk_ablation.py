"""RAG chunk-size/strategy ablation (RAG-502, Spec 0008).

Ablates chunking configurations on a real corpus and measures retrieval
quality with a fixed encoder (raw MiniLM — the ablation isolates
CHUNKING, so the encoder must be constant) using the same metric code as
the prod eval (retrieval_scores + ndcg_at_k).

Protocol per arm: chunk the corpus -> build (anchor=chunk_i,
positive=next chunk same doc, hard-jaccard negative) pairs -> embed ->
nDCG@k over pos/neg ranking + effective rank of the anchor space.

Usage:
  uv run python scripts/rag_chunk_ablation.py [--corpus data/corpora/research/corpus.jsonl] [--max-docs 40]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "eval-harness"))
sys.path.insert(0, str(ROOT / "packages" / "datalab"))

import torch  # noqa: E402

from asn_engine.model import mean_pool  # noqa: E402
from asn_engine.spectral import effective_rank  # noqa: E402
from datalab.chunk import chunk_text  # noqa: E402
from eval_harness.metrics import ndcg_at_k, retrieval_scores  # noqa: E402

ARMS = [
    {"name": "sentence-128", "max_tokens": 128},
    {"name": "sentence-256", "max_tokens": 256},
    {"name": "sentence-512", "max_tokens": 512},
]
MAX_PAIRS = 32


def load_docs(corpus: Path, max_docs: int) -> list[dict]:
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


def build_pairs(docs: list[dict], max_tokens: int) -> list[dict]:
    chunked: list[tuple[str, str]] = []  # (doc_id, text)
    for d in docs:
        for c in chunk_text(d["id"], d["text"], max_tokens=max_tokens, strategy="auto"):
            chunked.append((d["id"], c.text))
    pairs = []
    token_sets = [frozenset(t.lower().split()) for _, t in chunked]
    for i in range(len(chunked) - 1):
        doc_i, text_i = chunked[i]
        doc_j, text_j = chunked[i + 1]
        if doc_i != doc_j:
            continue
        # hard-jaccard negative from a DIFFERENT doc
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
        if len(pairs) >= MAX_PAIRS:
            break
    return pairs


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default="data/corpora/research/corpus.jsonl")
    ap.add_argument("--max-docs", type=int, default=40)
    args = ap.parse_args()

    from transformers import AutoModel, AutoTokenizer

    name = "sentence-transformers/all-MiniLM-L6-v2"
    tok = AutoTokenizer.from_pretrained(name)
    model = AutoModel.from_pretrained(name)
    model.eval()

    @torch.no_grad()
    def encode(text: str) -> torch.Tensor:
        b = tok(text, return_tensors="pt", truncation=True, max_length=256, padding=True)
        out = model(input_ids=b["input_ids"], attention_mask=b["attention_mask"])
        return mean_pool(out.last_hidden_state, b["attention_mask"])[0]

    docs = load_docs(Path(args.corpus), args.max_docs)
    print(f"corpus: {args.corpus} · {len(docs)} docs · encoder fixed: raw MiniLM")
    results = []
    for arm in ARMS:
        pairs = build_pairs(docs, arm["max_tokens"])
        if len(pairs) < 8:
            results.append({"arm": arm["name"], "skipped": f"only {len(pairs)} pairs"})
            continue
        ndcgs, anchors = [], []
        for i, p in enumerate(pairs):
            q = encode(p["anchor"])
            ranked = retrieval_scores(q.tolist(), [
                (f"pos-{i}", encode(p["positive"]).tolist()),
                (f"neg-{i}", encode(p["negative"]).tolist()),
            ])
            rel = [1.0 if d == f"pos-{i}" else 0.0 for d, _ in ranked]
            ndcgs.append(ndcg_at_k(rel, k=2))
            anchors.append(q)
        results.append({
            "arm": arm["name"],
            "pairs": len(pairs),
            "ndcg10": round(sum(ndcgs) / len(ndcgs), 4),
            "effectiveRank": round(effective_rank(torch.stack(anchors)), 2),
        })
        print(f"  {arm['name']}: ndcg={results[-1]['ndcg10']} er={results[-1]['effectiveRank']} ({len(pairs)} pairs, hard negatives)")

    out = Path("data/eval/chunk_ablation_results.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"corpus": args.corpus, "encoder": name, "arms": results}, indent=2), encoding="utf-8")
    print(f"saved -> {out}")


if __name__ == "__main__":
    main()
