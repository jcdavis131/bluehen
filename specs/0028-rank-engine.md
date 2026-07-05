# Spec 0028 — The Rank Engine: real-time personalized ranking for anything

**Status:** Active (Operator flagship directive, 2026-07-04)
**Refines:** 0025 (engine) · 0024 (contracts) · 0023 (T2 user tower) · Owner: Claude

## 1. Product

`POST /v1/rank` — rank ANYTHING, personalized, explained:

```json
{
  "items": [{"id": "a", "text": "...", "metadata": {...}}, ...],   // inline candidates
  "useIndex": false,            // OR rank the tenant's indexed corpus
  "query": "optional intent",  // text relevance factor
  "userRef": "hashed-user-42", // optional pseudonymous personalization
  "k": 10,
  "policy": {"wPersonal": 0.5, "wQuery": 0.4, "boosts": [...]}      // optional overrides
}
```
Response: ordered items, each with `score` and a `factors` breakdown
(personal / query / boosts) — every position explainable.

## 2. Personalization (honest v1: profile-free)

- Consumer apps send interactions via /v1/exhaust with optional
  `userRef` (tenant-supplied pseudonym; docs demand hashed IDs, no PII).
- At rank time the engine builds an **ephemeral user vector**: decayed
  mean of embeddings of the user's recent consented interactions
  (bounded window, 60s cache). Nothing stored; consent rules unchanged;
  no userRef -> factor weight redistributes to query/boosts (never
  fabricated affinity).
- V2 (RANK-003, gated): learned two-tower user encoder trained on
  exhaust pairs — enters through gates like every model.

## 3. Policies (the "custom algorithms")

Per-tenant versioned policy: weights {wPersonal, wQuery, wBoosts} +
boost list [{field (contract-declared numeric/date), direction,
weight}]. Default policy ships; overrides per request; stored policies
via /v1/rank/policy (append-only versions like contracts). Boost fields
validate against the metadata contract (Spec 0024) — undeclared field =
400 naming the contract version.

## 4. Evaluation (RANK-004)

Leave-one-out replay on exhaust: does the personalized policy rank the
user's actually-next item higher than the unpersonalized baseline?
Reported as uplift@k; EVIDENCE row required before any personalization
claim. Until real interaction data accumulates, the docs say exactly
that.

## 5. Metering & limits

kind `rank`, 60/min; inline items capped 200/request, 32KB text each.

## 6. Non-goals (v1)

Stored user profiles; cross-tenant signals; learned user tower (V2);
LTR training (needs labels we don't have yet).
