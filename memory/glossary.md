# Glossary

Workplace shorthand, acronyms, nicknames, and internal language for Blue Hen RE.

## Acronyms

| Term | Meaning | Context |
|------|---------|---------|
| **RE** | Relay Engine · RAG Embeddings | Dual brand — pair in public copy |
| **ASN** | AwakenedSleepNet | Training method; whitepaper center |
| **SDD** | Spec-Driven Development | `.claude/CLAUDE.md` gate |
| **RLS** | Row-Level Security | Postgres tenant isolation (Spec 0002) |
| **BD** | Validation & Charter division | Benchmark certification leg |
| **RAG** | Retrieval-Augmented Generation | Product domain |
| **nDCG@10** | Normalized DCG at 10 | Primary retrieval eval metric |
| **MRL** | Matryoshka Representation Learning | Truncation / edge serving tiers |
| **MTNN** | Multi-Task Multimodal Network | Finance reference mini-org |
| **BFF** | Backend-for-frontend | Next.js `/api/*` routes hold `SYNTH_API_KEY` |
| **P0/P1/P2/P3** | Priority levels | `TASKS.md` — P0 = prod ship blocker |

## Internal terms

| Term | Meaning |
|------|---------|
| **Lifecycle Run** | Hill-climb: collect → train → deploy → index |
| **Operations Ledger** | Experiment ledger (`auto_research_ledger`) |
| **Live Search** | Retrieval UI on any product surface |
| **Operations Feedback** | Feedback form → ledger |
| **Validation Queue** | BD promotion queue (`content/fleet/bd/queue.json`) |
| **Research Registry** | Method museum (research-lab page) |
| **Evidence Rows** | Rows in EVIDENCE.md |
| **Production Model** | Currently deployed org embedding model |
| **Cost Budget** | Per-workspace daily cost ceiling |
| **Collapse** | Representation collapse (effective rank crater) — technical term |
| **Hall of Cone** | dumbmodel baseline leaderboard — lowest erank wins |
| **deploy** | Deploy model + index to pgvector (Production leg) |
| **kickoff** | `pnpm kickoff:orgs` — lifecycle run all Phase A tenants |
| **the whitepaper** | WHITEPAPER.md — normative ASN doc |
| **the handoff** | HANDOFF.md — paste context for coding agents |
| **eval gate** | Metric threshold in eval-harness before deploy |

## Nicknames → full names

| Nickname | Person / agent |
|----------|----------------|
| **Operator** | Human repo owner (jcdavis131) |
| **Eve** | Fleet Director synthetic agent |
| **Cursor** | Cursor IDE coding agent |
| **Claude** | Claude terminal / cloud agent (trainer, sweeps) |
| **hen** | Blue Hen mascot — trained org model (vs cone/dumb model) |
| **cone** | Dumb Model mascot — collapsed embedding |

## Project codenames

| Codename | Also called | Project |
|----------|-------------|---------|
| **bluehenre** | blue hen re folder | Monorepo / platform root |
| **SynthaEmbed OS** | synthaembed | Internal platform name |
| **Storefront** | bhenre, hub | bhenre.com tenant dashboard |
| **Headquarters** | jcamd, control | jcamd.com operator plane |
| **Validation Lab** | slasso, benchmark-lab, agent-lasso | slasso.com RAG benchmarks |
| **Applied Research** | arxiviq, research-rag, arxiv exam | arxiviq.com research RAG |
| **Baseline Comparison** | dumbmodel, Hall of Cone | dumbmodel.com public proof |
| **Simulation Lab** | simulation, finance org | Phase B paper trading |
| **Phoenix** | *(unused — reserve)* | — |
| **the fleet** | product surfaces | All active mini-org sites |
| **Operating Loop** | closed loop | Five-division handoff cycle |

## Domain aliases

| Shorthand | Domain | Site id |
|-----------|--------|---------|
| bhenre | bhenre.com | storefront |
| jcamd | jcamd.com | hq |
| slasso | slasso.com | validation |
| arxiviq | arxiviq.com | research |
| dumbmodel | dumbmodel.com | dumbmodel |

## Operating Loop divisions

| Surface name | Division id | Handoff |
|--------------|-------------|---------|
| Platform Orchestration | orchestration | priorities & budgets |
| Data Operations | data | curated corpora |
| Research & Development | research | recipes & evidence |
| Validation & Charter | bd | production charter |
| Production | execution | live serving metrics |

## Operations Ledger stage decoder

| Stage | Label | Division |
|-------|-------|----------|
| collect | ingest | Data Operations |
| chunk | chunk | Data Operations |
| pairs | pair build | Data Operations |
| train | train | R&D |
| eval | evaluate | R&D |
| pilot | validation pilot | Validation |
| charter | production charter | Validation |
| deploy | deploy | Production |
| index | index | Production |
| feedback | operations feedback | all |

## Spec shorthand

| Ref | Topic |
|-----|-------|
| 0002 | Tenancy + RLS |
| 0005 | Conductor / LLM recipes |
| 0006 | synth-core only access |
| 0007 | Fleet registry |
| 0008 | Eval gates + BD queue |
| 0011 | Modal trainer |
| 0012 | Org divisions + closed loop |

## Dev command shorthand

| Command | Does |
|---------|------|
| `dev:stack` | Docker Postgres :5433 + Redis |
| `bootstrap:orgs` | Create workspaces + API keys |
| `kickoff:orgs` | Lifecycle run all Phase A orgs |
| `dev:site X` | One fleet site with workspace env |
| `dev:api` | core-api on :8000 |
| `dev:worker` | ASN job worker |
| `review` | Build all sites + typecheck |
| `evidence:fleet` | Fleet-wide ablation collection |
