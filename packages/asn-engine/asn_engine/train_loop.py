"""ASN contrastive training loop — production path for org models."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import torch
from torch import Tensor
from torch.utils.data import DataLoader, Dataset

from asn_engine.losses import info_nce
from asn_engine.model import ASNEncoder
from asn_engine.spectral import effective_rank, newton_schulz, three_tier_surgery


class PairDataset(Dataset):
    def __init__(self, pairs: list[dict]) -> None:
        self.pairs = pairs

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, idx: int) -> dict:
        return self.pairs[idx]


@dataclass
class TrainResult:
    model_version: str
    effective_rank: float
    final_loss: float
    checkpoint_path: str
    surgeries: int = 0


def _collate(batch: list[dict], tokenizer) -> tuple[Tensor, Tensor, Tensor, Tensor]:
    anchors = [b["anchor"] for b in batch]
    positives = [b["positive"] for b in batch]
    a = tokenizer(anchors, padding=True, truncation=True, max_length=256, return_tensors="pt")
    p = tokenizer(positives, padding=True, truncation=True, max_length=256, return_tensors="pt")
    return a["input_ids"], a["attention_mask"], p["input_ids"], p["attention_mask"]


def apply_spectral_surgery(encoder: ASNEncoder, asn_cfg: dict) -> None:
    """Apply three-tier surgery to the projection head weights when rank collapses."""
    w = encoder.head.net[0].weight.data
    if w.ndim != 2:
        return
    u, s, vh = torch.linalg.svd(w, full_matrices=False)
    s_adj = three_tier_surgery(
        s,
        strong_k=int(asn_cfg.get("kStrong", 8)),
        tail_k=int(asn_cfg.get("kTail", 8)),
        lam=float(asn_cfg.get("lambda", 0.5)),
    )
    encoder.head.net[0].weight.data = u @ torch.diag(s_adj) @ vh


def train_asn(
    pairs: list[dict],
    recipe: dict,
    checkpoint_dir: Path,
    *,
    progress: Callable[[dict], None] | None = None,
) -> TrainResult:
    from transformers import AutoTokenizer

    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    backbone = recipe.get("baseModel", "sentence-transformers/all-MiniLM-L6-v2")
    epochs = int(recipe.get("epochs", 3))
    batch_size = min(int(recipe.get("batchSize", 16)), max(2, len(pairs)))
    lr = float(recipe.get("lr", 2e-5))
    temp = float(recipe.get("loss", {}).get("infoNceTemp", 0.07))
    asn_cfg = recipe.get("asn", {})
    ns_steps = int(asn_cfg.get("newtonSchulzSteps", 5))
    rank_floor = float(recipe.get("rankFloor", 12.0))
    # ASN interventions (spectral surgery + Newton-Schulz conditioning) are switchable so
    # the InfoNCE-only baseline is a clean ablation (same data/seed/steps). Default on.
    asn_enabled = bool(asn_cfg.get("enabled", True))

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    encoder = ASNEncoder(backbone_name=backbone).to(device)
    tokenizer = AutoTokenizer.from_pretrained(backbone)
    opt = torch.optim.AdamW(encoder.parameters(), lr=lr)
    loader = DataLoader(PairDataset(pairs), batch_size=batch_size, shuffle=True, collate_fn=lambda items: items)

    global_step = 0
    last_loss = 0.0
    last_er = 0.0
    # Collapse detection must be measured over an accumulated window, NOT a single batch:
    # effective rank is capped by min(n_samples, dim), so a per-batch measurement (n=batch)
    # can never exceed the batch size and makes any sensible floor fire unconditionally.
    # We keep a rolling buffer of recent (detached) projector rows so the measured rank has
    # real headroom and surgery triggers only on genuine collapse.
    rank_window = int(asn_cfg.get("rankWindow", 256))
    surgery_check_every = int(asn_cfg.get("surgeryCheckEvery", 10))
    ns_every = int(asn_cfg.get("newtonSchulzEvery", 50))
    buf: list[Tensor] = []
    surgeries = 0

    for epoch in range(epochs):
        encoder.train()
        for batch in loader:
            ids_a, mask_a, ids_p, mask_p = _collate(batch, tokenizer)
            ids_a, mask_a = ids_a.to(device), mask_a.to(device)
            ids_p, mask_p = ids_p.to(device), mask_p.to(device)

            _, z_a = encoder(ids_a, mask_a)
            _, z_p = encoder(ids_p, mask_p)
            loss = info_nce(z_a, z_p, temperature=temp)

            opt.zero_grad()
            loss.backward()
            opt.step()
            last_loss = float(loss.item())
            global_step += 1

            # accumulate the rolling rank-measurement window
            with torch.no_grad():
                buf.append(z_a.detach())
                rows = sum(t.shape[0] for t in buf)
                while rows > rank_window and len(buf) > 1:
                    rows -= buf.pop(0).shape[0]

            if global_step % surgery_check_every == 0:
                with torch.no_grad():
                    window = torch.cat(buf, dim=0)
                    last_er = effective_rank(window)
                if asn_enabled:
                    # only intervene once the window is large enough to give a trustworthy
                    # rank, and only when that rank is actually below the collapse floor
                    if window.shape[0] >= min(rank_window, 64) and last_er < rank_floor:
                        apply_spectral_surgery(encoder, asn_cfg)
                        surgeries += 1
                    if ns_every > 0 and global_step % ns_every == 0:
                        w = encoder.head.net[0].weight.data
                        if w.ndim == 2:
                            encoder.head.net[0].weight.data = newton_schulz(w, steps=ns_steps)

            if progress:
                progress({"epoch": epoch, "step": global_step, "loss": last_loss,
                          "effectiveRank": last_er, "surgeries": surgeries})

    encoder.eval()
    with torch.no_grad():
        sample_texts = [p["anchor"] for p in pairs[: min(64, len(pairs))]]
        batch = tokenizer(
            sample_texts,
            padding=True,
            truncation=True,
            max_length=256,
            return_tensors="pt",
        )
        batch = {k: v.to(device) for k, v in batch.items()}
        z = encoder.encode(batch["input_ids"], batch["attention_mask"])
        last_er = effective_rank(z)

    version = f"asn-{int(torch.randint(1_000_000, 9_999_999, (1,)).item())}"
    ckpt_path = checkpoint_dir / f"{version}.pt"
    torch.save(
        {
            "recipe": recipe,
            "model": encoder.state_dict(),
            "effectiveRank": last_er,
            "finalLoss": last_loss,
        },
        ckpt_path,
    )

    return TrainResult(
        model_version=version,
        effective_rank=last_er,
        final_loss=last_loss,
        checkpoint_path=str(ckpt_path),
        surgeries=surgeries,
    )
