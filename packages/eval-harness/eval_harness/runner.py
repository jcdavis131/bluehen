"""Run eval on a checkpoint + contrastive pairs."""

from __future__ import annotations

from pathlib import Path

import torch

from asn_engine.spectral import effective_rank
from eval_harness.gates import MRL_TRUNCATE_DIMS, compute_gates
from eval_harness.metrics import ndcg_at_k, retrieval_scores


def evaluate_checkpoint(
    checkpoint_path: Path,
    pairs: list[dict],
    *,
    eval_slice: str = "rotating",
    baseline_rank: float = 8.0,
    preloaded: tuple | None = None,
) -> dict:
    """``preloaded=(encoder, tokenizer, use_head)`` skips checkpoint loading —
    1 GB containers cannot afford a second resident model, so the caller
    shares its serving cache."""
    from asn_engine.model import load_checkpoint_encoder
    from transformers import AutoTokenizer

    if preloaded is not None:
        encoder, tok, use_head = preloaded
    else:
        state = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
        recipe = state.get("recipe", {})
        backbone = state.get("backboneName") or recipe.get(
            "baseModel", "sentence-transformers/all-MiniLM-L6-v2"
        )
        # Eval measures the SERVED representation: head output for head-only
        # checkpoints, encoder Z1 otherwise — gates must grade what ships.
        encoder, use_head = load_checkpoint_encoder(state)
        tok = AutoTokenizer.from_pretrained(backbone)

    ndcg_scores: list[float] = []
    ndcg_trunc_scores: list[float] = []
    anchor_vecs: list[torch.Tensor] = []

    with torch.no_grad():
        def encode(text: str) -> list[float]:
            batch = tok(text, return_tensors="pt", truncation=True, max_length=256, padding=True)
            vec = encoder.encode(batch["input_ids"], batch["attention_mask"], use_head=use_head)[0]
            return vec.cpu().tolist()

        for i, pair in enumerate(pairs[: min(32, len(pairs))]):
            anchor = pair["anchor"]
            positive = pair["positive"]
            negative = pair.get("negative") or pair["anchor"]

            q = encode(anchor)
            pos_id = f"pos-{i}"
            neg_id = f"neg-{i}"
            ranked = retrieval_scores(
                q,
                [(pos_id, encode(positive)), (neg_id, encode(negative))],
            )
            rel = [1.0 if doc_id == pos_id else 0.0 for doc_id, _ in ranked]
            ndcg_scores.append(ndcg_at_k(rel, k=2))

            # Matryoshka: re-rank using only the first MRL_TRUNCATE_DIMS of each
            # vector. A sellable org model must keep retrieving after truncation.
            qt = q[:MRL_TRUNCATE_DIMS]
            ranked_t = retrieval_scores(
                qt,
                [
                    (pos_id, encode(positive)[:MRL_TRUNCATE_DIMS]),
                    (neg_id, encode(negative)[:MRL_TRUNCATE_DIMS]),
                ],
            )
            rel_t = [1.0 if doc_id == pos_id else 0.0 for doc_id, _ in ranked_t]
            ndcg_trunc_scores.append(ndcg_at_k(rel_t, k=2))

            batch = tok(anchor, return_tensors="pt", truncation=True, max_length=256)
            anchor_vecs.append(encoder.encode(batch["input_ids"], batch["attention_mask"], use_head=use_head)[0])

        if anchor_vecs:
            z = torch.stack(anchor_vecs)
            er = effective_rank(z)
        else:
            er = 0.0

    ndcg = sum(ndcg_scores) / len(ndcg_scores) if ndcg_scores else 0.0
    ndcg_trunc = sum(ndcg_trunc_scores) / len(ndcg_trunc_scores) if ndcg_trunc_scores else 0.0
    gates = compute_gates(
        effective_rank=er,
        ndcg10=ndcg,
        baseline_rank=baseline_rank,
        mrl_knn_full=ndcg,
        mrl_knn_truncated=ndcg_trunc,
    )
    all_passed = all(v is True for v in gates.values())

    return {
        "slice": eval_slice,
        "ndcg10": round(ndcg, 4),
        "effectiveRank": round(float(er), 4),
        "mrlKnnFull": round(ndcg, 4),
        "mrlKnnTruncated": round(ndcg_trunc, 4),
        "gates": gates,
        "allPassed": all_passed,
    }
