#!/usr/bin/env python3
"""Commercial baseline vs domain-tuned InfoNCE on Phase A tenant corpora.

EVIDENCE.md §3.6: in-domain fine-tune beat zero-shot BGE on AG News. This script asks the
same question on each org's own corpus (hub, benchmark-lab, etc.) using the eval-harness
pairwise proxy.

Run:
  uv run python scripts/tenant_baseline.py --site hub --epochs 10
  uv run python scripts/tenant_baseline.py --all-sites --epochs 10
"""

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
from asn_engine.model import ASNEncoder, mean_pool
from asn_engine.spectral import effective_rank
from asn_engine.train_loop import train_asn_with_seed
from eval_harness.metrics import ndcg_at_k, retrieval_scores
from transformers import AutoModel, AutoTokenizer

PHASE_A_SITES = ("storefront", "validation", "research", "dumbmodel")
BACKBONE = "sentence-transformers/all-MiniLM-L6-v2"
BGE = "BAAI/bge-small-en-v1.5"
DEFAULT_SEED = 42


def _synth_pairs(corpus_path: Path, n: int = 128) -> list[dict]:
    docs: list[dict] = []
    with corpus_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                docs.append(json.loads(line))
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


def _infonce_recipe(epochs: int) -> dict:
    return {
        "baseModel": BACKBONE,
        "epochs": epochs,
        "batchSize": 8,
        "lr": 2e-5,
        "loss": {"infoNceTemp": 0.07},
        "asn": {"enabled": False},
    }


def _encode_hf(name: str, texts: list[str]) -> torch.Tensor:
    tok = AutoTokenizer.from_pretrained(name)
    model = AutoModel.from_pretrained(name).eval()
    vecs: list[torch.Tensor] = []
    with torch.no_grad():
        for k in range(0, len(texts), 16):
            b = tok(texts[k : k + 16], padding=True, truncation=True, max_length=256, return_tensors="pt")
            out = model(**b)
            vecs.append(mean_pool(out.last_hidden_state, b["attention_mask"]))
    return torch.cat(vecs, dim=0)


def _encode_checkpoint(path: Path, texts: list[str]) -> torch.Tensor:
    state = torch.load(path, map_location="cpu", weights_only=False)
    backbone = state.get("recipe", {}).get("baseModel", BACKBONE)
    enc = ASNEncoder(backbone_name=backbone)
    enc.load_state_dict(state["model"])
    enc.eval()
    tok = AutoTokenizer.from_pretrained(backbone)
    vecs: list[torch.Tensor] = []
    with torch.no_grad():
        for k in range(0, len(texts), 16):
            b = tok(texts[k : k + 16], padding=True, truncation=True, max_length=256, return_tensors="pt")
            vecs.append(enc.encode(b["input_ids"], b["attention_mask"]))
    return torch.cat(vecs, dim=0)


def _pairwise_ndcg(encoder_fn, pairs: list[dict], *, limit: int = 32) -> tuple[float, float]:
    ndcg_scores: list[float] = []
    anchor_vecs: list[torch.Tensor] = []
    for i, pair in enumerate(pairs[:limit]):
        anchor, positive = pair["anchor"], pair["positive"]
        negative = pair.get("negative") or anchor
        q = encoder_fn(anchor)
        pos_id, neg_id = f"pos-{i}", f"neg-{i}"
        ranked = retrieval_scores(q, [(pos_id, encoder_fn(positive)), (neg_id, encoder_fn(negative))])
        rel = [1.0 if doc_id == pos_id else 0.0 for doc_id, _ in ranked]
        ndcg_scores.append(ndcg_at_k(rel, k=2))
        anchor_vecs.append(torch.tensor(q))
    er = effective_rank(torch.stack(anchor_vecs)) if anchor_vecs else 0.0
    ndcg = sum(ndcg_scores) / len(ndcg_scores) if ndcg_scores else 0.0
    return ndcg, float(er)


def _eval_checkpoint(path: Path, pairs: list[dict]) -> dict:
    state = torch.load(path, map_location="cpu", weights_only=False)
    backbone = state.get("recipe", {}).get("baseModel", BACKBONE)
    enc = ASNEncoder(backbone_name=backbone)
    enc.load_state_dict(state["model"])
    enc.eval()
    tok = AutoTokenizer.from_pretrained(backbone)

    def encode_text(text: str) -> list[float]:
        with torch.no_grad():
            b = tok(text, return_tensors="pt", truncation=True, max_length=256, padding=True)
            return enc.encode(b["input_ids"], b["attention_mask"])[0].cpu().tolist()

    ndcg, er = _pairwise_ndcg(encode_text, pairs)
    return {"ndcg10": round(ndcg, 4), "effectiveRank": round(er, 4)}


def _eval_hf(name: str, pairs: list[dict]) -> dict:
    tok = AutoTokenizer.from_pretrained(name)
    model = AutoModel.from_pretrained(name).eval()

    def encode_text(text: str) -> list[float]:
        with torch.no_grad():
            b = tok(text, return_tensors="pt", truncation=True, max_length=256, padding=True)
            out = model(**b)
            return mean_pool(out.last_hidden_state, b["attention_mask"])[0].cpu().tolist()

    ndcg, er = _pairwise_ndcg(encode_text, pairs)
    return {"ndcg10": round(ndcg, 4), "effectiveRank": round(er, 4)}


def run_site(*, site_id: str, epochs: int, pairs_n: int, seed: int) -> dict:
    corpus = ROOT / "data" / "corpora" / site_id / "corpus.jsonl"
    if not corpus.exists():
        return {"skipped": True, "reason": f"no corpus at {corpus}"}

    random.seed(seed)
    pairs = _synth_pairs(corpus, n=pairs_n)
    out_dir = ROOT / "data" / "evidence" / "tenant_baseline" / site_id
    out_dir.mkdir(parents=True, exist_ok=True)

    ckpt = out_dir / "infonce"
    train_out = train_asn_with_seed(pairs, _infonce_recipe(epochs), ckpt, seed=seed)
    ckpt_path = Path(train_out.checkpoint_path)

    raw = _eval_hf(BACKBONE, pairs)
    bge = _eval_hf(BGE, pairs)
    tuned = _eval_checkpoint(ckpt_path, pairs)
    return {
        "siteId": site_id,
        "epochs": epochs,
        "pairs": pairs_n,
        "rawMiniLM": raw,
        "bgeZeroShot": bge,
        "infoNceTuned": tuned,
        "deltaTunedVsBge": {
            "dNdcg": round(tuned["ndcg10"] - bge["ndcg10"], 4),
            "dRank": round(tuned["effectiveRank"] - bge["effectiveRank"], 4),
        },
        "tunedBeatsBge": tuned["ndcg10"] > bge["ndcg10"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Tenant corpus vs commercial baseline")
    parser.add_argument("--site", default="storefront")
    parser.add_argument("--all-sites", action="store_true")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--pairs", type=int, default=128)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    sites = list(PHASE_A_SITES) if args.all_sites else [args.site]
    payload = {
        "collectedAt": datetime.now(timezone.utc).isoformat(),
        "backbone": BACKBONE,
        "commercialBaseline": BGE,
        "bySite": {s: run_site(site_id=s, epochs=args.epochs, pairs_n=args.pairs, seed=args.seed) for s in sites},
    }
    beats = sum(1 for s in sites if payload["bySite"][s].get("tunedBeatsBge"))
    payload["tunedBeatsBgeSites"] = beats
    payload["tunedBeatsBgeAll"] = beats == len(sites)

    out_dir = ROOT / "data" / "evidence"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "tenant_baseline.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(f"\nWrote {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
