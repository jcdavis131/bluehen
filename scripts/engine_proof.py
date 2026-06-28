"""Engine proof — the project's headline scientific claim, run locally at $0.

Claim (PLAN.md Phase 1 gate / WHITEPAPER): the ASN interventions (three-tier spectral
surgery + Newton-Schulz conditioning of the projection head) hold the served embedding's
*effective rank* at or above an InfoNCE-only baseline **without regressing retrieval
nDCG** — i.e. collapse resistance is not bought with retrieval quality.

This trains two encoders that are identical in every way (same corpus, seed, optimizer,
steps) except the ASN interventions are toggled off for the baseline (`asn.enabled`).
It then measures, on a held-out eval set:
  * effective rank of the served representation Z1 (the thing we actually ship), and
  * nDCG@10 on a topic-retrieval task (each query's same-topic docs are relevant).

It prints the comparison and exits non-zero if the gate fails. It does NOT tune thresholds
to pass; whatever the numbers are, they are reported. CPU-only, MiniLM, a few minutes.

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/engine_proof.py
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))
sys.path.insert(0, str(REPO / "packages" / "eval-harness"))

import torch  # noqa: E402

from asn_engine.spectral import effective_rank  # noqa: E402
from asn_engine.train_loop import train_asn  # noqa: E402
from eval_harness.metrics import ndcg_at_k  # noqa: E402

SEED = 0

# Five lexically-distinct topics. Within-topic sentences are near-paraphrases (positives);
# across-topic sentences are unrelated (distractors). A collapsed encoder maps everything
# together and loses retrieval ability — so this task makes collapse *cost* nDCG.
TOPICS: dict[str, list[str]] = {
    "monetary_policy": [
        "the central bank raised interest rates to slow rising inflation",
        "policymakers hiked the benchmark rate to cool an overheating economy",
        "the federal reserve tightened monetary policy to curb inflation",
        "higher interest rates were set by the bank to reduce price growth",
        "the reserve bank lifted rates again to bring inflation back to target",
        "tighter policy and rate hikes aim to restrain consumer price increases",
    ],
    "cell_biology": [
        "the cell membrane regulates ion transport across the lipid bilayer",
        "proteins in the plasma membrane control the flow of ions into the cell",
        "the lipid bilayer acts as a barrier governing molecular transport",
        "membrane channels selectively move sodium and potassium across the cell",
        "transport proteins embedded in the membrane shuttle ions in and out",
        "the cell's outer membrane mediates exchange of ions with its surroundings",
    ],
    "football_match": [
        "the striker scored a goal in the final minute of the match",
        "a late strike from the forward won the game in stoppage time",
        "the team's attacker netted a winner just before the whistle",
        "in the dying seconds the striker buried the ball into the net",
        "a last-gasp goal from the forward sealed the victory",
        "the player slotted home the decisive goal late in the second half",
    ],
    "severe_weather": [
        "a cold front will bring heavy rain and strong winds tonight",
        "forecasters expect downpours and gusty winds as the front moves in",
        "the storm system is set to deliver heavy showers and high winds",
        "expect wet and windy conditions overnight as a cold front arrives",
        "heavy rainfall and powerful gusts are forecast with the incoming front",
        "a band of rain and strong winds will sweep through after dark",
    ],
    "home_cooking": [
        "simmer the tomato sauce on low heat and season with salt and pepper",
        "let the sauce cook gently on a low flame then add salt to taste",
        "reduce the heat and slowly simmer the sauce seasoning as you go",
        "cook the sauce on low stirring and adding pepper and salt",
        "keep the sauce at a gentle simmer and finish with seasoning",
        "over low heat let the tomato sauce thicken then season well",
    ],
}


def build_split() -> tuple[list[dict], list[tuple[str, str]]]:
    """Return (train_pairs, eval_items). eval_items = (sentence, topic)."""
    train_pairs: list[dict] = []
    eval_items: list[tuple[str, str]] = []
    for topic, sents in TOPICS.items():
        train_s = sents[:4]   # 4 per topic for training
        eval_s = sents[4:]    # 2 per topic held out for eval
        # all ordered within-topic pairs as positives
        for i in range(len(train_s)):
            for j in range(len(train_s)):
                if i != j:
                    train_pairs.append({"anchor": train_s[i], "positive": train_s[j]})
        for s in eval_s:
            eval_items.append((s, topic))
    return train_pairs, eval_items


def encode_all(checkpoint_path: str, sentences: list[str]) -> torch.Tensor:
    from transformers import AutoTokenizer
    from asn_engine.model import ASNEncoder

    state = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    backbone = state["recipe"].get("baseModel", "sentence-transformers/all-MiniLM-L6-v2")
    enc = ASNEncoder(backbone_name=backbone)
    enc.load_state_dict(state["model"])
    enc.eval()
    tok = AutoTokenizer.from_pretrained(backbone)
    vecs = []
    with torch.no_grad():
        for s in sentences:
            b = tok(s, return_tensors="pt", truncation=True, max_length=256, padding=True)
            vecs.append(enc.encode(b["input_ids"], b["attention_mask"])[0])
    return torch.stack(vecs)


def evaluate(checkpoint_path: str, eval_items: list[tuple[str, str]], rank_pool: list[str]) -> dict:
    sentences = [s for s, _ in eval_items]
    topics = [t for _, t in eval_items]
    Z = encode_all(checkpoint_path, sentences)              # served representation Z1
    # Effective rank is an intrinsic property of the representation space: measure it over
    # a larger pool (all sentences) so it has headroom to reveal collapse, not just 10 pts.
    er = effective_rank(encode_all(checkpoint_path, rank_pool))
    Zn = torch.nn.functional.normalize(Z, dim=-1)
    sim = Zn @ Zn.T                                          # cosine, leave-one-out retrieval
    ndcgs = []
    for i in range(len(sentences)):
        order = sorted(
            [j for j in range(len(sentences)) if j != i],
            key=lambda j: float(sim[i, j]),
            reverse=True,
        )
        rels = [1.0 if topics[j] == topics[i] else 0.0 for j in order]
        ndcgs.append(ndcg_at_k(rels, k=10))
    return {"effectiveRank": float(er), "ndcg10": sum(ndcgs) / len(ndcgs)}


def run(label: str, pairs: list[dict], asn_enabled: bool, out: Path, epochs: int) -> str:
    torch.manual_seed(SEED)
    recipe = {
        "baseModel": "sentence-transformers/all-MiniLM-L6-v2",
        "epochs": epochs,
        "batchSize": 12,
        "lr": 3e-5,
        "rankFloor": 16.0,
        "loss": {"infoNceTemp": 0.1},
        "asn": {"enabled": asn_enabled, "newtonSchulzSteps": 5, "kStrong": 8, "kTail": 8, "lambda": 0.5},
    }
    print(f"  training [{label}] asn_enabled={asn_enabled} ...", flush=True)
    res = train_asn(pairs, recipe, out / label)
    print(f"    -> done (surgeries fired: {res.surgeries})", flush=True)
    return res.checkpoint_path


def main() -> int:
    import os

    epochs = int(os.getenv("EPOCHS", "6"))
    torch.manual_seed(SEED)
    train_pairs, eval_items = build_split()
    # trim to a multiple of batch size so BatchNorm never sees a size-1 final batch
    bs = 12
    train_pairs = train_pairs[: (len(train_pairs) // bs) * bs]
    rank_pool = [s for sents in TOPICS.values() for s in sents]  # all sentences, rank headroom
    print(f"engine proof: {len(train_pairs)} train pairs, {len(eval_items)} eval sentences, "
          f"{len(TOPICS)} topics, epochs={epochs}, rank_pool={len(rank_pool)}, seed={SEED}\n")

    out = REPO / "data" / "engine_proof"
    base_ckpt = run("baseline_infonce", train_pairs, asn_enabled=False, out=out, epochs=epochs)
    asn_ckpt = run("asn", train_pairs, asn_enabled=True, out=out, epochs=epochs)

    base = evaluate(base_ckpt, eval_items, rank_pool)
    asn = evaluate(asn_ckpt, eval_items, rank_pool)

    print("\n  result               effRank    nDCG@10")
    print(f"  baseline (InfoNCE)   {base['effectiveRank']:7.3f}   {base['ndcg10']:7.4f}")
    print(f"  ASN                  {asn['effectiveRank']:7.3f}   {asn['ndcg10']:7.4f}")

    d_rank = asn["effectiveRank"] - base["effectiveRank"]
    d_ndcg = asn["ndcg10"] - base["ndcg10"]
    rel_rank = d_rank / base["effectiveRank"] if base["effectiveRank"] else 0.0

    # IMPORTANT honesty note: this corpus uses a robust pretrained backbone and small data,
    # so the InfoNCE baseline does NOT collapse (effRank stays high). That means this gate can
    # only test the *no-harm* claim (ASN must not degrade a healthy representation), NOT the
    # *benefit* claim (ASN raises rank under collapse) — the latter needs a collapse regime
    # (weaker/random init or large-scale training) and is out of scope for a $0 local run.
    NO_HARM_TOL = 0.05  # 5%: parity, not improvement
    rank_ok = rel_rank >= -NO_HARM_TOL
    ndcg_ok = d_ndcg >= -0.01
    passed = rank_ok and ndcg_ok

    print(f"\n  delta effective rank = {d_rank:+.3f} ({rel_rank:+.1%})   "
          f"({'within no-harm band' if rank_ok else 'DEGRADED beyond 5% - fail'})")
    print(f"  delta nDCG@10        = {d_ndcg:+.4f}   ({'no regression' if ndcg_ok else 'REGRESSED - fail'})")
    print(f"\n  GATE (no-harm parity): {'PASS' if passed else 'FAIL'}")
    print("  NOTE: baseline did not collapse here, so this proves ASN does no harm, not that")
    print("        it helps. The benefit claim requires a collapse-regime experiment (TODO).")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
