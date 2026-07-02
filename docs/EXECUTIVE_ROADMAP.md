# Blue Hen RE — Executive Roadmap (Phase A)

**Date:** 2026-06-28 · **Audience:** stakeholders, operators, partners  
**Horizon:** Now → 90 days · **Format:** Now / Next / Later

---

## One-line thesis

Blue Hen RE is a **fleet of domain-specialized embedding mini-orgs** — one shared engine, many tenant sites — that beat zero-shot commercial models on **your** corpus, with an **edge serving tier** (small, quantized) for home and device deploy.

**Evidence today:** 4/4 Phase A tenants beat BGE on in-domain retrieval (+0.023–0.058 nDCG). Weight surgery as default anti-collapse: **rejected** (0/4 fleet gate). Product story = **domain adaptation + Matryoshka/int8 edge**, not unreplicated ASN claims.

---

## What ships in Phase A

| Surface | Domain | Role |
|---|---|---|
| Platform hub | bhenre.com | Dashboard, ledger, fleet map |
| Operations center | jcamd.com | Operator control plane |
| Validation lab | slasso.com | Benchmark exams vs commercial baselines |
| Applied research | arxiviq.com | arXiv RAG demo + method museum |
| Public proof | dumbmodel.com | Honest baseline compare (Hall of Cone) |

**Backend:** FastAPI `core-api` + ASN worker on **Railway** + **Neon** Postgres (RLS per tenant). Sites on Vercel only — never host PyTorch/API on edge.

---

## Status snapshot

| | Count |
|---|---|
| In progress | 5 |
| Blocked | 3 |
| At risk | 1 |
| Completed recently | research-rag local re-kickoff (`asn-7901034`), arxiviq tier compare live, literature radar, Vercel bootstrap scripts |

---

## Now (committed — next 2–4 weeks)

| Priority | Initiative | Status | Outcome |
|---|---|---|---|
| P0 | **Prod stack:** Neon Postgres + core-api + worker on Railway | Blocked | Live `/v1/search` for all fleet sites |
| P0 | **Vercel fleet link** (5 projects) + per-site API keys | Not started | Sites call prod API, not localhost |
| P0 | **Domain cutover** to monorepo builds | Not started | bhenre, jcamd, slasso, arxiviq, dumbmodel |
| P1 | **research-rag re-kickoff** (39 arXiv papers) | Done locally | `asn-7901034` · prod Neon cutover next |
| P1 | **Barlow real-text bake-off** | Not started | Default training recipe decision |
| P1 | **Weekly literature radar** | On track | Avoid reinventing published SOTA |

---

## Next (1–3 months)

- **Observability** — Sentry or Axiom on fleet sites + API  
- **Upstash Redis** — rate limits, cache, feedback routing  
- **slasso exam runner** — Research → BD promotion automation  
- **Collapse-regime study** vs BGE/e5/Qwen3 — honest SOTA boundary  
- **Modal GPU trainer** — scale-out training (Operator account pending)

---

## Later (3–6+ months)

- Omni-market Phase B1 — Crawl4AI ingest, semantic dedup (`specs/0013` B1)
- Finance / omni applied-test org — **simulation active** (`finance-lab`, Spec 0013 B0)
- LLM Conductor for recipe generation  
- Platform SSO / tenant accounts  
- Live trading / live capital — **explicitly out of scope** until Phase C Operator charter

---

## Critical path

```
Neon + Railway (core-api/worker)
    → bootstrap orgs + per-site API keys
    → Vercel env + domain attach
    → research-rag re-kickoff
    → Barlow bake-off → slasso BD pilot
```

---

## Risks

| Risk | Mitigation |
|---|---|
| Prod deploy delayed | ADR-002 Railway path documented; Neon via Marketplace |
| Overclaiming ASN surgery | SCIENCE_REVIEW + EVIDENCE gates; dumbmodel honesty layer |
| Docker/local DB flakiness on Windows | `docker compose restart postgres`; prioritize Neon for prod |
| Five Vercel projects × env drift | `pnpm vercel:link-fleet` automation |

---

## Decisions needed from Operator

1. **Neon** — provision via `vercel integration add neon` on hub project; set `DATABASE_URL`
2. **Railway** — execute `INF-003` / `pnpm deploy:railway:exec` (ADR-002 **accepted**; runbook ready)
3. **Vercel fleet** — `pnpm vercel:link-fleet:exec` + `vercel:env-fleet:exec` after Railway URL live
4. **Modal** GPU tier when trainer production is prioritized (Spec 0011)  

---

## Success metrics (Phase A exit)

- All five locked domains serve monorepo builds with live retrieval  
- One full cycle: Research recipe → slasso exam → deploy charter  
- arxiviq case study cites dated `EVIDENCE.md` rows  
- No marketing claim above measured gates  

---

*Detail: `TASKS.md` · Research: `docs/RESEARCH_ORG_ROADMAP.md` · Architecture: `docs/FRONTIER_ARCHITECTURE.md`*
