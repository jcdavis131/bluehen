# Fleet status board — lead dev

> Living board, updated each hill-climb iteration. Owner: Claude (lead dev).
> Queue detail: [TASKS.md](../TASKS.md) · Session context: [HANDOFF.md](../HANDOFF.md) ·
> Deep review: [docs/reviews/deep-review-2026-07-02.md](./reviews/deep-review-2026-07-02.md)

**Last updated: 2026-07-03 ~17:40 UTC**

## Production surfaces

| Surface | State |
|---|---|
| 7 fleet sites (Vercel) | LIVE on rebranded domains, live-data keys verified |
| core-api + worker (Railway `api`, combined) | LIVE — `/readyz` ready, 8 GB, volume at `/data` |
| Railway Postgres (pgvector) | LIVE — workspaces migrated to new ids |
| Medusa commerce | Local only (`data/pg-commerce` :5434); Railway deploy files ready |

## In flight (right now)

| Work | Owner | State |
|---|---|---|
| Prod training — research | worker | **CLOSED: asn-head-8282654 DEPLOYED under charter** — gates passed (nDCG@10 0.9077, ER 26.03), 702 chunks indexed, /v1/search serving it live; EVIDENCE §3.9; arxiviq /methods case study shows live numbers. dumbmodel/storefront/validation trained + honestly gate-blocked (tiny corpora) |
| 3 queued training jobs (dumbmodel, storefront, validation) | worker | Pending behind research; tiny corpora — expect `insufficient pairs` fails or fail-closed gates (honest outcomes) |
| REV-904 durable leads (`Lead` model + migration 007 landed; endpoint WIP) | cursor | In progress in working tree; tests green with it |
| REV-907/911 hardening (weights_only, embed caps) | claude | Committed; **deploys on next Railway restart window** (not worth killing training) |
| Spec 0016 dumbmodel game layer | operator gate | Draft — awaiting game-set + consent sign-off; phase 3 blocked on rate limiting |

## Data Refinery (Spec 0018 — LAUNCHED, all phases complete)

Sixth business unit fully operational: live site (refinery-zeta.vercel.app,
copper identity), data plane (6 datasets · 103 chunks, on-demand harvests
proven), consent flywheel (contribute → hq review → approve → catalog),
Division Ops console at jcamd.com/ops, measured load posture (EVIDENCE
3.10), 5-SME launch review done (BLOCK + 3 honesty violations fixed
same-hour). OPEN: G1 data.bhenre.com attach (Operator), erasure tooling,
Redis-backed limiter on scale-out.

## Wiki Refinery (Spec 0020 — LIVE)

8 pages auto-built in prod from catalog rows (index, topics, dataset
pages w/ computed cross-links, link map); rebuilds on boot + every
harvest; GLM refinement pass wired behind GLM_API_KEY with honest
deterministic-only footers until keyed. /wiki live on the refinery site.

## Corporate topology (Spec 0019 — closed both directions)

Company site presents all BUs from the registry; every BU signs itself
back with a TeamStrip. orgRole drives all chrome.

## Shipped today (highlights)

Fleet rebrand (8 phases) · venture fleet live (Spec 0015) · engagement/attention
pass (SITE-004..012) · commerce backend booted + certification product ·
agentkit org teams (Spec 0014) · runboard/datalab/Observatory stack ·
prod cutover (Railway + migration + bootstrap + fleet envs) · deep review
16 findings → **REV-901..911 all closed except REV-904** · worker crash
recovery + live training telemetry.

## Orchestration (new)

Dynamic workflow live: [ORCHESTRATION.md](./ORCHESTRATION.md) — per-subagent
stepwise playbooks baked into executable GLM charters (agentkit teams.py).
Gate: `GLM_API_KEY`.

## Risks / watch

1. **Training runtime on shared 2 vCPU** — if research exceeds ~1 h with
   telemetry visible, consider dedicated worker service (needs S3 artifact
   registry) or Modal trainer (Spec 0011).
2. Leads durability (REV-904) — until Cursor lands the endpoint, prod
   contact/waitlist writes are ephemeral on Vercel.
3. `pnpm` v10 ignores `package.json#pnpm.overrides` (warning seen) — the
   postcss pin holds via lockfile, but overrides need moving to
   `pnpm-workspace.yaml` when convenient.
4. GLM agent teams idle at deterministic tier until `GLM_API_KEY` is set.

## Lane assignments (open)

cursor: REV-904, SITE-001..003, OMNI-004 · opencode: RAG-502/505 ·
claude: LOOP-001 (post-training), training shepherding · operator:
Spec 0016 sign-off, GLM key, certification pricing.
