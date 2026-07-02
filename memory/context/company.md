# Company Context

## Tools & systems

| Tool | Used for | Internal name |
|------|----------|---------------|
| **pnpm + turbo** | JS monorepo build/dev | — |
| **uv** | Python deps / pytest | — |
| **Vercel** | Fleet site deploys (N projects) | "the edge" |
| **Neon** | Prod Postgres (planned) | — |
| **Docker** | Local Postgres :5433, Redis | `dev:stack` |
| **Modal** | GPU trainer scale-out | trainer service |
| **Ollama** | Local LLM for agents | `SYNTH_LOCAL_LLM_*` |
| **core-api** | All platform mutations/reads | "the API" / chokepoint |
| **synth-core** | Uniform TS/Python SDK | required access layer |
| **pgvector** | Tenant-scoped embeddings | document_chunks table |

## Teams (synthetic org divisions)

| Team | What they do | Agent / owner |
|------|--------------|---------------|
| **Race Control** | Priorities, budgets, gap routing | Operator + Eve |
| **Fueling Station** | Ingest, chunk, pairs | data_harvester |
| **Training Lab** | Train, ablate, EVIDENCE | Cursor lab, autoresearch |
| **Qualifying** | Exams, pilots, charter | slasso operators, qa_benchmark |
| **Race Day** | Deploy, index, serve | Platform SRE, worker |

## Processes

| Process | What it means |
|---------|---------------|
| **SDD gate** | Spec approved → plan approved → code → verify |
| **Circuit lap** | Hill-climb lifecycle for one workspace |
| **Split report** | User feedback logged to Race Log |
| **deploy gate** | eval-harness must pass before `deploy` stage |
| **Operator approval** | Required for BD → Execution charter, Phase C |
| **bootstrap:orgs** | Provision workspaces from fleet.json |
| **evidence campaign** | Batch experiments → EVIDENCE.md rows |

## Phases

| Phase | Focus | Hard rule |
|-------|-------|-----------|
| **A** | RAG orgs, fleet sites, slasso exams | nDCG deploy gates |
| **B** | Finance simulation org | Paper trading only |
| **C** | Live trading | Deferred — separate spec + compliance |

## Normative docs (never contradict)

| Doc | Role |
|-----|------|
| `SCIENCE_REVIEW.md` | Integrity audit |
| `EVIDENCE.md` | Measured claims only |
| `WHITEPAPER.md` | ASN scientific center |
| `docs/adr/001-*.md` | Platform architecture |

## Architecture (one line)

Many Vercel circuit stops → synth-core → core-api → Postgres (RLS) → worker + Modal.
