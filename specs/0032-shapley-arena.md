# Spec 0032 — Shapley Arena: predict-first taste game with honest explanations

**Status:** Active (Operator direction 2026-07-05)
**Refines:** [0029](./0029-rank-arena.md) v2 · [0028](./0028-rank-engine.md) · [0030](./0030-one-model-package.md) · [0031](./0031-gamified-data-engine.md)
**Owner:** Cursor (rank explain + arena UI) · Claude (deck draft pipeline v2)
**Queue:** `GAME-007`

## 1. Player promise

At dumbmodel.com/arena: **we guess how you would rank seemingly random things** — movie tropes, street food, villains, gadgets. Before each pick you see the model's prediction. After each pick you see **Shapley values** explaining why the model guessed what it guessed and which past choices moved the score. A **layer stack** (personal / query / boost weights) lights up round by round — an honest map of the rank engine, not a decorative neural-net cartoon.

## 2. Round loop (8 rounds)

1. **Predict** — `POST /v1/rank/round` returns predicted winner, confidence, scores, Shapley breakdown, layer stack.
2. **Pick** — player chooses left or right (mobile thumb targets).
3. **Explain** — same endpoint with `chosenId` records exhaust (always anonymous), returns `{correct, shapley, layerStackAfter}`.
4. Repeat until round 8, then **full-deck reveal** via existing `/v1/rank`.

Round 1 with no prior picks: honest note — "No taste signal yet; prediction uses deck theme only."

## 3. Honesty rules (normative)

- Shapley values are computed from the **same linear score** as `/v1/rank` (Spec 0028).
- Factor Shapley on score difference Δ between the two candidates; **Σφ_factors = Δ** (test invariant).
- Pick Shapley attributes the personal factor only; exact enumeration for ≤7 prior picks.
- No fabricated personalization; `personalized: false` when user vector is empty.
- No decorative "neural network" graph — layer stack reflects policy weights only.

## 4. API contract

### `POST /v1/rank/round`

Request:

```json
{
  "userRef": "session-abc",
  "pair": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}],
  "query": "Movie Night",
  "priorPicks": [{"round": 1, "id": "...", "text": "..."}],
  "chosenId": null,
  "deckSlug": "movie-night",
  "round": 3
}
```

When `chosenId` is set, ingest exhaust and return resolution fields.

Response (predict):

```json
{
  "predictedId": "a",
  "confidence": 0.62,
  "scores": {"a": 0.71, "b": 0.58},
  "personalized": true,
  "layerStack": {"personal": 0.45, "query": 0.45, "boosts": 0.10, "lit": ["personal", "query"]},
  "shapley": {
    "factors": {"personal": 0.09, "query": 0.04, "boosts": 0.0},
    "picks": [{"round": 1, "id": "...", "phi": 0.05}]
  },
  "note": null
}
```

Response (resolve): adds `correct`, `chosenId`, `layerStackAfter`.

## 5. Data

- Every resolved pick → `/v1/exhaust` with `consent: true`, `source: dumbmodel`, payload `{event: "arena-pick", userRef, deckSlug, itemId, itemText, round}`.
- **Always stored** — anonymous `userRef` in sessionStorage; no opt-in checkbox.
- Privacy copy on arena + legal page.

## 6. Site IA

- `/` — Arena landing ("Can we guess your taste?")
- `/arena` — game (primary)
- `/lab` — proof tools cluster: check, compare, museum, hall
- Legacy routes redirect or link from `/lab`

## 7. Decks

- v1: curated JSON in `content/arena/decks/*.json` (manual + 2 new decks)
- v2: `scripts/arena_deck_draft.py` — trend/news draft → Operator review → merge (stub shipped; no auto-publish)

## 8. Acceptance criteria

1. Stranger completes 8-round session on phone in under 3 minutes.
2. Every round shows model prediction before pick and Shapley panel after.
3. Factor Shapley sums to score delta (unit tests).
4. Picks appear in exhaust summary for `source=dumbmodel`.
5. Homepage is arena-first; proof tools reachable via `/lab`.
6. `pnpm --filter @synthaembed/dumbmodel typecheck` green.

## 9. Out of scope (v1)

LLM commentator v2, leagues, accounts, live auto-decks, true NN visualization, cross-tenant signals.
