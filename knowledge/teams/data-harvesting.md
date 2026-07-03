---
type: Team Report
title: Data Harvesting Team — run log
description: Living run log for the Data Harvesting Team (data division).
tags: [team, agents, data]
timestamp: 2026-07-03T23:58:28Z
---

You are the Data Harvesting team lead for Blue Hen RE (the Data
Miners division). Your mandate: keep the OKF dataset library growing with
point-in-time, provenance-carrying datasets the R&D team can train on.
You operate the continuous dataset builder (source registry + watch loop)
and curate new sources when coverage gaps appear. You may add sources to
the registry (additive only) when clearly justified by the platform's
research needs.
Operating rules (non-negotiable):
- Evidence-backed voice: never state a number you did not read from a tool.
- You may claim queue work conceptually but NEVER edit training code or deploy.
- Prefer small, reversible actions; anything irreversible goes in your report
  as a recommendation for the Operator instead.
- Finish with a concise report: what you observed, what you did, what you
  recommend next (max ~300 words).

Runs append below, newest first. Transcripts live in `data/agents/`.

# Runs

## 2026-07-03 — run `20260703-185827-data-harvesting`

| Duty | Status | Result |
|---|---|---|
| watch-tick | ok | `{"reports": [{"sourceId": "wiki-goals", "sources": 3, "action": "collected", "datasetId": "20260703-185827-wiki---goals-and-build-docs", "docs": 3, "chunks": 8, "fingerprint": "5ce6872b517861f7"}, {"sourceId": "evidence-ledger", "sources": 2, "action": "collected", "datasetId": "20260703-185827-evid…` |
| dataset-inventory | ok | `{"recent": [{"id": "20260703-185828-arxiv-cs-ir-daily-listing--rss", "docs": 1, "chunks": 27}, {"id": "20260703-185827-wiki---goals-and-build-docs", "docs": 3, "chunks": 8}, {"id": "20260703-185827-validation-lab---promotion-queue-and-certificati", "docs": 1, "chunks": 1}, {"id": "20260703-185827-ev…` |

**LLM loop:** skipped (GLM_API_KEY not set)


## 2026-07-03 — orchestrated run (judgment layer)

Deterministic duties ran first (run `20260702-183000-data-harvesting`, watch-tick ok, dataset-inventory ok, LLM loop skipped — GLM_API_KEY not set). Judgment pass below.

**Sources added (2, additive, registry now 6 sources):**

- `validation-promotion-scorecards` — `content/fleet/bd/queue.json` + glob `content/fleet/bd/scorecards/*.json`, 1440 min. The Validation Lab venture had zero registry coverage; queue.json carries method/gate metrics (e.g. `tenantVsBge: +0.023–0.058 nDCG`, `syntheticRobustScore: 1.486`) — relevance-label signal for R&D at zero acquisition cost. The scorecards glob matched 0 files today (directory is empty) but harvests certification scorecards automatically once published.
- `arxiv-rss-cs-ir` — `https://rss.arxiv.org/rss/cs.IR`, 1440 min (arXiv listings update daily). The existing `arxiv-raw` glob points at `docs/raw/arxiv/`, which contains 0 files, so the research venture had a registered-but-dry source. The cs.IR daily feed supplies real title/abstract text aligned with the retrieval-assistant venture — the highest-value input for contrastive pair building.

**Materialized this run (`datalab watch --once`):**

- `20260702-185048-validation-lab---promotion-queue-and-certificati` — 1 doc, 1 chunk (queue.json).
- `20260702-185049-arxiv-cs-ir-daily-listing--rss` — 1 doc, 35 chunks, ~16,206 tokens; chunk spot-check shows genuine abstract text, not an error page.
- All 4 pre-existing sources: not due / unchanged (no reports emitted).

**Gaps deliberately left open:**

- Storefront leads (`data/leads/leads.jsonl`) and simulation waitlist — leads paths are prohibited for registration.
- Simulation telemetry under `data/` — gitignored, not repo-visible; only repo-visible paths may be registered.
- Research query logs — consent UI not shipped (Spec 0015 gate); nothing to register until then.
- Validation customer eval sets — NDA-bound; only cleared scorecards flow in (now covered by the new glob).

**Escalations for the orchestrator:**

1. `docs/raw/arxiv/` is empty — `pnpm literature:radar` has not populated the harvest dir; `arxiv-raw` stays dry until it runs.
2. GLM_API_KEY unset — the agentkit LLM loop is skipped on every run.
3. `content/fleet/bd/scorecards/` is empty — no certification runs published yet; the new glob is armed but idle.


## 2026-07-02 — run `20260702-183000-data-harvesting`

| Duty | Status | Result |
|---|---|---|
| watch-tick | ok | `{"reports": []}` |
| dataset-inventory | ok | `{"recent": [{"id": "20260702-110239-wiki---goals-and-build-docs", "docs": 3, "chunks": 8}, {"id": "20260702-110239-evidence-and-science-review-ledgers", "docs": 2, "chunks": 27}, {"id": "20260702-104700-wiki-smoke", "docs": 2, "chunks": 5}]}` |

**LLM loop:** skipped (GLM_API_KEY not set)


## 2026-07-02 — run `20260702-172950-data-harvesting`

| Duty | Status | Result |
|---|---|---|
| watch-tick | ok | `{"reports": [{"sourceId": "dumbmodel-health-checks", "sources": 0, "action": "empty", "failures": []}]}` |
| dataset-inventory | ok | `{"recent": [{"id": "20260702-110239-wiki---goals-and-build-docs", "docs": 3, "chunks": 8}, {"id": "20260702-110239-evidence-and-science-review-ledgers", "docs": 2, "chunks": 27}, {"id": "20260702-104700-wiki-smoke", "docs": 2, "chunks": 5}]}` |

**LLM loop:** skipped (GLM_API_KEY not set)


## 2026-07-02 — run `20260702-120646-data-harvesting`

| Duty | Status | Result |
|---|---|---|
| watch-tick | ok | `{"reports": []}` |
| dataset-inventory | ok | `{"recent": [{"id": "20260702-110239-wiki---goals-and-build-docs", "docs": 3, "chunks": 8}, {"id": "20260702-110239-evidence-and-science-review-ledgers", "docs": 2, "chunks": 27}, {"id": "20260702-104700-wiki-smoke", "docs": 2, "chunks": 5}]}` |

**LLM loop:** skipped (GLM_API_KEY not set)

