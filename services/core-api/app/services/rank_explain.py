"""Shapley Arena round explain (Spec 0032): predict-before-pick with honest
factor + pick Shapley values from the same linear score as rank.py."""

from __future__ import annotations

import math
import uuid
from itertools import permutations

from app.services import rank as rank_svc

MAX_PRIOR_PICKS = 7
PICK_SHAPLEY_TOP = 3


def _resolve_weights(
    pol: dict,
    user_vec: list[float] | None,
    query_vec: list[float] | None,
) -> tuple[float, float, float]:
    """Same honest redistribution as rank.rank."""
    w_p, w_q, w_b = pol["wPersonal"], pol["wQuery"], pol["wBoosts"]
    if user_vec is None:
        w_q, w_b, w_p = w_q + w_p * (w_q / max(w_q + w_b, 1e-9)), \
            w_b + w_p * (w_b / max(w_q + w_b, 1e-9)), 0.0
    if query_vec is None:
        w_p, w_b, w_q = w_p + w_q * (w_p / max(w_p + w_b, 1e-9)), \
            w_b + w_q * (w_b / max(w_p + w_b, 1e-9)), 0.0
    return w_p, w_q, w_b


def _user_vector_from_picks(
    workspace_id: uuid.UUID,
    prior_picks: list[dict],
) -> list[float] | None:
    """Session taste vector from arena prior picks (round-ordered decay)."""
    if not prior_picks:
        return None
    ordered = sorted(prior_picks, key=lambda p: int(p.get("round") or 0))
    texts = [str(p.get("text") or "")[:2000] for p in ordered if p.get("text")]
    if not texts:
        return None

    from app.services.models_svc import embed_texts

    vecs = embed_texts(workspace_id, texts, truncate=False)["vectors"]
    dim = len(vecs[0])
    acc = [0.0] * dim
    total_w = 0.0
    n = len(vecs)
    for i, vec in enumerate(vecs):
        w = 0.5 ** ((n - i - 1) / max(n, 1))
        total_w += w
        for j, x in enumerate(vec):
            acc[j] += w * x
    return [x / total_w for x in acc]


def _pair_factors(
    workspace_id: uuid.UUID,
    pair: list[dict],
    query: str | None,
    user_vec: list[float] | None,
    pol: dict,
) -> tuple[dict, dict, dict, dict, tuple[float, float, float]]:
    """Return per-id scores, raw factors, boost details, weights."""
    from app.services.models_svc import embed_texts

    boosts = pol.get("boosts") or []
    contract = None
    if boosts:
        from app.services.contracts import active

        contract = active(workspace_id)

    texts = [str(p["text"]) for p in pair]
    vecs = embed_texts(workspace_id, texts, truncate=False)["vectors"]
    query_vec = (
        embed_texts(workspace_id, [query], truncate=False)["vectors"][0]
        if query
        else None
    )
    w_p, w_q, w_b = _resolve_weights(pol, user_vec, query_vec)

    scores: dict[str, float] = {}
    raw: dict[str, dict] = {}
    boost_detail: dict[str, dict] = {}

    for item, vec in zip(pair, vecs):
        iid = str(item["id"])
        meta = item.get("metadata") or {}
        f_personal = rank_svc._cos(user_vec, vec) if user_vec is not None else None
        f_query = rank_svc._cos(query_vec, vec) if query_vec is not None else None
        f_boost, b_detail = rank_svc._boost_score(meta, boosts, contract)
        score = (
            w_p * (f_personal or 0.0)
            + w_q * (f_query or 0.0)
            + w_b * f_boost
        )
        scores[iid] = round(score, 4)
        raw[iid] = {
            "personal": f_personal,
            "query": f_query,
            "boosts": f_boost,
        }
        boost_detail[iid] = b_detail

    weights = {"personal": round(w_p, 3), "query": round(w_q, 3), "boosts": round(w_b, 3)}
    return scores, raw, boost_detail, weights, (w_p, w_q, w_b)


def _factor_shapley(
    raw_a: dict,
    raw_b: dict,
    w_p: float,
    w_q: float,
    w_b: float,
    user_vec: list[float] | None,
    query: str | None,
) -> dict[str, float]:
    """Exact Shapley on score difference Δ for {personal, query, boosts}."""
    players = []
    deltas: dict[str, float] = {}
    if user_vec is not None and raw_a["personal"] is not None and raw_b["personal"] is not None:
        players.append("personal")
        deltas["personal"] = w_p * (raw_a["personal"] - raw_b["personal"])
    if query and raw_a["query"] is not None and raw_b["query"] is not None:
        players.append("query")
        deltas["query"] = w_q * (raw_a["query"] - raw_b["query"])
    players.append("boosts")
    deltas["boosts"] = w_b * (raw_a["boosts"] - raw_b["boosts"])

    if len(players) == 1:
        return {players[0]: round(deltas[players[0]], 4)}

    phi = {p: 0.0 for p in players}
    n = len(players)
    for perm in permutations(players):
        coalition: list[str] = []
        prev = 0.0
        for p in perm:
            coalition.append(p)
            v = sum(deltas[x] for x in coalition)
            phi[p] += (v - prev) / math.factorial(n)
            prev = v

    return {k: round(v, 4) for k, v in phi.items()}


def _pick_shapley(
    workspace_id: uuid.UUID,
    prior_picks: list[dict],
    vec_a: list[float],
    vec_b: list[float],
    w_p: float,
) -> list[dict]:
    """Exact Shapley over prior picks for the personal component of Δ."""
    if not prior_picks or w_p <= 0:
        return []

    ordered = sorted(prior_picks, key=lambda p: int(p.get("round") or 0))
    texts = [str(p.get("text") or "")[:2000] for p in ordered if p.get("text")]
    if not texts:
        return []

    from app.services.models_svc import embed_texts

    pick_vecs = embed_texts(workspace_id, texts, truncate=False)["vectors"]
    n = len(pick_vecs)

    def personal_delta(indices: tuple[int, ...]) -> float:
        if not indices:
            return 0.0
        dim = len(pick_vecs[0])
        acc = [0.0] * dim
        total_w = 0.0
        idx_list = list(indices)
        for pos, idx in enumerate(idx_list):
            w = 0.5 ** ((len(idx_list) - pos - 1) / max(len(idx_list), 1))
            total_w += w
            for j, x in enumerate(pick_vecs[idx]):
                acc[j] += w * x
        u = [x / total_w for x in acc]
        return w_p * (rank_svc._cos(u, vec_a) - rank_svc._cos(u, vec_b))

    phi = [0.0] * n
    for perm in permutations(range(n)):
        coalition: list[int] = []
        prev = 0.0
        for i in perm:
            coalition.append(i)
            v = personal_delta(tuple(coalition))
            phi[i] += (v - prev) / math.factorial(n)
            prev = v

    ranked = sorted(
        (
            {
                "round": ordered[i].get("round"),
                "id": ordered[i].get("id"),
                "phi": round(phi[i], 4),
            }
            for i in range(n)
        ),
        key=lambda x: -abs(x["phi"]),
    )
    top = ranked[:PICK_SHAPLEY_TOP]
    remainder = round(sum(r["phi"] for r in ranked[PICK_SHAPLEY_TOP:]), 4)
    if abs(remainder) >= 0.0001:
        top.append({"round": None, "id": "_remainder", "phi": remainder})
    return top


def _layer_stack(
    weights: dict[str, float],
    factor_shapley: dict[str, float],
) -> dict:
    lit = [
        k
        for k, v in factor_shapley.items()
        if abs(v) >= max(abs(x) for x in factor_shapley.values()) * 0.5
        or abs(v) >= 0.001
    ]
    if not lit and factor_shapley:
        lit = [max(factor_shapley, key=lambda k: abs(factor_shapley[k]))]
    return {
        "personal": weights["personal"],
        "query": weights["query"],
        "boosts": weights["boosts"],
        "lit": lit,
    }


def _confidence(scores: dict[str, float], predicted_id: str, other_id: str) -> float:
    a = scores[predicted_id]
    b = scores[other_id]
    margin = abs(a - b)
    return round(min(0.99, 0.5 + margin), 2)


def rank_round(
    workspace_id: uuid.UUID,
    *,
    user_ref: str | None,
    pair: list[dict],
    query: str | None = None,
    prior_picks: list[dict] | None = None,
    chosen_id: str | None = None,
    deck_slug: str | None = None,
    round_num: int | None = None,
    policy: dict | None = None,
) -> dict:
    """Predict or resolve one arena round (Spec 0032 §4)."""
    if not pair or len(pair) != 2:
        raise ValueError("pair must contain exactly two items")
    for i, p in enumerate(pair):
        if not p.get("text"):
            raise ValueError(f"pair[{i}].text is required")
        if not p.get("id"):
            p["id"] = str(i)

    prior = list(prior_picks or [])
    if len(prior) > MAX_PRIOR_PICKS:
        raise ValueError(f"at most {MAX_PRIOR_PICKS} prior picks")

    pol = {**rank_svc.DEFAULT_POLICY, **(policy or {})}
    user_vec = _user_vector_from_picks(workspace_id, prior)

    scores, raw, _boost_detail, weights, (w_p, w_q, w_b) = _pair_factors(
        workspace_id, pair, query, user_vec, pol,
    )
    id_a, id_b = str(pair[0]["id"]), str(pair[1]["id"])
    predicted_id = id_a if scores[id_a] >= scores[id_b] else id_b
    other_id = id_b if predicted_id == id_a else id_a

    factor_shapley = _factor_shapley(
        raw[id_a], raw[id_b], w_p, w_q, w_b, user_vec, query,
    )

    from app.services.models_svc import embed_texts

    vecs = embed_texts(
        workspace_id, [pair[0]["text"], pair[1]["text"]], truncate=False,
    )["vectors"]
    pick_shapley = _pick_shapley(workspace_id, prior, vecs[0], vecs[1], w_p)

    layer_stack = _layer_stack(weights, factor_shapley)
    note = None
    if not prior:
        note = "No taste signal yet; prediction uses deck theme only."

    base = {
        "predictedId": predicted_id,
        "confidence": _confidence(scores, predicted_id, other_id),
        "scores": scores,
        "personalized": user_vec is not None,
        "layerStack": layer_stack,
        "shapley": {"factors": factor_shapley, "picks": pick_shapley},
        "note": note,
    }

    if not chosen_id:
        return base

    chosen_id = str(chosen_id)
    if chosen_id not in scores:
        raise ValueError("chosenId must be one of the pair ids")

    from app.services import exhaust as exhaust_svc

    chosen_item = pair[0] if str(pair[0]["id"]) == chosen_id else pair[1]
    exhaust_svc.ingest(
        workspace_id,
        "dumbmodel",
        "interaction",
        True,
        {
            "event": "arena-pick",
            "userRef": user_ref,
            "deckSlug": deck_slug,
            "itemId": chosen_id,
            "itemText": chosen_item["text"],
            "round": round_num,
        },
    )

    layer_before = layer_stack
    new_prior = prior + [
        {
            "round": round_num,
            "id": chosen_id,
            "text": chosen_item["text"],
        },
    ]
    user_vec_after = _user_vector_from_picks(workspace_id, new_prior)
    scores_after, raw_after, _, weights_after, (w_p2, w_q2, w_b2) = _pair_factors(
        workspace_id, pair, query, user_vec_after, pol,
    )
    factor_after = _factor_shapley(
        raw_after[id_a], raw_after[id_b], w_p2, w_q2, w_b2, user_vec_after, query,
    )
    layer_after = _layer_stack(weights_after, factor_after)

    delta = round(scores_after[predicted_id] - scores_after[other_id], 4)

    return {
        **base,
        "chosenId": chosen_id,
        "correct": chosen_id == predicted_id,
        "shapleyDelta": delta,
        "layerStackBefore": layer_before,
        "layerStackAfter": layer_after,
        "shapleyAfter": {"factors": factor_after, "picks": pick_shapley},
        "personalizedAfter": user_vec_after is not None,
    }
