# Spec 0022 — The self-sustaining intelligence engine

**Status:** Active (Operator vision statement, 2026-07-04)
**Refines:** Spec 0019 §0 (objective) · Spec 0021 (monetization) · Spec 0018/0020
**Owner:** Claude (exhaust API, auto-trigger) · Cursor (consumer-node emit wiring) · Operator (thresholds, SENTINEL)

## 1. The three-node model (canonical)

| Node | Is (today) | Unique contribution |
|---|---|---|
| **Consumer** | the 6 BU sites; future apps (e.g. Project SENTINEL, mobile AR) | Surface area: passive value to users; generates the data exhaust synthetic data can't replicate |
| **Infrastructure** | core-api (FastAPI/Postgres), datalab, the BFF layer | Connective tissue: routes exhaust to the engine with minimal latency and negligible debt; one stack, small team |
| **Evaluation/ML** | eval-harness, worker, autoresearch, charters | The brain: measures against real workflows, trains, gates, deploys stronger models back to the consumer node — and sells itself as a B2B service (certification, shipped) |

## 2. Refinement A — the Data Exhaust API (normative)

Every consumer surface emits telemetry through ONE strict schema so the
engine never needs per-app handling (SENTINEL plugs in without new code):

`POST /v1/exhaust` (tenant key, rate-limited):
```json
{
  "source": "<siteId or appId>",
  "kind": "interaction | submission | query | outcome",
  "consent": true|false,
  "payload": { ... },            // app-specific, stored only with consent
  "ts": "ISO-8601 (optional, server default)"
}
```
Rules: no consent → counted (metered as exhaust) but payload DISCARDED;
consented payloads land in the datalab inbox under
`exhaust-<source>.jsonl` — already a registered-source pattern, so the
existing harvest loop turns exhaust into catalog datasets with zero new
machinery. Existing intakes (diagnose, refinery submit) remain but are
re-documented as exhaust specializations.

## 3. Refinement B — the self-triggering loop (normative)

The loop is closed only if it starts itself. The worker tracks, per
site: consented exhaust volume + newly cataloged chunks since the last
training job. When the volume crosses `SYNTH_AUTOTRAIN_THRESHOLD`
(default 150 new items), it auto-enqueues a hill-climb for that tenant.
Gates + charter then decide deployment exactly as today (`ndcgNonRegression`
is the beats-baseline check; charter is the one-click / standing
authorization). Every auto-trigger is ledger-logged with its counts —
the engine's decisions stay auditable.

## 4. Refinement C — byproducts as products (status)

Already shipped: certification-as-a-service (P4), metered API (P1),
dataset access (P3), model publishing (P6, token-gated). Remaining =
packaging: a developer surface (docs page on the company site listing
the tiered APIs + the exhaust schema as an integration guide). Queued
MON-009 (cursor). No new backend.

## 5. Non-goals

Building SENTINEL (future consumer node; this spec guarantees it plugs
in); replacing any existing intake; auto-deploy without gates+charter.
