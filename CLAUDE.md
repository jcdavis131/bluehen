# Memory

## Me

**Operator** — owner/builder of Blue Hen RE (SynthaEmbed OS). Approves specs, deploy gates, hosting, and Phase C guardrails. GitHub: jcdavis131.

→ SDD coding rules: `.claude/CLAUDE.md` · Session paste context: `HANDOFF.md`

## People

| Who | Role |
|-----|------|
| **Operator** | Human owner — Vercel/domains, spec sign-off, hosting decisions |
| **Eve** | Fleet Director agent (`apps/synthorg`) — cross-tenant lifecycle orchestration |
| **Cursor** | Pair-programming dev agent — implements from specs + HANDOFF |
| **Claude** | Parallel agent — Modal trainer, autoresearch sweeps |

→ Full list: `memory/glossary.md` · Profiles: `memory/people/`

## Terms

| Term | Meaning |
|------|---------|
| **RE** | **Relay Engine** (platform brand) · **RAG Embeddings** (technical) — pair in customer copy |
| **Operating Loop** | Five-division closed-loop improvement model (Spec 0012) |
| **Operations Ledger** | `auto_research_ledger` — lifecycle stage log |
| **Lifecycle Run** | Full hill-climb (`/v1/research/hill-climb`) |
| **Validation Queue** | BD promotion queue (`content/fleet/bd/queue.json`) |
| **Research Registry** | Method catalog on Applied Research site |
| **ASN** | AwakenedSleepNet — training method |
| **deploy gate** | eval-harness threshold before production deploy |
| **SDD** | Spec-Driven Development |

→ Full glossary: `memory/glossary.md`

## Projects

| Name | What |
|------|------|
| **bluehenre** | Monorepo codename |
| **Storefront** | storefront · bhenre.com |
| **Headquarters** | hq · jcamd.com |
| **Validation Lab** | validation · slasso.com |
| **Applied Research** | research · arxiviq.com |
| **Baseline Comparison** | dumbmodel · dumbmodel.com |
| **Simulation Lab** | simulation · signals.bhenre.com |
| **Observatory** | observatory · training.jcamd.com |
| **Data Refinery** | refinery · data.bhenre.com (planned) |

→ Details: `memory/projects/` · Registry: `config/fleet.json`

## Preferences

- Python backend, React/Next.js frontend
- **Enterprise B2B voice** — measured, evidence-backed (not sports metaphors in product UI)
- Spec before code; EVIDENCE.md + SCIENCE_REVIEW.md normative
- Windows dev · pnpm + uv · Postgres :5433

## Lookup

```
Request → CLAUDE.md → memory/glossary.md → memory/people|projects/ → ask Operator
```
