# Blue Hen RE — Agent & pair-programming guide

**New agent?** Start with [`docs/wiki/SESSION_BOOT.md`](./docs/wiki/SESSION_BOOT.md) — shared boot for Cursor, Claude, and OpenCode.

Also read [`docs/AGENT_INIT.md`](./docs/AGENT_INIT.md) for full onboarding.

**Cursor rules:** `.cursor/rules/` (always-on fleet team + file-scoped lanes).  
**Claude Code:** root [`CLAUDE.md`](./CLAUDE.md) → [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) + [`.claude/TEAM.md`](./.claude/TEAM.md).  
**OpenCode:** [`opencode.json`](./opencode.json) loads wiki boot + fleet rules; loops via [`docs/OPENCODE_LOOP.md`](./docs/OPENCODE_LOOP.md).

Read **`config/work_queue.json`**, **`config/fleet.json`**, **`HANDOFF.md`**, and **`specs/README.md`** first. This monorepo is
**fleet-orchestrated**: one agent, one API, many sites.

## Work intake (any agent)

```bash
uv run python scripts/pick_task.py blockers   # why things are stuck
uv run python scripts/pick_task.py list       # ready tasks
uv run python scripts/pick_task.py claim W-ID --agent cursor
uv run python scripts/pick_task.py done W-ID
uv run python scripts/pick_task.py render     # refresh TASKS.md
```

| File | Role |
|---|---|
| **`config/work_queue.json`** | Single task queue — specs, research, infra, sites |
| **`TASKS.md`** | Human/agent summary (generated via `pick_task.py render`) |
| **`specs/NNNN-*.md`** | Acceptance criteria for features |
| **`program.md`** | Autoresearch rules only |

## Orchestration center

| Layer | Path | Spec |
|---|---|---|
| **Fleet registry** | `config/fleet.json` | [0007](./specs/0007-fleet-registry-and-sites.md) |
| **Fleet SDK** | `packages/fleet` | 0007 |
| **Control plane** | `apps/control` → jcamd.com | 0007 |
| **Fleet agent** | `apps/synthorg` (Eve + AI SDK v4) | [0006](./specs/0006-unified-cli-and-tracing.md) |
| **Uniform API** | `services/core-api` v0.3 | [0004](./specs/0004-core-api.md) |
| **Worker** | `services/worker` | [0009](./specs/0009-training-worker-lifecycle.md) |
| **CLI / SDK** | `packages/cli`, `packages/synth-core` | 0006 |
| **ASN engine** | `packages/asn-engine` | [0003](./specs/0003-asn-embedding-engine.md) |
| **Eval gates** | `packages/eval-harness` | [0008](./specs/0008-eval-harness-and-gates.md) |
| **Public eval panel** | `packages/eval-public` | dumbmodel.com baselines |
| **Fleet UI** | `packages/ui-fleet` | 0007 |

## Production hosting (ADR-002)

| Layer | Host | Notes |
|---|---|---|
| Sites + control | **Vercel** | N projects, monorepo root dirs per site |
| `core-api` + `worker` | **Railway** | Root `Dockerfile`; two services (`api` / `worker`) |
| Postgres + pgvector | **Neon** | Shared `DATABASE_URL`; RLS per workspace |
| GPU trainer (future) | **Modal** | Spec 0011 stub |
| Redis (future) | **Upstash** | Rate limits + Arq when wired |

```bash
pnpm deploy:railway              # checklist + secrets template
pnpm deploy:railway:migrate      # Alembic → Neon
pnpm deploy:railway:exec         # Railway CLI deploy
pnpm vercel:link-fleet:exec      # link Vercel projects
pnpm vercel:env-fleet:exec       # push SYNTH_API_* to fleet
```

Runbook: [`infra/railway.md`](./infra/railway.md) · ADR: [`docs/adr/002-core-api-hosting.md`](./docs/adr/002-core-api-hosting.md).

## Site fleet (`apps/sites/`)

Each row is a **mini-org front** with its own Vercel project + domain + workspace API key.

| Site | Domain | Status |
|---|---|---|
| hub | bhenre.com | active — trained ASN model deployed |
| control | jcamd.com | active — fleet admin UI |
| dumbmodel | dumbmodel.com | active — public baseline proof |
| benchmark-lab | slasso.com | active — Phase A |
| research-rag | arxiviq.com | active — Phase A |
| finance-lab | TBD | stub — Phase B |

## Rules for cross-site work

1. **Never** call services/databases except through `@synthaembed/synth-core` → `core-api` (0006).
2. When adding or moving a site: update `config/fleet.json`, then fleet SDK picks it up (0007).
3. Python in `packages/` + `services/`; tenant UIs in `apps/sites/`; agent in `apps/synthorg`.
4. ML changes need eval gates (0003, 0008). Narrative claims follow `SCIENCE_REVIEW.md`.
5. v1 = simulation only — no live trading (0001 guardrails).
6. Use `synth fleet context [siteId]` or Eve tool `fleet_context` before multi-site edits.

## Quick dev

```bash
pnpm install && uv sync --all-packages --extra dev --extra model

pnpm dev:stack && pnpm db:migrate    # Postgres :5433
pnpm dev:api                         # :8000
pnpm dev:worker                      # ASN jobs

pnpm bootstrap:orgs                  # data/workspaces/*.env
pnpm kickoff:orgs                     # hill-climb Phase A orgs

pnpm dev:fleet                       # hub, control, dumbmodel, labs
.\scripts\fleet-review.ps1 -Open     # Windows: review all site UIs
pnpm --filter @synthaembed/synthorg dev

pnpm prod:deploy                     # production checklist (dry-run)
pnpm build:context --agent cursor    # B.U.I.L.D. digest for session boot

pnpm review                          # build all sites
uv run pytest packages/asn-engine services/core-api/tests -q

# Evidence / ablations
pnpm evidence:collect
pnpm evidence:ablation
uv run python scripts/engine_proof.py
```

Generate pair-program context:

```bash
pnpm exec node --experimental-strip-types packages/cli/src/index.ts fleet context
```

## Spec traceability

Before implementing a feature, find or create the spec in `specs/`. Code without a spec should
either attach to an existing one or add `NNNN-*.md` from `0000-template.md`.
