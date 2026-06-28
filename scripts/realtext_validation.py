"""Real-text validation — does VICReg-regularized training help on real retrieval?

EVIDENCE.md §3.4 showed the loss-space rank floor (VICReg) prevents collapse in a synthetic
linear regime. This is the honest next gate: does it help on REAL text, trained through the
actual production path (asn_engine.train_loop.train_asn), and how does it compare to raw
MiniLM and an open SOTA baseline (BGE-small)?

Expectation to test (not assume): InfoNCE already resists collapse on real data (§3.2 Finding
A), so VICReg may be neutral-to-small here — we report whatever happens. NO product claim is
licensed unless a VICReg-trained model beats plain InfoNCE AND is competitive with SOTA.

Data: AG News (4 topics, real news). Task: topic-retrieval — same-topic docs are relevant.
Metrics: served effective rank, kNN topic accuracy (k=10, leave-one-out), nDCG@10.

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_validation.py
Env:  N_TRAIN_DOCS, N_TEST, EPOCHS, BGE (set BGE=0 to skip the SOTA download)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))

import torch  # noqa: E402
import torch.nn.functional as F  # noqa: E402

from asn_engine.spectral import effective_rank  # noqa: E402
from asn_engine.train_loop import train_asn  # noqa: E402

SEED = 0
N_TRAIN_DOCS = int(os.getenv("N_TRAIN_DOCS", "1200"))
N_TEST = int(os.getenv("N_TEST", "800"))
N_PAIRS = int(os.getenv("N_PAIRS", "900"))
EPOCHS = int(os.getenv("EPOCHS", "2"))
BACKBONE = "sentence-transformers/all-MiniLM-L6-v2"


def load_agnews():
    from datasets import load_dataset

    torch.manual_seed(SEED)
    tr = load_dataset("fancyzhx/ag_news", split="train").shuffle(seed=SEED)
    te = load_dataset("fancyzhx/ag_news", split="test").shuffle(seed=SEED)
    train = [(tr[i]["text"], tr[i]["label"]) for i in range(N_TRAIN_DOCS)]
    test = [(te[i]["text"], te[i]["label"]) for i in range(N_TEST)]
    return train, test


def build_pairs(train) -> list[dict]:
    by_topic: dict[int, list[str]] = {}
    for text, label in train:
        by_topic.setdefault(label, []).append(text)
    g = torch.Generator().manual_seed(SEED)
    pairs = []
    topics = list(by_topic)
    while len(pairs) < N_PAIRS:
        t = topics[int(torch.randint(len(topics), (1,), generator=g))]
        docs = by_topic[t]
        i, j = torch.randint(len(docs), (2,), generator=g).tolist()
        if i != j:
            pairs.append({"anchor": docs[i], "positive": docs[j]})
    return pairs


def encode_texts(state_or_name, texts: list[str]) -> torch.Tensor:
    """Mean-pooled embeddings (the served path). Accepts a trained checkpoint path or a HF name."""
    from transformers import AutoModel, AutoTokenizer
    from asn_engine.model import ASNEncoder, mean_pool

    if isinstance(state_or_name, Path):  # trained ASN checkpoint
        state = torch.load(state_or_name, map_location="cpu", weights_only=False)
        enc = ASNEncoder(backbone_name=state["recipe"].get("baseModel", BACKBONE))
        enc.load_state_dict(state["model"])
        enc.eval()
        tok = AutoTokenizer.from_pretrained(state["recipe"].get("baseModel", BACKBONE))
        encode = lambda ii, am: enc.encode(ii, am)
    else:  # raw HF model (raw MiniLM or BGE)
        tok = AutoTokenizer.from_pretrained(state_or_name)
        model = AutoModel.from_pretrained(state_or_name).eval()
        encode = lambda ii, am: mean_pool(model(input_ids=ii, attention_mask=am).last_hidden_state, am)

    vecs = []
    with torch.no_grad():
        for k in range(0, len(texts), 32):
            b = tok(texts[k:k + 32], padding=True, truncation=True, max_length=128, return_tensors="pt")
            vecs.append(encode(b["input_ids"], b["attention_mask"]))
    return torch.cat(vecs, dim=0)


def ndcg_at_k(rels: list[float], k: int = 10) -> float:
    import math
    dcg = sum(r / math.log2(i + 2) for i, r in enumerate(rels[:k]))
    ideal = sorted(rels, reverse=True)[:k]
    idcg = sum(r / math.log2(i + 2) for i, r in enumerate(ideal))
    return dcg / idcg if idcg > 0 else 0.0


def evaluate(Z: torch.Tensor, labels: list[int]) -> dict:
    er = effective_rank(Z)
    Zn = F.normalize(Z, dim=-1)
    sim = Zn @ Zn.T
    y = torch.tensor(labels)
    n = len(labels)
    sim.fill_diagonal_(-1e9)
    # kNN topic accuracy (k=10)
    knn = sim.topk(10, dim=-1).indices
    pred = torch.mode(y[knn], dim=-1).values
    acc = float((pred == y).float().mean())
    # nDCG@10 with same-topic relevance
    ndcgs = []
    order = sim.argsort(dim=-1, descending=True)
    for i in range(n):
        rels = (y[order[i]] == y[i]).float().tolist()
        ndcgs.append(ndcg_at_k(rels, 10))
    return {"effRank": er, "knnAcc": acc, "ndcg10": sum(ndcgs) / n}


def main() -> int:
    train, test = load_agnews()
    test_texts = [t for t, _ in test]
    test_labels = [l for _, l in test]
    pairs = build_pairs(train)
    print(f"real-text validation: AG News, {len(pairs)} train pairs, {len(test)} test docs, "
          f"4 topics, epochs={EPOCHS}, backbone=MiniLM-L6\n")

    out = REPO / "data" / "realtext_validation"
    common = {"baseModel": BACKBONE, "epochs": EPOCHS, "batchSize": 32, "lr": 2e-5,
              "asn": {"enabled": False}}  # no weight surgery (rejected, EVIDENCE §3.2)
    infonce_recipe = {**common, "loss": {"infoNceTemp": 0.05}}
    vicreg_recipe = {**common, "loss": {"infoNceTemp": 0.05, "vicregVar": 1.0, "vicregCov": 0.04}}

    print("  training InfoNCE arm ...", flush=True)
    ck_infonce = Path(train_asn(pairs, infonce_recipe, out / "infonce").checkpoint_path)
    print("  training InfoNCE+VICReg arm ...", flush=True)
    ck_vicreg = Path(train_asn(pairs, vicreg_recipe, out / "vicreg").checkpoint_path)

    rows = []
    print("  encoding + scoring (raw MiniLM) ...", flush=True)
    rows.append(("raw MiniLM (untrained)", evaluate(encode_texts(BACKBONE, test_texts), test_labels)))
    print("  encoding + scoring (InfoNCE) ...", flush=True)
    rows.append(("MiniLM + InfoNCE", evaluate(encode_texts(ck_infonce, test_texts), test_labels)))
    print("  encoding + scoring (InfoNCE+VICReg) ...", flush=True)
    rows.append(("MiniLM + InfoNCE + VICReg", evaluate(encode_texts(ck_vicreg, test_texts), test_labels)))
    if os.getenv("BGE", "1") == "1":
        try:
            print("  encoding + scoring (BGE-small SOTA) ...", flush=True)
            rows.append(("BGE-small-en-v1.5 (SOTA ref)",
                         evaluate(encode_texts("BAAI/bge-small-en-v1.5", test_texts), test_labels)))
        except Exception as e:
            print(f"  (BGE skipped: {type(e).__name__})")

    print("\n  model                          effRank   kNN acc   nDCG@10")
    for name, m in rows:
        print(f"  {name:<30} {m['effRank']:7.2f}   {m['knnAcc']:.3f}     {m['ndcg10']:.4f}")

    by = {n: m for n, m in rows}
    inf, vic = by["MiniLM + InfoNCE"], by["MiniLM + InfoNCE + VICReg"]
    d_rank = vic["effRank"] - inf["effRank"]
    d_knn = vic["knnAcc"] - inf["knnAcc"]
    d_ndcg = vic["ndcg10"] - inf["ndcg10"]
    print(f"\n  VICReg vs InfoNCE: dRank={d_rank:+.2f}  dKNN={d_knn:+.3f}  dNDCG={d_ndcg:+.4f}")
    helps = (d_knn >= 0.005 or d_ndcg >= 0.005) and d_rank >= -0.5
    neutral = abs(d_knn) < 0.005 and abs(d_ndcg) < 0.005
    if helps:
        print("  VERDICT: VICReg HELPS on real text (quality up, rank not hurt).")
    elif neutral:
        print("  VERDICT: VICReg ~NEUTRAL on real text (InfoNCE already resists collapse; "
              "no measurable retrieval benefit). Honest result.")
    else:
        print("  VERDICT: VICReg HURTS on real text here. Honest negative; record it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
