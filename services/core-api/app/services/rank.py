"""The Rank Engine (Spec 0028): real-time personalized ranking for
anything — inline items or the tenant's index, an ephemeral user vector
from consented exhaust, policy-weighted factors, every position
explained. No stored profiles; no fabricated affinity."""

from __future__ import annotations

import json
import math
import time
import uuid
from datetime import datetime, timezone

from app.services.exhaust import DATALAB_DIR

MAX_ITEMS = 200
MAX_ITEM_CHARS = 32_000
USER_WINDOW = 50          # most recent consented interactions considered
USER_HALF_LIFE_S = 86_400  # 1-day decay half-life
_USER_CACHE: dict[str, tuple[float, list[float] | None]] = {}
_USER_CACHE_TTL = 60.0

DEFAULT_POLICY = {"wPersonal": 0.45, "wQuery": 0.45, "wBoosts": 0.10, "boosts": []}


def _cos(a: list[float], b: list[float]) -> float:
    num = sum(x * y for x, y in zip(a, b))
    da = math.sqrt(sum(x * x for x in a)) or 1.0
    db = math.sqrt(sum(x * x for x in b)) or 1.0
    return num / (da * db)


def _user_vector(workspace_id: uuid.UUID, user_ref: str) -> list[float] | None:
    """Ephemeral decayed-mean vector over the user's recent consented
    exhaust. Returns None (never a fake) when no history exists."""
    key = f"{workspace_id}:{user_ref}"
    now = time.time()
    hit = _USER_CACHE.get(key)
    if hit and now - hit[0] < _USER_CACHE_TTL:
        return hit[1]

    texts: list[tuple[str, float]] = []  # (text, age seconds)
    inbox = DATALAB_DIR / "inbox"
    if inbox.exists():
        for path in sorted(inbox.glob("exhaust-*.jsonl")):
            try:
                lines = path.read_text(encoding="utf-8").splitlines()
            except OSError:
                continue
            for line in reversed(lines[-2000:]):
                if len(texts) >= USER_WINDOW:
                    break
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if row.get("workspaceId") != str(workspace_id):
                    continue
                payload = row.get("payload") or {}
                if payload.get("userRef") != user_ref:
                    continue
                text = payload.get("itemText") or payload.get("text")
                if not text:
                    continue
                try:
                    ts = datetime.fromisoformat(row.get("ts"))
                    age = max(0.0, (datetime.now(timezone.utc) - ts).total_seconds())
                except (TypeError, ValueError):
                    age = 0.0
                texts.append((str(text)[:2000], age))

    if not texts:
        _USER_CACHE[key] = (now, None)
        return None

    from app.services.models_svc import embed_texts

    vecs = embed_texts(workspace_id, [t for t, _ in texts], truncate=False)["vectors"]
    dim = len(vecs[0])
    acc = [0.0] * dim
    total_w = 0.0
    for vec, (_, age) in zip(vecs, texts):
        w = 0.5 ** (age / USER_HALF_LIFE_S)
        total_w += w
        for i, x in enumerate(vec):
            acc[i] += w * x
    user_vec = [x / total_w for x in acc]
    if len(_USER_CACHE) > 500:
        _USER_CACHE.clear()
    _USER_CACHE[key] = (now, user_vec)
    return user_vec


def _boost_score(metadata: dict, boosts: list[dict], contract: dict | None) -> tuple[float, dict]:
    """Contract-validated numeric/date boosts, each normalized to [0,1]
    via a squashing transform; returns (score, per-boost detail)."""
    if not boosts:
        return 0.0, {}
    declared = {f["name"]: f["type"] for f in (contract or {}).get("filterable", [])}
    total = 0.0
    detail: dict = {}
    n = 0
    for b in boosts:
        field, direction = b.get("field"), b.get("direction", "desc")
        ftype = declared.get(field)
        if ftype not in ("number", "date"):
            raise ValueError(
                f"boost field {field!r} must be a contract-declared number/date field")
        raw = metadata.get(field)
        if raw is None:
            detail[field] = None
            continue
        if ftype == "date":
            try:
                age_days = max(0.0, (datetime.now(timezone.utc)
                                     - datetime.fromisoformat(str(raw))).days)
            except (TypeError, ValueError):
                detail[field] = None
                continue
            val = 0.5 ** (age_days / 30.0)          # newer -> higher
            if direction == "asc":
                val = 1.0 - val
        else:
            try:
                x = float(raw)
            except (TypeError, ValueError):
                detail[field] = None
                continue
            val = 1.0 / (1.0 + math.exp(-x / (abs(x) + 1.0)))  # squash
            if direction == "asc":
                val = 1.0 - val
        w = float(b.get("weight", 1.0))
        total += w * val
        detail[field] = round(val, 4)
        n += 1
    return (total / max(n, 1), detail)


def rank(workspace_id: uuid.UUID, *, items: list[dict] | None = None,
         use_index: bool = False, query: str | None = None,
         user_ref: str | None = None, k: int = 10,
         policy: dict | None = None) -> dict:
    from app.services.models_svc import embed_texts

    pol = {**DEFAULT_POLICY, **(policy or {})}
    boosts = pol.get("boosts") or []

    contract = None
    if boosts:
        from app.services.contracts import active

        contract = active(workspace_id)

    # ---- candidates
    if use_index:
        from sqlalchemy import text as _text

        from app.database import db_session

        with db_session(workspace_id) as session:
            rows = session.execute(_text("""
                SELECT dc.chunk_id, dc.text, dc.payload
                FROM document_chunks dc
                JOIN model_versions mv ON mv.workspace_id = dc.workspace_id
                 AND mv.version = dc.model_version AND mv.deployed
                WHERE dc.workspace_id = :wid LIMIT 500
            """), {"wid": str(workspace_id)}).mappings().all()
        cands = [{"id": r["chunk_id"], "text": r["text"] or "",
                  "metadata": r["payload"] or {}} for r in rows]
    else:
        if not items:
            raise ValueError("provide items or set useIndex")
        if len(items) > MAX_ITEMS:
            raise ValueError(f"at most {MAX_ITEMS} items per request")
        cands = []
        for i, it in enumerate(items):
            text = it.get("text")
            if not isinstance(text, str) or not text.strip():
                raise ValueError(f"items[{i}].text is required")
            if len(text) > MAX_ITEM_CHARS:
                raise ValueError(f"items[{i}].text exceeds {MAX_ITEM_CHARS} chars")
            cands.append({"id": str(it.get("id") or i), "text": text,
                          "metadata": it.get("metadata") or {}})
    if not cands:
        return {"ranked": [], "personalized": False,
                "policy": pol, "note": "no candidates"}

    cand_vecs = embed_texts(workspace_id, [c["text"] for c in cands],
                            truncate=False)["vectors"]

    # ---- factors
    user_vec = _user_vector(workspace_id, user_ref) if user_ref else None
    query_vec = (embed_texts(workspace_id, [query], truncate=False)["vectors"][0]
                 if query else None)

    # honest weight redistribution: absent factors give their weight away
    w_p, w_q, w_b = pol["wPersonal"], pol["wQuery"], pol["wBoosts"]
    if user_vec is None:
        w_q, w_b, w_p = w_q + w_p * (w_q / max(w_q + w_b, 1e-9)), \
            w_b + w_p * (w_b / max(w_q + w_b, 1e-9)), 0.0
    if query_vec is None:
        w_p, w_b, w_q = w_p + w_q * (w_p / max(w_p + w_b, 1e-9)), \
            w_b + w_q * (w_b / max(w_p + w_b, 1e-9)), 0.0

    scored = []
    for cand, vec in zip(cands, cand_vecs):
        f_personal = _cos(user_vec, vec) if user_vec is not None else None
        f_query = _cos(query_vec, vec) if query_vec is not None else None
        f_boost, boost_detail = _boost_score(cand["metadata"], boosts, contract)
        score = (w_p * (f_personal or 0.0) + w_q * (f_query or 0.0)
                 + w_b * f_boost)
        scored.append({
            "id": cand["id"],
            "text": cand["text"][:200],
            "score": round(score, 4),
            "factors": {
                "personal": round(f_personal, 4) if f_personal is not None else None,
                "query": round(f_query, 4) if f_query is not None else None,
                "boosts": boost_detail or None,
                "weights": {"personal": round(w_p, 3), "query": round(w_q, 3),
                            "boosts": round(w_b, 3)},
            },
        })
    scored.sort(key=lambda s: -s["score"])
    return {"ranked": scored[:k], "personalized": user_vec is not None,
            "candidateCount": len(cands), "policy": pol}
