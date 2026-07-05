# Spec 0027 — The Launchpad: out-of-the-box made visible

**Status:** Active (Operator directive 2026-07-04, principal-UX review)
**Refines:** 0025 (engine API) · 0024 (contracts) · 0019 (company site)
**Owner:** Claude (backend sandbox + orchestration, delegated UI) · Operator (sandbox quota sign-off)

## 1. Problem

The platform's core magic — corpus in, gated recommender out, zero
human steps (EVIDENCE 3.14) — is invisible: curl-only, key-gated. The
buyer persona (PM/owner) never experiences it; the pitch carries the
whole load.

## 2. The product: a four-step wizard at bhenre.com/launchpad

1. **Describe** — dataset name + filterable fields via plain-language
   form (field name, "number/category/date"). Compiles to a metadata
   contract (Spec 0024) server-side. No JSON visible.
2. **Upload** — paste rows or JSONL/CSV drop. Sandbox caps: ≤50 docs,
   ≤200KB. Consent line: sandbox corpora are shared-tenant demo data,
   auto-purged; no PII.
3. **Watch the loop** — live stage rail: ingest → chunks → pairs →
   training → gates → verdict. Polls the real job status. HONEST
   states: gate-fail renders as "the gate refused to ship this model —
   that's the product working" with the numbers.
4. **Try it** — recommend playground on the just-trained sandbox model:
   query box + filter chips generated FROM the contract (legal fields/
   operators only). Every result shows its reason snippet.
   Exit CTA: briefing request ("your own workspace, your own keys").

## 3. Architecture

- **Sandbox tenant:** one dedicated workspace (`sandbox` site id,
  provisioned like others); Launchpad BFF holds its key server-side.
  Corpus names prefixed `lp-<session8>-`; nightly purge task removes
  sandbox uploads >24h (worker tick). Budget ceiling already governs
  training spend.
- **New endpoint needs:** none — /v1/contracts, /v1/corpus, /v1/train/{id},
  /v1/recommend suffice. BFF routes proxy with the sandbox key.
- **Rate/abuse:** corpus rate limit (6/min) already server-side; BFF adds
  per-session cap (1 concurrent run) via cookie.
- **Report Card component** (ui-fleet `ModelReportCard`): gates table
  w/ thresholds, metrics vs baselines, lineage, honest empty states.
  Used by Launchpad step 3 verdict + arxiviq research-lab.

## 4. Ordered tasks

| # | Task | Lane |
|---|---|---|
| UXR-001 | Sandbox tenant provisioning + nightly purge tick | claude |
| UXR-002 | ui-fleet: ModelReportCard + FilterChips components | sonnet-delegate |
| UXR-003 | Launchpad wizard (4 steps, BFF routes, mobile-first) | sonnet-delegate |
| UXR-004 | arxiviq research-lab adopts ModelReportCard | cursor |
| UXR-005 | Hero reframe integrates Launchpad CTA (with RECO-003) | cursor |
| UXR-006 | E2E test: scripted Launchpad run in prod + EVIDENCE row | claude |

## 5. Gates

Ship gate: a stranger completes describe→upload→verdict→try in one
sitting with zero docs read; every rendered number is real; gate-fail
path tested deliberately (tiny corpus) and reads as designed.

## 6. Non-goals

Self-serve key issuance (briefing stays the path to own-workspace);
accounts/auth; payment (BD-001 gate); Visual Comps step (0026 V3 adds
a photo tab later).
