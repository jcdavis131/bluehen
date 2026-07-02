# Agent init — Blue Hen RE

Paste this doc (or the prompt below) when onboarding a new coding agent.

---

## What this is

**Blue Hen RE** is a **fleet of domain-specialized embedding mini-orgs**: one shared engine (`core-api` + ASN worker), many tenant frontends (Vercel sites). Each org runs **collect → train → eval → deploy** to beat zero-shot embedders (BGE, e5) on *its* corpus, with an **edge tier** (Matryoshka t=8 + int8).

- **Not** a novel ML paper repo — honest product = domain adaptation + measured gates (`EVIDENCE.md`, `SCIENCE_REVIEW.md`).
- **Phase A:** hub, control, dumbmodel, benchmark-lab, research-rag (finance-lab stub).
- **Repo:** `C:\Users\jcdav\bluehenre` (pnpm monorepo + Python via `uv`).

---

## Init sequence (do this first)

```bash
cd C:\Users\jcdav\bluehenre

# 1. Orient
#    Read: HANDOFF.md (mission), AGENTS.md (rules), TASKS.md (today's work)

# 2. Blockers + pick work
uv run python scripts/pick_task.py blockers
uv run python scripts/pick_task.py list

# 3. Claim one task
uv run python scripts/pick_task.py claim SITE-001 --agent <your-name>

# 4. Read linked spec (if any) in specs/NNNN-*.md

# 5. After completing
uv run python scripts/pick_task.py done SITE-001
uv run python scripts/pick_task.py render
```

---

## Source-of-truth map

| Need | File |
|---|---|
| **What to work on** | `config/work_queue.json` + `TASKS.md` |
| **Why we're building it** | `HANDOFF.md`, `docs/EXECUTIVE_ROADMAP.md` |
| **Acceptance criteria** | `specs/README.md` → `specs/NNNN-*.md` |
| **Sites & domains** | `config/fleet.json` |
| **ML claims / evidence** | `EVIDENCE.md`, `SCIENCE_REVIEW.md` |
| **Autoresearch only** | `program.md`, `.claude/autoresearch-delegate.md` |
| **Research synthesis** | `docs/FRONTIER_ARCHITECTURE.md` |
| **B.U.I.L.D. wiki / goals** | `docs/wiki/BUILD.md`, `docs/wiki/GOALS.md` |
| **Production deploy** | `infra/railway.md`, `docs/adr/002-core-api-hosting.md` |

---

## Architecture (one diagram)

**Local:** Docker Postgres `:5433` · **Production:** Vercel → Railway → Neon (ADR-002)

```
apps/sites/*  (Next.js, Vercel)  →  synth-core  →  core-api (Railway)  →  Neon + pgvector
                                              ↑
                                    worker (Railway) — train/eval/deploy
packages/asn-engine (training math)
apps/synthorg (Eve fleet agent)
```

**Rule:** Site UIs never talk to Postgres directly — only `core-api` via API keys (`0006`).

**Prod deploy:** `infra/railway.md` · `pnpm deploy:railway*` · `pnpm vercel:env-fleet:exec`

---

## Current blockers (check live)

Run `pnpm work:blockers`. As of last update:

- **BLK-DISK** — C: drive ~full → Docker broken, no local stack
- **BLK-DOCKER** — no Postgres/Redis until disk fixed
- **BLK-PROD** — Neon + Railway + Vercel fleet link (Operator)

**Work that does NOT need Docker:** site UI, scripts, autoresearch synthetic, spec implementation, `AR-306+` code edits.

---

## Divisions (pick your lane)

| Division | Examples | Typical paths |
|---|---|---|
| **research** | Barlow bake-off, autoresearch, literature radar | `scripts/`, `packages/asn-engine/` |
| **execution** | API, worker, kickoff, deploy | `services/` |
| **comms** | Museum pages, tier compare UI | `apps/sites/` |
| **bd** | slasso exams, scorecards | `packages/eval-public/`, slasso site |
| **infra** | Docker, Railway, Vercel | `infra/`, `scripts/` |
| **agent** | Eve tools, trace wiring | `apps/synthorg/` |

---

## Hard rules

1. Find or attach a **spec** before non-trivial features (`specs/`).
2. **No overclaiming** — product claims must match `EVIDENCE.md` rows.
3. **ASN weight surgery** is rejected (0/4 fleet) — do not ship as default.
4. **Autoresearch:** edit only `scripts/autoresearch_train.py` during synthetic nights.
5. **No live trading** (v1 guardrail).
6. Mark tasks **claim → done** in `work_queue.json` via `pick_task.py`.

---

## Dev commands (when stack is up)

```bash
pnpm install && uv sync --all-packages --extra dev --extra model
pnpm dev:stack && pnpm db:migrate && pnpm bootstrap:orgs
pnpm dev:api          # :8000
pnpm dev:worker
pnpm dev:fleet        # all Phase A sites
pnpm review           # build all sites
```

Research loop (background, no Docker): `pnpm research:loop`

---

## Suggested first tasks for a new agent

| ID | Good for | Needs Docker? |
|---|---|---|
| SITE-001 | Frontend — hub experiment museum | No |
| SITE-002 | Frontend — arxiviq /methods | No |
| RAG-502 | Python — chunk ablation script | No (to implement) |
| AR-306 | ML — depth-2 GELU in autoresearch | No |
| SPEC-006 | Agent — Eve subagents | No |
| INF-000 | Ops — free disk | Human + shell |

---

## Bootstrap prompt (copy into new chat)

```
You are joining Blue Hen RE. Read docs/AGENT_INIT.md and .claude/TEAM.md.
Run: uv run python scripts/pick_task.py blockers && pick_task.py list
Claim a task, read its spec, implement, pick_task.py done + render.
Cursor rules: .cursor/rules/ · Claude: .claude/CLAUDE.md
```

Maintainer: regenerate TASKS.md with `pnpm work:render`.
