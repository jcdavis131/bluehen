# 0007 — Fleet Registry & Multi-Site Fronts

- **Status:** Implemented
- **Owner:** Platform
- **Related specs:** 0001, 0002, 0006, 0012
- **Implementation:** `config/fleet.json`, `packages/fleet`, `packages/ui-fleet`, `apps/sites/*`, `apps/control`

## Problem

Blue Hen RE operates many domains (hub, control, benchmark lab, research RAG, dumbmodel) as
one monorepo. Without a single registry, agents and operators cannot orchestrate cross-site work.

## Goals

- One source of truth for sites, domains, app paths, ports, phases.
- Shared cross-site navigation (`@synthaembed/ui-fleet` FleetShell).
- Operator control plane with live fleet status from core-api.

## Design

### Registry (`config/fleet.json`)

Each site entry: `id`, `name`, `domain`, `phase`, `role`, `orgDivision`, optional
`secondaryDivisions`, `deliversTo`, `expectsFrom`, `appPath`, `package`, `port`, `status`.

Division ownership and handoff contracts: **Spec 0012**, `config/org-divisions.json`.

Locked domains: `bhenre.com`, `jcamd.com`, `slasso.com`, `arxiviq.com`, `dumbmodel.com`.

### SDK (`packages/fleet`)

- `listSites()`, `getSite()`, `getPlatform()`, `pairProgramContext()`, `devCommand()`.

### UI (`packages/ui-fleet`)

- `FleetShell`, `fleetNavSites()`, `siteHref()` — local port routing via `NEXT_PUBLIC_FLEET_LOCAL=1`.

### Sites (Phase A active)

| id | Domain | App |
|---|---|---|
| hub | bhenre.com | `apps/sites/hub` |
| control | jcamd.com | `apps/control` |
| dumbmodel | dumbmodel.com | `apps/sites/dumbmodel` |
| benchmark-lab | slasso.com | `apps/sites/benchmark-lab` |
| research-rag | arxiviq.com | `apps/sites/research-rag` |
| finance-lab | TBD | `apps/sites/finance-lab` (stub) |

### Vercel pattern

One monorepo, **multiple Vercel projects** — each with `SYNTH_API_KEY`, `NEXT_PUBLIC_API_BASE_URL`,
optional `API_SECRET_KEY` on control for `/v1/admin/fleet`.

### Local dev

- `pnpm dev:fleet` — all Phase A sites on ports from `config/fleet.json`.
- `pnpm dev:site <siteId>` — one site + workspace env from `data/workspaces/`.
- `scripts/fleet-review.ps1` — Windows port check, optional `-Restart -Open` for UI review.
- Runbook: [`docs/wiki/LOCAL_DEV.md`](../docs/wiki/LOCAL_DEV.md).

## Contract

- Agent tools: `fleet_list`, `fleet_context` (Eve).
- CLI: `synth fleet list`, `synth fleet context [siteId]`.
- Admin API: `GET /v1/admin/fleet` → per-org job, model, deploy, indexed chunk count.

## Acceptance criteria

1. `config/fleet.json` lists all active sites; `pnpm review` builds all site packages. ✅
2. FleetShell nav links work locally with `NEXT_PUBLIC_FLEET_LOCAL=1`. ✅
3. Control plane shows live fleet status when API + `API_SECRET_KEY` set. ✅
4. Bootstrap creates one workspace per Phase A org from fleet registry. ✅

## Test plan

- `pnpm review` (build + typecheck all sites).
- Manual: `pnpm dev:fleet` + control page fleet table.

## Risks

- Registry drift vs deployed Vercel projects → update fleet.json in same PR as site changes.
