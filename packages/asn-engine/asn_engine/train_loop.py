"""ASN contrastive training loop — production path for org models."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import torch
from torch import Tensor
from torch.utils.data import DataLoader, Dataset

from asn_engine.losses import barlow_twins, covariance_regularization, info_nce, variance_regularization
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


def apply_spectral_surgery(
    encoder: ASNEncoder,
    asn_cfg: dict,
    *,
    weak_weights: Tensor | None = None,
) -> None:
    """Apply three-tier surgery to the projection head when rank collapses.

    ``weak_weights`` (ŵ): per-singular-direction EMA of normalized gradient activity.
    High ŵ spares a weak-band direction from attenuation (heterosynaptic protection).
    """
    w = encoder.head.net[0].weight.data
    if w.ndim != 2:
        return
    u, s, vh = torch.linalg.svd(w, full_matrices=False)
    s_adj = three_tier_surgery(
        s,
        strong_k=int(asn_cfg.get("kStrong", 8)),
        tail_k=int(asn_cfg.get("kTail", 8)),
        lam=float(asn_cfg.get("lambda", 0.5)),
        weak_weights=weak_weights,
    )
    encoder.head.net[0].weight.data = u @ torch.diag(s_adj) @ vh


def _grad_energy_per_direction(weight: Tensor, grad: Tensor) -> Tensor:
    """Normalized |u_r^T G v_r| per singular direction of ``weight``."""
    u, _, vh = torch.linalg.svd(weight, full_matrices=False)
    coupling = torch.einsum("mr,mn,rn->r", u, grad, vh).abs()
    span = coupling.max() - coupling.min()
    if float(span) < 1e-12:
        return torch.zeros_like(coupling)
    return (coupling - coupling.min()) / span


def _update_hetero_ema(
    prev: Tensor | None,
    instant: Tensor,
    beta: float,
) -> Tensor:
    if prev is None or prev.shape != instant.shape:
        return instant.clone()
    return beta * prev + (1.0 - beta) * instant


def train_asn(
    pairs: list[dict],
    recipe: dict,
    checkpoint_dir: Path,
    *,
    progress: Callable[[dict], None] | None = None,
) -> TrainResult:
    from transformers import AutoTokenizer

    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    if bool(recipe.get("freezeBackbone", False)):
        # Head-only path (1 GB prod containers): the frozen backbone's
        # features are constant, so we extract them once and train only the
        # head — peak memory is backbone INFERENCE, not training.
        return _train_head_only(pairs, recipe, checkpoint_dir, progress=progress)
    backbone = recipe.get("baseModel", "sentence-transformers/all-MiniLM-L6-v2")
    epochs = int(recipe.get("epochs", 3))
    batch_size = min(int(recipe.get("batchSize", 16)), max(2, len(pairs)))
    lr = float(recipe.get("lr", 2e-5))
    loss_cfg = recipe.get("loss", {})
    temp = float(loss_cfg.get("infoNceTemp", 0.07))
    # Loss-space rank floor (VICReg, Bardes et al. 2022) — the anti-collapse mechanism that
    # works where in-loop weight surgery did not (EVIDENCE.md §3.4). Default 0.0 = off, so the
    # InfoNCE-only path is unchanged; set positive coefficients in the recipe to enable.
    vicreg_var = float(loss_cfg.get("vicregVar", 0.0))   # variance term: per-dim std floor
    vicreg_cov = float(loss_cfg.get("vicregCov", 0.0))   # covariance term: decorrelate dims
    # base objective selector (EVIDENCE §3.7 method ranking): infonce | barlow | mrl
    loss_method = loss_cfg.get("method", "infonce")
    barlow_lambda = float(loss_cfg.get("barlowLambda", 0.02))
    mrl_dims = loss_cfg.get("mrlDims")  # for mrl: nested prefix dims of the served rep
    asn_cfg = recipe.get("asn", {})
    ns_steps = int(asn_cfg.get("newtonSchulzSteps", 5))
    rank_floor = float(recipe.get("rankFloor", 12.0))
    rank_drop_delta = float(asn_cfg.get("rankDropDelta", 2.0))
    # ASN interventions (spectral surgery + Newton-Schulz conditioning) are switchable so
    # the InfoNCE-only baseline is a clean ablation (same data/seed/steps). Default on.
    asn_enabled = bool(asn_cfg.get("enabled", True))
    hetero_beta = float(asn_cfg.get("heteroEmaBeta", 0.9))

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
    hetero_ema: Tensor | None = None
    rank_peak = 0.0

    def _maybe_intervene(window: Tensor) -> None:
        nonlocal last_er, rank_peak, surgeries, hetero_ema
        if not asn_enabled or window.shape[0] < min(rank_window, 64):
            return
        last_er = effective_rank(window)
        rank_peak = max(rank_peak, last_er)
        collapsed = last_er < rank_floor or (rank_peak - last_er) >= rank_drop_delta
        if collapsed:
            apply_spectral_surgery(encoder, asn_cfg, weak_weights=hetero_ema)
            surgeries += 1
        if ns_every > 0 and global_step % ns_every == 0:
            w = encoder.head.net[0].weight.data
            if w.ndim == 2:
                encoder.head.net[0].weight.data = newton_schulz(w, steps=ns_steps)

    for epoch in range(epochs):
        encoder.train()
        for batch in loader:
            ids_a, mask_a, ids_p, mask_p = _collate(batch, tokenizer)
            ids_a, mask_a = ids_a.to(device), mask_a.to(device)
            ids_p, mask_p = ids_p.to(device), mask_p.to(device)

            z_enc_a, z_proj_a = encoder(ids_a, mask_a)
            z_enc_p, z_proj_p = encoder(ids_p, mask_p)
            if loss_method == "barlow":
                loss = barlow_twins(z_proj_a, z_proj_p, off_lambda=barlow_lambda)
            elif loss_method == "mrl":
                # Matryoshka on the SERVED representation (encoder Z1) so truncated serving works
                full = z_enc_a.shape[-1]
                dims = mrl_dims or [full, full // 2, full // 4, full // 8]
                dims = [d for d in dims if 0 < d <= full]
                loss = sum(info_nce(z_enc_a[:, :d], z_enc_p[:, :d], temperature=temp) for d in dims)
            else:  # infonce (default)
                loss = info_nce(z_proj_a, z_proj_p, temperature=temp)
            if vicreg_var > 0.0:
                loss = loss + vicreg_var * (
                    variance_regularization(z_proj_a) + variance_regularization(z_proj_p)
                )
            if vicreg_cov > 0.0:
                loss = loss + vicreg_cov * (
                    covariance_regularization(z_proj_a) + covariance_regularization(z_proj_p)
                )

            opt.zero_grad()
            loss.backward()

            if asn_enabled:
                head_w = encoder.head.net[0].weight
                if head_w.grad is not None and head_w.ndim == 2:
                    instant = _grad_energy_per_direction(head_w.data, head_w.grad)
                    hetero_ema = _update_hetero_ema(hetero_ema, instant, hetero_beta)

            opt.step()
            last_loss = float(loss.item())
            global_step += 1

            # Rank trigger uses encoder space (Z1), per WHITEPAPER §4.1 — not projector Z2.
            with torch.no_grad():
                buf.append(z_enc_a.detach())
                rows = sum(t.shape[0] for t in buf)
                while rows > rank_window and len(buf) > 1:
                    rows -= buf.pop(0).shape[0]

            if global_step % surgery_check_every == 0:
                with torch.no_grad():
                    _maybe_intervene(torch.cat(buf, dim=0))

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
        if asn_enabled:
            _maybe_intervene(z)

    version = f"asn-{int(torch.randint(1_000_000, 9_999_999, (1,)).item())}"
    ckpt_path = checkpoint_dir / f"{version}.pt"
    torch.save(
        {
            "recipe": recipe,
            "model": encoder.state_dict(),
            "effectiveRank": last_er,
            "finalLoss": last_loss,
            "surgeries": surgeries,
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


def train_head_on_features(
    feats_a: Tensor,
    feats_p: Tensor,
    recipe: dict,
    *,
    progress: Callable[[dict], None] | None = None,
) -> tuple["ProjectionHead", float, float]:
    """Train a projection head on cached (frozen-backbone) features.

    Pure small-tensor training — unit-testable without transformers.
    No ASN weight surgery here (fleet-rejected 0/4; head-only prod path
    keeps interventions off by design). Returns (head, final_loss,
    effective_rank measured on the SERVED representation).
    """
    from asn_engine.projection_head import ProjectionHead

    epochs = int(recipe.get("epochs", 3))
    batch_size = min(int(recipe.get("batchSize", 8)), max(2, feats_a.shape[0]))
    lr = float(recipe.get("lr", 2e-5))
    loss_cfg = recipe.get("loss", {})
    temp = float(loss_cfg.get("infoNceTemp", 0.07))
    out_dim = int(recipe.get("projOutDim", 384))
    hidden_dim = int(recipe.get("projHiddenDim", 1024))

    head = ProjectionHead(feats_a.shape[-1], hidden_dim=hidden_dim, out_dim=out_dim)
    opt = torch.optim.AdamW(head.parameters(), lr=lr)
    n = feats_a.shape[0]
    global_step = 0
    last_loss = 0.0
    head.train()
    for epoch in range(epochs):
        perm = torch.randperm(n)
        for start in range(0, n, batch_size):
            idx = perm[start : start + batch_size]
            if idx.shape[0] < 2:
                continue  # InfoNCE needs in-batch negatives
            z_a = head(feats_a[idx])
            z_p = head(feats_p[idx])
            loss = info_nce(z_a, z_p, temperature=temp)
            opt.zero_grad()
            loss.backward()
            opt.step()
            last_loss = float(loss.item())
            global_step += 1
            if progress:
                progress({"epoch": epoch, "step": global_step, "loss": last_loss,
                          "effectiveRank": 0.0, "surgeries": 0})

    head.eval()
    with torch.no_grad():
        served = head(feats_a[: min(64, n)])
        er = effective_rank(served)
    return head, last_loss, er


def _train_head_only(
    pairs: list[dict],
    recipe: dict,
    checkpoint_dir: Path,
    *,
    progress: Callable[[dict], None] | None = None,
) -> TrainResult:
    """Frozen-backbone training that fits a 1 GB container.

    Phase 1: batch-embed all pair texts with the backbone under no_grad,
    then free it. Phase 2: train the head on the cached features.
    Checkpoint stores ONLY the head (+ backbone name) — a few MB, small
    enough for Postgres, reassembled at serve time with the HF backbone.
    """
    import gc

    from transformers import AutoTokenizer

    from asn_engine.model import ASNEncoder

    backbone_name = recipe.get("baseModel", "sentence-transformers/all-MiniLM-L6-v2")
    device = "cpu"
    encoder = ASNEncoder(backbone_name=backbone_name).to(device)
    encoder.eval()
    tokenizer = AutoTokenizer.from_pretrained(backbone_name)

    extract_bs = int(recipe.get("extractBatchSize", 4))

    def _embed_all(texts: list[str]) -> Tensor:
        outs = []
        with torch.no_grad():
            for start in range(0, len(texts), extract_bs):
                chunk = texts[start : start + extract_bs]
                batch = tokenizer(chunk, padding=True, truncation=True,
                                  max_length=256, return_tensors="pt")
                outs.append(encoder.encode(batch["input_ids"], batch["attention_mask"]))
                if progress and start % (extract_bs * 10) == 0:
                    progress({"epoch": -1, "step": start, "loss": None,
                              "effectiveRank": None, "surgeries": 0})
        return torch.cat(outs, dim=0)

    feats_a = _embed_all([p["anchor"] for p in pairs])
    feats_p = _embed_all([p["positive"] for p in pairs])

    # Free the backbone before training — this is the memory trick.
    del encoder, tokenizer
    gc.collect()

    head, last_loss, last_er = train_head_on_features(
        feats_a, feats_p, recipe, progress=progress
    )

    version = f"asn-head-{int(torch.randint(1_000_000, 9_999_999, (1,)).item())}"
    ckpt_path = checkpoint_dir / f"{version}.pt"
    torch.save(
        {
            "headOnly": True,
            "head": head.state_dict(),
            "backboneName": backbone_name,
            "recipe": recipe,
            "effectiveRank": last_er,
            "finalLoss": last_loss,
            "surgeries": 0,
        },
        ckpt_path,
    )
    return TrainResult(
        model_version=version,
        effective_rank=last_er,
        final_loss=last_loss,
        checkpoint_path=str(ckpt_path),
        surgeries=0,
    )


def train_asn_with_seed(
    pairs: list[dict],
    recipe: dict,
    checkpoint_dir: Path,
    *,
    seed: int = 42,
    progress: Callable[[dict], None] | None = None,
) -> TrainResult:
    """Deterministic wrapper for ablations and evidence collection."""
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    return train_asn(pairs, recipe, checkpoint_dir, progress=progress)
