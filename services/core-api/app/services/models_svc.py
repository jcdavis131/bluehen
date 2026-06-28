"""Model registry, embed, deploy."""

from __future__ import annotations

import math
import uuid
from pathlib import Path

from sqlalchemy import select

from app.config import ARTIFACTS_DIR
from app.database import db_session
from app.models import Collection, ModelVersion


def _to_list(vec) -> list[float]:
    """Accept a python list/sequence or a 1-D tensor/ndarray and return a list[float]."""
    tolist = getattr(vec, "tolist", None)
    if callable(tolist):
        vec = tolist()
    return [float(x) for x in vec]


def quantize_int8(vec: list[float]) -> list[float]:
    """Per-vector symmetric int8 quantize then dequantize.

    scale = max(abs(v)) / 127. Returns the dequantized float vector (lossless-ish
    round-trip). int8 is essentially lossless for normalized embeddings per
    EVIDENCE.md S3.7.
    """
    values = _to_list(vec)
    amax = max((abs(v) for v in values), default=0.0)
    if amax == 0.0:
        return [0.0 for _ in values]
    scale = amax / 127.0
    out: list[float] = []
    for v in values:
        q = round(v / scale)
        if q > 127:
            q = 127
        elif q < -127:
            q = -127
        out.append(q * scale)
    return out


def apply_serving_tier(vec, truncate_dims: int | None, quant: str | None) -> list[float]:
    """Apply a serving tier to an embedding vector.

    Steps: truncate to the leading ``truncate_dims`` (Matryoshka prefix) if set,
    L2-renormalize (cosine retrieval needs unit vectors), then int8-quantize if
    ``quant == "int8"``. Accepts a python list or 1-D tensor; returns a list.
    """
    values = _to_list(vec)
    if truncate_dims is not None and truncate_dims > 0:
        values = values[:truncate_dims]
    norm = math.sqrt(sum(v * v for v in values))
    if norm > 0.0:
        values = [v / norm for v in values]
    if quant == "int8":
        values = quantize_int8(values)
    return values


def list_models(workspace_id: uuid.UUID) -> dict:
    with db_session(workspace_id) as session:
        rows = session.scalars(
            select(ModelVersion).where(ModelVersion.workspace_id == workspace_id).order_by(ModelVersion.created_at.desc())
        ).all()
        return {
            "models": [
                {
                    "version": r.version,
                    "effectiveRank": r.effective_rank,
                    "ndcg10": r.ndcg10,
                    "deployed": r.deployed,
                    "truncateDims": r.truncate_dims,
                    "quant": r.quant,
                }
                for r in rows
            ]
        }


def deploy_model(
    workspace_id: uuid.UUID,
    model_version: str,
    truncate_dims: int | None,
    quant: str,
    *,
    index_vectors: bool = True,
) -> dict:
    from app.services.indexing import index_collection_for_model

    with db_session(workspace_id) as session:
        mv = session.scalar(
            select(ModelVersion).where(
                ModelVersion.workspace_id == workspace_id,
                ModelVersion.version == model_version,
            )
        )
        if mv is None:
            raise ValueError("model version not found")
        for row in session.scalars(select(ModelVersion).where(ModelVersion.workspace_id == workspace_id)).all():
            row.deployed = False
        mv.deployed = True
        mv.truncate_dims = truncate_dims
        mv.quant = quant

    out = {
        "modelVersion": model_version,
        "deployed": True,
        "truncateDims": truncate_dims,
        "quant": quant,
    }
    if index_vectors:
        out["index"] = index_collection_for_model(workspace_id, model_version)
    return out


def embed_texts(workspace_id: uuid.UUID, inputs: list[str], *, truncate: bool | None = None) -> dict:
    import torch

    with db_session(workspace_id) as session:
        mv = session.scalar(
            select(ModelVersion)
            .where(ModelVersion.workspace_id == workspace_id, ModelVersion.deployed.is_(True))
            .order_by(ModelVersion.created_at.desc())
        )
        if mv is None:
            mv = session.scalar(
                select(ModelVersion)
                .where(ModelVersion.workspace_id == workspace_id)
                .order_by(ModelVersion.created_at.desc())
            )
        if mv is None:
            raise ValueError("no trained model; run training first")

        from asn_engine.model import ASNEncoder
        from transformers import AutoTokenizer

        ckpt = Path(mv.checkpoint_path)
        if not ckpt.exists():
            raise FileNotFoundError(f"checkpoint missing: {ckpt}")

        state = torch.load(ckpt, map_location="cpu", weights_only=False)
        recipe = state.get("recipe", {})
        backbone = recipe.get("baseModel", "sentence-transformers/all-MiniLM-L6-v2")
        encoder = ASNEncoder(backbone_name=backbone)
        encoder.load_state_dict(state["model"])
        encoder.eval()
        tok = AutoTokenizer.from_pretrained(backbone)

        vectors = []
        with torch.no_grad():
            for text in inputs:
                batch = tok(text, return_tensors="pt", truncation=True, max_length=256, padding=True)
                vec = encoder.encode(batch["input_ids"], batch["attention_mask"])[0]
                # Full tier (truncate=False): no truncation, no quant. Otherwise serve
                # the deployed model's tier (Matryoshka truncate_dims + quant).
                if truncate is False:
                    tier_dims, tier_quant = None, None
                else:
                    tier_dims, tier_quant = mv.truncate_dims, mv.quant
                vectors.append(apply_serving_tier(vec.cpu(), tier_dims, tier_quant))

        return {"vectors": vectors, "modelVersion": mv.version}


def get_collection_pairs(workspace_id: uuid.UUID, collection_id: uuid.UUID) -> list[dict]:
    with db_session(workspace_id) as session:
        col = session.scalar(
            select(Collection).where(Collection.id == collection_id, Collection.workspace_id == workspace_id)
        )
        if col is None:
            return []
        return (col.meta or {}).get("pairs") or []
