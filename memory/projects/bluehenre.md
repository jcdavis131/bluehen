# Blue Hen RE Platform (bluehenre)

**Codename:** bluehenre, SynthaEmbed OS  
**Also called:** "the platform", "the monorepo"  
**Status:** Phase A — local stack proven; prod deploy pending  
**ADR:** `docs/adr/001-multi-org-circuit-platform.md`

## What it is

Multi-tenant synthetic organization platform. One ASN engine, N isolated mini-orgs, N product
surfaces on Vercel, one core-api chokepoint, one Postgres with RLS.

## Key people

- **Operator** — owner, spec sign-off, hosting
- **Eve** — fleet orchestration agent
- **Cursor / Claude** — implementation and research agents

## Product surfaces (active)

| Surface | Domain | Deep memory |
|---------|--------|-------------|
| Storefront | bhenre.com | hub in fleet.json |
| Headquarters | jcamd.com | hq |
| Validation Lab | slasso.com | `memory/projects/slasso.md` |
| Applied Research | arxiviq.com | `memory/projects/arxiviq.md` |
| Baseline Comparison | dumbmodel.com | public proof site |
| Simulation Lab | TBD | simulation stub |

## Current blockers (P0)

1. core-api + worker not on prod host + Neon
2. N Vercel projects not linked / keys not pushed
3. Modal trainer not production-wired

## Success criteria (Phase A)

- All locked domains live
- Benchmark exams on slasso
- Operations feedback closes ledger loop
- ASN deploy gate improvement vs InfoNCE

## Tech map

| Layer | Path |
|-------|------|
| Sites | `apps/sites/*`, `apps/hq` |
| API | `services/core-api` |
| Worker | `services/worker` |
| Trainer | `services/trainer` |
| Agent | `apps/synthorg` |
| Registry | `config/fleet.json` |
