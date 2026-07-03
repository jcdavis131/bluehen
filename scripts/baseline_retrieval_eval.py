"""Baseline retrieval eval on the production pair set.

Measures nDCG@10 and effective rank for reference embedders (BGE-small,
raw MiniLM) on the SAME pairs and the SAME scoring code the prod worker
uses, so EVIDENCE.md rows compare like with like.

Usage:
    uv run python scripts/baseline_retrieval_eval.py [--pairs data/eval/research_prod_pairs.json]

Provenance note: baselines run locally (prod's 1 GB container cannot hold
a second model); the trained model's numbers come from the prod eval run.
Same pair set, same metric code — different host. Recorded as such.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "eval-harness"))

import torch  # noqa: E402

from asn_engine.spectral import effective_rank  # noqa: E402
from eval_harness.metrics import ndcg_at_k, retrieval_scores  # noqa: E402


def eval_model(model_name: str, pairs: list[dict], max_pairs: int = 32) -> dict:
    from transformers import AutoModel, AutoTokenizer

    from asn_engine.model import mean_pool

    tok = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    model.eval()

    @torch.no_grad()
    def encode(text: str) -> torch.Tensor:
        batch = tok(text, return_tensors="pt", truncation=True, max_length=256, padding=True)
        out = model(input_ids=batch["input_ids"], attention_mask=batch["attention_mask"])
        return mean_pool(out.last_hidden_state, batch["attention_mask"])[0]

    ndcg_scores: list[float] = []
    anchor_vecs: list[torch.Tensor] = []
    subset = pairs[: min(max_pairs, len(pairs))]
    for i, pair in enumerate(subset):
        q_t = encode(pair["anchor"])
        q = q_t.tolist()
        pos_id, neg_id = f"pos-{i}", f"neg-{i}"
        negative = pair.get("negative") or pair["anchor"]
        # identical computation to eval_harness.runner.evaluate_checkpoint
        ranked = retrieval_scores(
            q,
            [(pos_id, encode(pair["positive"]).tolist()), (neg_id, encode(negative).tolist())],
        )
        rel = [1.0 if doc_id == pos_id else 0.0 for doc_id, _ in ranked]
        ndcg_scores.append(ndcg_at_k(rel, k=2))
        anchor_vecs.append(q_t)

    er = effective_rank(torch.stack(anchor_vecs))
    return {
        "model": model_name,
        "pairsEvaluated": len(subset),
        "ndcg10": round(sum(ndcg_scores) / max(1, len(ndcg_scores)), 4),
        "effectiveRank": round(er, 2),
        "dims": anchor_vecs[0].shape[-1],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", default="data/eval/research_prod_pairs.json")
    ap.add_argument(
        "--models",
        nargs="*",
        default=["BAAI/bge-small-en-v1.5", "sentence-transformers/all-MiniLM-L6-v2"],
    )
    args = ap.parse_args()
    pairs = json.loads(Path(args.pairs).read_text(encoding="utf-8"))
    print(f"pair set: {args.pairs} ({len(pairs)} pairs; evaluating first 32 — same slice as prod eval)")
    results = [eval_model(m, pairs) for m in args.models]
    print(json.dumps(results, indent=2))
    out = Path("data/eval/baseline_results.json")
    out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"saved -> {out}")


if __name__ == "__main__":
    main()
