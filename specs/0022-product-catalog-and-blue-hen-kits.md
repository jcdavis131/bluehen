# Spec 0022 — Product catalog & Blue Hen Kits (self-serve + family-friendly)

- **Status:** Ready
- **Owner:** Operator
- **Related specs:** [0015](./0015-venture-fleet.md) (venture fleet) · [0019](./0019-corporate-topology.md) (corporate topology) · [0021](./0021-monetization-layer.md) (monetization) · [0018](./0018-data-refinery.md) (ingest pipeline)
- **Supersedes:** none; extends guest-surface direction from product review 2026-07-03

## Problem

The fleet sells **enterprise engagements** (briefings, sprints, managed tenants) and ships
**practitioner tools** (dumbmodel, slasso, arxiviq) on separate domains. There is no unified
**self-serve product ladder** from free → paid that fulfills without a human, and no surface
framed in **job language** for non-technical users (family, creatives, field workers).

Spec 0021 defines passive revenue streams (metered API, hosted library, datasets, etc.) but
not the **persona entry product** that proves tuned embeddings help everyone before anyone
books a briefing.

## Goals

- Define a **three-lane product catalog** (Free Tools · Self-Serve Products · Scoped
  Engagements) as the normative commercial model for bhenre.com and BU ventures.
- Ship **Blue Hen Kits** — persona-shaped document search (Brief Search, Job-Site Search,
  Field Notebook) on a single guest entry (`/kits`) using open-source zero-shot models on the
  free tier and optional tuned models on Pro.
- Every Lane 3 engagement **terminates in a Lane 2 product** (extends Spec 0021 low-overhead
  principle).
- Kits are **fully self-sufficient** on the free path: sample search works in &lt; 60 s with
  no account; upload path creates an isolated workspace with enforced quotas.
- Enterprise B2B voice on `/pricing`, `/store`, slasso, and hq **unchanged** (Spec 0017
  non-goal preserved). Kits use plain-language copy only on kit routes.

## Non-goals

- B2C rebrand of enterprise pages or BU certification flows.
- Replacing Medusa or core-api tenancy model.
- Live trading or investment advice (Spec 0013 wall unchanged).
- Mobile native apps; web-only kits on storefront.
- Training on free-tier uploads (zero-shot OSS embedder only until Pro + corpus threshold).

## Design

### Three-lane catalog

| Lane | Name | Fulfillment | Examples |
|---|---|---|---|
| **L1** | Free Tools | Instant, no checkout | dumbmodel check, arxiviq demo, kit samples, refinery previews, signals preview |
| **L2** | Self-Serve Products | Checkout → automated delivery | Kit Pro, API credits, hosted library, datasets, certification, signals sub |
| **L3** | Scoped Engagements | Human-scoped → must end in L2 | Sprint, custom harvest, research engagement, enterprise |

**Normative:** Lane 3 CTAs on `/pricing` include a `terminatesIn` product id (e.g. sprint →
`hosted-library`). If no L2 product exists, the engagement is not listed.

### Blue Hen Kits (product P0)

Three kits at launch, config-driven from `config/kits.json`:

| Kit id | Plain name | Persona | Sample corpus | Upgrade product |
|---|---|---|---|---|
| `brief-search` | Brief Search | Design / UX | Creative briefs (anonymized) | `kit-pro` |
| `jobsite-search` | Job-Site Search | Construction / real estate | Inspection + quote + code excerpt | `kit-pro` |
| `field-notebook` | Field Notebook | Science / field research | Field notes + EPA water excerpt | `kit-pro` |

**Kit page flow:**

```
/kits                    → three cards + "Just try it"
/kits/[kitId]            → TitleCard (plain name) → sample search → upload CTA
/kits/[kitId]/search     → LiveSearchPanel scoped to kit sample or user workspace
```

**Free tier limits** (enforced server-side per session/workspace):

| Limit | Value |
|---|---|
| Max documents | 20 |
| Max searches / day | 50 |
| Corpus retention | 30 days |
| Embedder | Zero-shot OSS (BGE-M3 or e5-small — same as eval-public baselines) |
| Training | None |

**Pro tier** (Medusa recurring `kit-pro`, Lane 2):

| Limit | Value |
|---|---|
| Max documents | 500 |
| Searches | Unlimited (fair-use rate limit) |
| Retention | Persistent |
| Embedder | Auto-tune ASN when corpus ≥ 50 docs (Data Org SLA) |
| Comparison UI | Side-by-side zero-shot vs tuned on holdout queries (honest counts, no hype) |

### Copy system (two voices)

| Surface | Voice | Jargon allowed |
|---|---|---|
| `/kits`, `/kits/*` | Job-first plain language | No RAG, embeddings, nDCG, operating loop |
| `/pricing`, `/store`, BU homepages | Enterprise B2B per `docs/VOICE_AND_PLATFORM.md` | Yes (glossary terms) |

Kit copy uses `plainName`, `tagline`, `sampleQueries[]` from config — never hardcoded in
components.

### Architecture

```
bhenre.com/kits
    │
    ├─ sample mode → content/kits/{kitId}/corpus.jsonl (static, no auth)
    │
    └─ upload mode → POST /api/kits/upload (storefront BFF)
            → POST /v1/data/ingest (workspace from kit session)
            → POST /v1/search (quota-checked)
            → citations: { doc, page?, chunk_id, excerpt }
```

- **Session:** anonymous kit sessions via signed httpOnly cookie (`kit_session`) mapping to
  a dedicated free-tier workspace (created on first upload). No passwords on L1/L2 free path.
- **Quotas:** `kit_quotas` table or workspace metadata JSON; checked in BFF before proxying
  to core-api.
- **Citations:** search hits return `payload.title`, `payload.source`, `payload.page` when
  present; kit UI renders "Found on page N of {filename}" — required on every result row.

### Pricing page restructure (Lane visibility)

`/pricing` gains three sections matching lanes. Lane 3 cards gain footer:
*"Typically becomes: {plain product name}"*. Lane 1 links to `/kits` and free BU tools.
Lane 2 links to `/store`.

### Fleet registry extension

Optional `venture.plainName` on `config/fleet.json` sites for kit cross-links. Kits registry
is separate (`config/kits.json`) to avoid overloading fleet site entries.

### Relation to Spec 0021 streams

| 0021 stream | Kit mapping |
|---|---|
| P0 Kit Pro | New — `kit-pro` Medusa recurring |
| P1 Metered API | Kit Team tier / API key after upgrade |
| P2 Hosted library | Pro tune + persistent hosting |
| P3 Datasets | Job-Site kit may link to refinery public corpora |
| P4 Certification | Not exposed on kit surfaces |
| P5 Signals | Optional fourth kit card later — out of launch scope |
| P6 Open-core | "How it works" footnote on kits only |

## Contract

### `config/kits.json`

```json
{
  "version": 1,
  "freeTier": {
    "maxDocuments": 20,
    "maxSearchesPerDay": 50,
    "retentionDays": 30,
    "embedder": "bge-m3"
  },
  "proTier": {
    "medusaHandle": "kit-pro",
    "maxDocuments": 500,
    "tuneThresholdDocs": 50
  },
  "kits": [
    {
      "id": "brief-search",
      "plainName": "Brief Search",
      "tagline": "Search every brief you've ever written.",
      "persona": "design",
      "sampleCorpusPath": "content/kits/brief-search/corpus.jsonl",
      "sampleQueries": ["What did we say about accessibility?"],
      "uploadHint": "Upload PDF or DOCX briefs and decks."
    }
  ]
}
```

### Storefront BFF

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/kits` | none | List kits from config |
| POST | `/api/kits/upload` | kit_session cookie | Multipart upload → ingest; enforce quotas |
| POST | `/api/kits/search` | kit_session cookie | Proxy `/v1/search`; enforce daily search quota |
| GET | `/api/kits/usage` | kit_session cookie | `{ documents, searchesToday, limits }` |

### core-api (optional v0 — may stub in BFF first)

| Field | Location | Purpose |
|---|---|---|
| `workspace.meta.kit_id` | workspaces JSON column or meta table | Attribution + quota scope |
| `workspace.meta.tier` | `free` \| `pro` | Quota profile |

Rate limits follow REV-903 pattern: per-IP on anonymous sample search; per-session on upload.

## Data model

- **Phase 1 (sample only):** no migration; static corpora in `content/kits/`.
- **Phase 2 (upload):** migration `015_kit_workspaces.py` — optional `kit_sessions` table:
  `id`, `workspace_id`, `kit_id`, `tier`, `searches_today`, `searches_reset_at`,
  `document_count`, `created_at`. Alternatively extend `corporate_workspaces.meta` JSONB.
- Medusa: product collection `kits` with variant `kit-pro` (monthly recurring).

## Acceptance criteria

1. `config/kits.json` validates against a JSON schema in `packages/fleet` (or `scripts/`)
   and lists exactly three launch kits.
2. `bhenre.com/kits` renders three kit cards + "Just try it" link; no division names or
   operating-loop copy above the fold.
3. Each `/kits/[kitId]` renders sample search with pre-loaded chips from config; first
   sample query returns ≥ 1 cited result in &lt; 5 s on production API or honest offline
   message.
4. Free-tier upload enforces 20-doc and 50-search/day limits with RFC 9457 problem response
   when exceeded.
5. Every kit search result row shows a human citation (`filename` + optional `page`).
6. `/pricing` shows three lanes; each Lane 3 card names its `terminatesIn` L2 product.
7. `pnpm review` passes; kit routes pass `scripts/check-tastemaker.mjs` tap-target and
   overflow audits.
8. Kit pages contain zero matches for `nDCG`, `effective rank`, `operating loop`, `RAG
   Embeddings` in visible copy (footer "How we build this" link exempt).
9. Pro upgrade CTA links to `/store` `kit-pro` when Medusa configured; honest "opening
   soon" when not.
10. Lane 3 engagements in pricing config list a valid `terminatesIn` id from Lane 2 catalog.

## Test plan

- `packages/fleet` — `kits.json` schema validation unit test.
- `apps/sites/storefront` — `/kits` and `/kits/brief-search` render tests (sample chips
  present).
- `services/core-api/tests/test_kit_quotas.py` — quota enforcement (when API layer ships).
- `apps/sites/storefront` e2e or Playwright — sample search → citation visible.
- Manual: family persona walkthrough (upload 3 PDFs → ask question → see page citation) —
  documented in spec sign-off checklist.

## Evaluation gate

Not applicable for kit UI. When Pro tune ships, promotion copy may cite measured
zero-shot vs tuned comparison only from a logged eval snapshot (same SCIENCE_REVIEW rule as
dumbmodel — no fabricated lift).

## Rollout & rollback

| Phase | Task | Shippable alone |
|---|---|---|
| **A** | Spec + `config/kits.json` + sample corpora + `/kits` landing | Yes |
| **B** | Per-kit sample search pages (`KIT-004`) | Yes |
| **C** | Upload + quotas (`KIT-005`) | Requires API |
| **D** | Citations UI polish (`KIT-006`) | Yes |
| **E** | `/pricing` three-lane (`KIT-007`) | Yes |
| **F** | Kit Pro SKU + upgrade (`KIT-008`) | Requires Medusa prod |

Rollback: kit routes are additive; disable `/kits` nav link to hide without code delete.

## Risks

| Risk | Mitigation |
|---|---|
| Free tier abuse (upload / search) | Per-IP + per-session rate limits; hard quotas; 30-day retention |
| Jargon leaks into kit copy | CI grep on `apps/sites/storefront/app/kits/**` |
| Zero-shot quality disappoints | Pre-loaded samples chosen to work; honest upgrade path to tuned |
| Scope creep into full consumer app | Non-goals; kits are search-only, no chat wrapper |
| Duplicates Spec 0015 ventures | Kits are company-site guest layer; BUs keep practitioner positioning |
