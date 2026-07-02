# Research Org Roadmap — Blue Hen RE (SynthaEmbed OS)

**Purpose:** Step-by-step plan to continue **research-rag**, productize RAG embeddings, and run a
**multi-agent synthetic organization** from lab → BD pilots → industry serving.

**Read with:** `program.md`, `EVIDENCE.md`, `SWEEP_REPORT.md`, `HANDOFF.md`, **`specs/0012-synthetic-org-divisions-and-handoffs.md`**, terminal 3 Claude session.

**Thesis (evidence-backed, 2026-06-28):**
- **Product:** domain-adapted org embeddings beat zero-shot commercial models *on tenant corpora* (4/4 sites).
- **Method:** Barlow Twins leads synthetic robustness (891 runs); VICReg wins collapse-prone regimes only.
- **Serving:** Matryoshka t=8 + int8 full-dim are the edge story (Family B).
- **Not shipped:** weight surgery as anti-collapse; ASN rank gate 0/4 fleet.

---

## 1. Synthetic organization (who does what)

> **Normative spec:** [0012 — Org divisions & closed loop](../specs/0012-synthetic-org-divisions-and-handoffs.md) and `config/org-divisions.json`.
> This section is the operational summary; 0012 is authoritative for ownership and handoffs.

```mermaid
flowchart TB
  subgraph RESEARCH["Research Division (lab agents)"]
    AR[autoresearch loop\nCursor + Claude]
    TPE[bayes_search TPE\narchitecture sweep]
    CON[Conductor / Eve synthorg\nweakest-slice hill-climb]
  end

  subgraph RESEARCH_WEB["Research Communications (sites)"]
    HUB[bhenre.com hub\nledger + fleet map]
    RR[arxiviq.com research-rag\napplied science demo]
    DM[dumbmodel.com\nHall of Cone + honesty]
  end

  subgraph BD["Business Development (validation)"]
    BL[slasso.com benchmark-lab\nexams + leaderboards]
    PANEL[Commercial baseline panel\nBGE / e5 / MiniLM]
  end

  subgraph EXEC["Business Execution (implementation)"]
    API[core-api + worker]
    SRV[/v1/embed + /v1/search\nfull + MRL tiers]
    TENANT[Per-org deploy + pgvector]
  end

  RESEARCH -->|promoted recipe| RESEARCH_WEB
  RESEARCH -->|gate pass| BD
  BD -->|pilot charter| EXEC
  EXEC -->|metrics| RESEARCH
```

| Team | Agents / owners | Primary output | Gate to next team |
|---|---|---|---|
| **Research Lab** | Cursor (implement), Claude terminal 3 (delegate), Eve subagents | `EVIDENCE.md` rows, recipes, `SWEEP_REPORT.md` | Measured Δ on real text + no regression |
| **Research Comms** | Hub + research-rag + dumbmodel frontends | Public experiment museum, arXiv demo | UX ships with JSON snapshot dates |
| **BD** | benchmark-lab org, Operator | Pilot scorecards vs commercial | ΔnDCG ≥ 0.02 on tenant task |
| **Execution** | worker, core-api, Modal trainer (TBD) | Deployed models, two serving tiers | SLA + cost ceiling |

---

## 2. Current state (verified)

| Asset | Status |
|---|---|
| Synthetic sweep | **891 experiments** — Barlow mean 1.422, best **1.486** (`SWEEP_REPORT.md`) |
| Real-text Family C | InfoNCE + VICReg **neutral**; domain tune **+0.03** in-domain kNN |
| Tenant vs BGE | **4/4** sites win (+0.023–0.058 nDCG) |
| autoresearch loop | Wired: champion, KEEP/DISCARD, Cursor hooks |
| research-rag site | Stub + `ArxivExamDemo`; needs recipe + experiment UI |
| Claude terminal 3 | Propagating #1–#4 (Barlow real-text, serving, WHITEPAPER, UI) |

---

## 3. Phase 0 — Close the synthetic → real-text gap (NOW)

**Goal:** Confirm or falsify **Barlow > VICReg > InfoNCE** on real text (terminal 3 #1).

### Step 0.1 — Real-text method bake-off (Claude + Cursor split)

| Step | Owner | Action | Deliverable |
|---|---|---|---|
| 0.1a | Cursor | Add `scripts/realtext_methods.py`: train MiniLM with **InfoNCE / VICReg / Barlow** on AG News + **research-rag corpus** pairs | `data/evidence/realtext_methods.json` |
| 0.1b | Claude (terminal 3) | Run same script on arxiviq tenant corpus (`data/corpora/research-rag/`) | Append to JSON |
| 0.1c | Either | Metrics: in-domain kNN, nDCG@10, OOD (DBpedia), robust_score proxy (t=8 + int8 if served via API) | `EVIDENCE.md` §3.9 |
| 0.1d | Human | **Verdict rule:** promote Barlow to default recipe only if beats InfoNCE on **both** AG News and research-rag by ΔnDCG ≥ 0.005 | One row in rejected/accepted table |

**Commands (stub):**
```bash
uv run python scripts/realtext_methods.py --site research-rag --methods infonce,vicreg,barlow
uv run python scripts/domain_sweep.py --out data/sweeps/C1_barlow.jsonl  # extend for barlow arm
```

### Step 0.2 — Port Wave 2 winner into production train path

| Step | Action |
|---|---|
| 0.2a | Add `loss.barlowLambda` to `train_loop.py` recipe schema (mirror `vicregVar`) |
| 0.2b | Default fleet recipe: `{ loss: { infoNceTemp: 0.07, barlowLambda: 0.02 }, asn: { enabled: false } }` |
| 0.2c | Re-train **research-rag** org via worker; log erank + nDCG to ledger |
| 0.2d | Compare deployed embed vs BGE on `/v1/search` rotating slice |

### Step 0.3 — Calibrate autoresearch baseline

| Step | Action |
|---|---|
| 0.3a | Set `data/autoresearch/best.json` from measured champion run (not aspirational 1.465) |
| 0.3b | Claude: `claude-1` depth=2 gelu; Cursor: `cursor-2` barlow_lambda sweep via orchestrator |
| 0.3c | 3 consecutive KEEP → trigger Family C + research-rag retrain |

**Exit gate Phase 0:** Barlow or InfoNCE winner documented on real text; research-rag checkpoint redeployed.

---

## 4. Phase 1 — Two serving tiers + API (terminal 3 #2–#3)

**Goal:** Product-grade **full-quality** and **edge (MRL + int8)** embed endpoints.

### Step 1.1 — Serving contract

| Tier | API param | Behavior | Evidence link |
|---|---|---|---|
| **Full** | `truncate_dims=384` (or model dim) | Best retrieval quality | Tenant baseline |
| **Edge** | `truncate_dims=8`, `quant=int8` | Cheap serve; report drop@8 | Family B (~0.33 kNN at t=8) |

| Step | Action | File |
|---|---|---|
| 1.1a | Document tiers in spec 0004 | `specs/0004-core-api.md` |
| 1.1b | Ensure `POST /v1/embed` accepts `truncate_dims`, `quant` | `services/core-api` |
| 1.1c | Return metadata: `effectiveRank`, `tier`, `modelVersion` | response schema |
| 1.1d | Integration test: same text, both tiers, latency logged | `services/core-api/tests/` |

### Step 1.2 — research-rag as first customer

| Step | Action |
|---|---|
| 1.2a | `ArxivExamDemo` calls `/v1/search` with org key — show **full vs edge** side-by-side |
| 1.2b | Display retrieval diff for one arXiv question (passage highlight) |
| 1.2c | Link to ledger entry for current model version |

**Exit gate Phase 1:** arxiviq.com demo uses live two-tier API; p95 latency documented for edge tier.

---

## 5. Phase 2 — Research website & experiment museum (terminal 3 #4 + your UI ask)

**Goal:** Demo **every variation the research team tried** — honest museum, not marketing fluff.

### Step 2.1 — Data layer for the museum

| Step | Action |
|---|---|
| 2.1a | `GET /v1/research/experiments` — read-only aggregate of `data/sweeps/*.jsonl`, `EVIDENCE.md` changelog, `progress.jsonl` |
| 2.1b | Static fallback: `data/evidence/experiment_index.json` generated by `scripts/build_experiment_index.py` |
| 2.1c | Each experiment card: family, method, score, verdict (supported/neutral/rejected), snapshot date |

### Step 2.2 — Site pages

| Site | Page | Content |
|---|---|---|
| **bhenre.com** | `/research` | Timeline: surgery→VICReg→Barlow arc; link to SWEEP_REPORT |
| **bhenre.com** | `/research/ledger` | Live experiment ledger (existing hub widget + API) |
| **arxiviq.com** | `/methods` | Methods tried on *this* org's corpus; current deployed recipe |
| **dumbmodel.com** | `/museum` | Collapse failures + Hall of Cone; link to supported claims only |
| **slasso.com** | `/candidates` | **BD queue** — recipes awaiting pilot (see Phase 3) |

### Step 2.3 — UI components (shared `@synthaembed/ui-fleet`)

| Component | Purpose |
|---|---|
| `ExperimentCard` | method, robust_score, knn_full/t8/int8 sparkline |
| `MethodCompare` | A/B/C arms on same corpus |
| `TierToggle` | full vs edge embed preview |
| `PromotionBadge` | research → BD → execution stage |

**Exit gate Phase 2:** `pnpm review` green; hub + arxiviq + dumbmodel show experiment data with dates.

---

## 6. Phase 3 — BD promotion workflow (your “worthy of testing” pipeline)

**Goal:** Research promotes **chartered pilots**; BD runs them on real-world tasks; Execution deploys winners.

### Step 3.1 — Promotion criteria (research → BD)

A recipe enters `data/bd/queue.json` when **all** pass:

1. Real-text bake-off: ΔnDCG ≥ 0.005 vs InfoNCE on target corpus  
2. No OOD forgetting > 2% kNN vs raw backbone (Family C rule)  
3. Edge tier: knn_t8 ≥ 0.30 on synthetic panel (or documented tradeoff)  
4. `SCIENCE_REVIEW.md` — no overclaim language in card copy  

### Step 3.2 — BD pilot template (benchmark-lab)

| Step | Action |
|---|---|
| 3.2a | Define 3 **benchmark exams** (basic / multi-hop / long-context) per slasso.com spec |
| 3.2b | Run **commercial panel** (BGE-small, e5-small, org-tuned) — same exams |
| 3.2c | Scorecard JSON → `data/bd/scorecards/{recipeId}.json` |
| 3.2d | Operator approves ≥1 recipe for Execution charter |

### Step 3.3 — Execution charter (BD → production)

| Step | Action |
|---|---|
| 3.3a | Update `config/recipes/{siteId}.json` with winning recipe |
| 3.3b | worker retrain → eval gates → deploy both tiers |
| 3.3c | Fleet admin (`jcamd.com`) shows promotion event in ledger |
| 3.3d | dumbmodel.com updates Hall of Cone if baseline beaten |

**Exit gate Phase 3:** One full cycle: Barlow or InfoNCE candidate → BD exam → research-rag deploy.

---

## 7. Phase 4 — research-rag org (arxiviq.com) end-to-end

**Goal:** Applied science RAG org as the **reference mini-org** for industry storytelling.

### Step 4.1 — Corpus & lifecycle

| Step | Action |
|---|---|
| 4.1a | Expand `data/corpora/research-rag/` — arXiv CS.CL subset (100–500 papers) via harvester |
| 4.1b | `kickoff_lifecycle.py` with Barlow/InfoNCE winner recipe |
| 4.1c | pgvector index ≥500 chunks (scale from 8) |
| 4.1d | Rotating eval slice weekly (Conductor spec 0005) |

### Step 4.2 — Applied test (arxiv exam)

| Step | Action |
|---|---|
| 4.2a | Port `arxiv_exam_app` exam logic into `packages/eval-public` |
| 4.2b | Exam runs against org embed + BGE baseline; results on arxiviq homepage |
| 4.2c | Publish **one** honest case study PDF/blog (method + numbers + limits) |

### Step 4.3 — Industry serving narrative

| Step | Action |
|---|---|
| 4.3a | WHITEPAPER §1 + §11: domain adaptation + cheap serving (demote surgery) |
| 4.3b | Pricing story: edge tier cost vs commercial API embed (internal spreadsheet) |
| 4.3c | `dumbmodel.com` funnel: “How dumb is your embedding?” → arxiviq live demo |

**Exit gate Phase 4:** arxiviq.com runs exam on live index; case study cites `EVIDENCE.md` dates.

---

## 8. Phase 5 — Agent operating model (Cursor + Claude + Eve)

Inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch) + your dual-agent setup.

### Daily research loop

| Time | Agent | Task |
|---|---|---|
| Night | Claude terminal 3 | `program.md` + `.claude/autoresearch-delegate.md` — 6–12 autoresearch runs |
| Day | Cursor | Implement hooks, API, UI; run `realtext_methods.py`; merge KEEPs to `train_loop` |
| Continuous | Eve (synthorg) | Weakest fleet slice → enqueue retrain job |
| Weekly | Human Operator | BD queue approval; WHITEPAPER changelog |

### Agent boundaries (strict)

| File / system | Cursor | Claude | Eve |
|---|---|---|---|
| `autoresearch_train.py` | ✓ | ✓ | ✗ |
| `train_loop.py`, worker | ✓ | propose only | enqueue |
| `EVIDENCE.md` | append measured | append measured | read |
| Site UI | ✓ | ✗ | ✗ |
| `program.md` | propose | read | read |

### Delegation prompts

**Claude terminal 3 (paste now):**
```
Read docs/RESEARCH_ORG_ROADMAP.md Phase 0. Execute Step 0.1b:
run realtext method bake-off on research-rag corpus when scripts/realtext_methods.py exists;
otherwise extend domain_sweep.py with barlow arm and run on AG News + research-rag pairs.
Log to EVIDENCE.md §3.9. Do not edit train_loop until bake-off verdict.
```

**Cursor (next session):**
```
Implement Phase 0 Step 0.1a + Phase 1 Step 1.1b–d + Phase 2.1a per docs/RESEARCH_ORG_ROADMAP.md.
```

---

## 9. 30 / 60 / 90 day milestones

| Day | Milestone | Success metric |
|---|---|---|
| **30** | Phase 0–1 complete | Barlow real-text verdict; two-tier `/v1/embed` live on research-rag |
| **60** | Phase 2–3 complete | Experiment museum on hub + dumbmodel; 1 BD scorecard published |
| **90** | Phase 4 complete | arxiviq exam on 500+ chunks; WHITEPAPER v4; first external pilot LOI |

---

## 10. What NOT to do next (save months)

1. **Do not** re-run 500× VICReg synthetic grids — confirmed at 891 runs.  
2. **Do not** enable three-tier surgery fleet-wide — gate 0/4.  
3. **Do not** claim SOTA until MTEB slice + fair zero-shot panel (Phase 3 BD).  
4. **Do not** split agents across duplicate TPE + autoresearch on the same hypothesis same night.  
5. **Do not** build finance Phase B until research-rag Phase 4 gate passes.

---

## 11. Immediate next 48 hours (ordered)

1. **Cursor:** implement `scripts/realtext_methods.py` (Phase 0.1a).  
2. **Claude terminal 3:** run bake-off on research-rag + AG News (Phase 0.1b).  
3. **Cursor:** wire Barlow into `train_loop.py` recipe if bake-off supports (Phase 0.2).  
4. **Cursor:** two-tier embed API + research-rag demo toggle (Phase 1).  
5. **Both:** append §3.9 to `EVIDENCE.md` with verdict.  
6. **Cursor:** `build_experiment_index.py` + hub `/research` page skeleton (Phase 2.1).  

---

*Generated 2026-06-28. Update when Phase gates close.*
