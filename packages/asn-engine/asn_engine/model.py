"""ASNEncoder: backbone + pooling + projection head.

Backbone import is lazy so the math/test suite runs without `transformers` installed.
Install extras with:  uv pip install -e '.[model]'
"""

from __future__ import annotations

import torch
from torch import Tensor, nn

from asn_engine.projection_head import ProjectionHead


def mean_pool(token_embeddings: Tensor, attention_mask: Tensor) -> Tensor:
    mask = attention_mask.unsqueeze(-1).float()
    summed = (token_embeddings * mask).sum(dim=1)
    counts = mask.sum(dim=1).clamp(min=1e-9)
    return summed / counts


class ASNEncoder(nn.Module):
    """Mean-pooled transformer encoder with a discardable projection head.

    forward() returns (encoder_features Z1, projector_features Z2). Serving uses Z1 only;
    the projection head is dropped after training (Spec 0003).
    """

    def __init__(self, backbone_name: str = "sentence-transformers/all-MiniLM-L6-v2",
                 proj_out_dim: int = 256, discretize: bool = False) -> None:
        super().__init__()
        from transformers import AutoModel  # lazy

        try:
            # Single materialization (meta-device init): ~90 MB less peak on
            # load — the margin that keeps the 1 GB prod container alive.
            self.backbone = AutoModel.from_pretrained(backbone_name, low_cpu_mem_usage=True)
        except TypeError:
            self.backbone = AutoModel.from_pretrained(backbone_name)
        hidden = self.backbone.config.hidden_size
        self.head = ProjectionHead(hidden, out_dim=proj_out_dim, discretize=discretize)

    def forward(self, input_ids: Tensor, attention_mask: Tensor) -> tuple[Tensor, Tensor]:
        out = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        z1 = mean_pool(out.last_hidden_state, attention_mask)
        z2 = self.head(z1)
        return z1, z2

    @torch.no_grad()
    def encode(self, input_ids: Tensor, attention_mask: Tensor, *, use_head: bool = False) -> Tensor:
        """Serving path. Default: encoder features (Z1, Spec 0003).

        ``use_head=True`` serves the projection-head output instead — the
        representation head-only checkpoints actually trained (a frozen
        backbone's Z1 is identical to the base model, so serving Z1 for a
        head-only model would dishonestly serve an untrained representation).
        """
        out = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        z1 = mean_pool(out.last_hidden_state, attention_mask)
        if not use_head:
            return z1
        self.head.eval()
        return self.head(z1)


class HeadServingEncoder(nn.Module):
    """Serving wrapper for head-only checkpoints: shares a resident backbone
    module (inference-only) while owning its OWN head — multiple tenants'
    models can share one backbone without clobbering each other's heads."""

    def __init__(self, backbone: nn.Module, head: nn.Module) -> None:
        super().__init__()
        self.backbone = backbone
        self.head = head

    @torch.no_grad()
    def encode(self, input_ids: Tensor, attention_mask: Tensor, *, use_head: bool = True) -> Tensor:
        out = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        z1 = mean_pool(out.last_hidden_state, attention_mask)
        if not use_head:
            return z1
        self.head.eval()
        return self.head(z1)


def load_checkpoint_encoder(state: dict) -> tuple["ASNEncoder", bool]:
    """Build a serving encoder from a checkpoint state dict.

    Returns (encoder, use_head). Handles both formats:
    - full checkpoints: {"model": full state_dict, ...} -> serve Z1
    - head-only checkpoints: {"headOnly": True, "head": head state_dict,
      "backboneName": ...} -> backbone from HF, trained head, serve head
    """
    recipe = state.get("recipe", {})
    backbone = state.get("backboneName") or recipe.get(
        "baseModel", "sentence-transformers/all-MiniLM-L6-v2"
    )
    if state.get("headOnly"):
        head_sd = state["head"]
        hidden_dim = head_sd["net.0.weight"].shape[0]
        out_dim = head_sd["net.3.weight"].shape[0]
        base = state.get("_shared_backbone")  # optional resident encoder
        backbone_module = base.backbone if base is not None else ASNEncoder(backbone_name=backbone).backbone
        in_dim = backbone_module.config.hidden_size
        head = ProjectionHead(in_dim, hidden_dim=hidden_dim, out_dim=out_dim)
        head.load_state_dict(head_sd)
        head.eval()
        return HeadServingEncoder(backbone_module, head), True
    encoder = ASNEncoder(backbone_name=backbone)
    encoder.load_state_dict(state["model"])
    encoder.eval()
    return encoder, False
