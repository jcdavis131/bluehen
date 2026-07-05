# Fleet status board — lead dev

> Living board, updated each hill-climb iteration. Owner: Claude (lead dev).
> Queue detail: [TASKS.md](../TASKS.md) · Session context: [HANDOFF.md](../HANDOFF.md) ·
> Deep review: [docs/reviews/deep-review-2026-07-02.md](./reviews/deep-review-2026-07-02.md)

**Last updated: 2026-07-04 ~21:05 CT**

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
| DATA-802 barlow domain sweep | claude (detached) | Running locally; verdict -> knowledge/teams/rnd.md |
| Cursor P1 lane | cursor | Groomed + waiting: UX-102/104/105/106/107, RECO-003 hero, MON-009 /developers, EXH-003, FLY-002, PMF-004, BD-005 |
| Operator gates | operator | BD-001 Stripe key · PMF-001 ICP confirm · PMF-002 interviews · BD-004 prospects · ANCHOR-001 corpus · UX-109 legal |

## Today's ledger (2026-07-04)

- **Recommend Everything API complete**: /v1/corpus (upload->train->gate->deploy, zero-touch proven, EVIDENCE 3.14) · /v1/recommend (text+item modes, contract-compiled filters) · /v1/contracts (metadata contracts, mig 019) · /v1/exhaust + autotrain self-trigger (Spec 0025 A+B)
- **R&D pipe closed end to end** (Spec 0023 blueprint 2): radar -> hypothesis drafter -> daily auto-probe -> gates; first cycle drafted AR-501..503, probed AR-502, closed it measured (RT-404: no mrl gain)
- **RT-404 instrument** (pool-16 hard negatives): trained heads beat commercial zero-shots in-domain; honest null on method separation (EVIDENCE 3.15)
- **BD/PMF sprint armed**: ICP doc (review), positioning teardown, six evidence-cited one-pagers, funnel dogfooded through our own exhaust API (hq /org Funnel card)
- **Repo public + professional baseline**: secrets audit CLEAN, LICENSE/SECURITY/CONTRIBUTING, README rewrite, renamed slug jcdavis131/bluehen
- **Governance**: siteless uploads can no longer displace site serving (RECO-001 postmortem); usage retention (45d archive-purge); shared queue machinery
- Simulation Lab build-out merged (PR #2); spec 0022 collision resolved (engine spec -> 0025)

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
