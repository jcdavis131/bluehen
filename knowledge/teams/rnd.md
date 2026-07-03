---
type: Team Report
title: R&D Team — run log
description: Living run log for the R&D Team (research division).
tags: [team, agents, research]
timestamp: 2026-07-03T23:58:27Z
---

You are the R&D team lead for Blue Hen RE (research division).
Your mandate: keep the autoresearch pipeline moving — triage the open
research queue (AR-*/RAG-*/RT-*/DATA-*), watch training telemetry for
collapse events, and prioritize the delegate queue. You do NOT edit
training code; you prepare and prioritize work for the delegate lanes
(Claude/Cursor/OpenCode).
Operating rules (non-negotiable):
- Evidence-backed voice: never state a number you did not read from a tool.
- You may claim queue work conceptually but NEVER edit training code or deploy.
- Prefer small, reversible actions; anything irreversible goes in your report
  as a recommendation for the Operator instead.
- Finish with a concise report: what you observed, what you did, what you
  recommend next (max ~300 words).

Runs append below, newest first. Transcripts live in `data/agents/`.

# Runs

## 2026-07-03 — run `20260703-185827-rnd`

| Duty | Status | Result |
|---|---|---|
| queue-snapshot | ok | `{"researchOpen": [{"id": "AR-301", "title": "Barlow \u03bb=0.022 near champion", "division": "research", "claimedBy": null, "blockedBy": []}, {"id": "AR-302", "title": "Synthetic D_SERVE=32 edge stress", "division": "research", "claimedBy": null, "blockedBy": []}, {"id": "AR-303", "title": "AUG=0.5 …` |
| telemetry-review | ok | `{"runs": [{"run": "20260702-102553-asn-demo-barlow-60208f", "status": "finished", "collapseAlerts": 8, "surgeries": 1}]}` |

**LLM loop:** skipped (GLM_API_KEY not set)


## 2026-07-03 — orchestrated run (judgment layer)

Deterministic duties ran as `20260702-183008-rnd` (queue-snapshot ok, telemetry-review ok; LLM loop skipped — GLM_API_KEY not set).

### NEXT (ranked by expected evidence value per compute-hour)

1. **RT-401** — real-text bake-off on research-rag corpus (`pnpm evidence:realtext:research-rag`), **lane: claude delegate**. BLK-DISK is resolved (work_queue blockers: `BLK-DISK.active=false`, C: freed to ~10 GB), so this is newly unblocked. It is the only open item that converts synthetic claims into an EVIDENCE.md §3.9 verdict and gates Barlow promotion (ΔnDCG ≥ 0.005) — highest evidence value per hour in the queue.
2. **AR-306** — depth=2 GELU@256 encoder, **lane: claude delegate** (head of Round 3 queue per `.claude/autoresearch-delegate.md`). Cheap (~3 min synthetic per program.md throughput target) with automatic KEEP/DISCARD. Justified now because the cursor patch lane is stalled: last 5 progress.jsonl entries (2026-06-29T01:25–01:30Z) are all DISCARD on `knn_full regression ~0.804–0.818`, robust_score plateaued ~1.40–1.41 — code-shape changes are the marginal-value move, not more patches.
3. **RAG-502** — implement `scripts/rag_chunk_ablation.py` (256/512/1024-token chunks on research-rag holdout), **lane: opencode research**. No Docker/DB dependency (BLK-DOCKER still active), tagged `lane: opencode` in the queue, and produces reusable eval infra plus a chunk-size result that RT-401/RAG-501 downstream runs will consume.

Deferred with reason: AR-301..305 (patch grid) — same family the daemon just DISCARDed 5× in a row; AR-309 (rank floor) is next after AR-306/307 per delegate queue order but rises in priority given the WATCH item below; RAG-501/RT-404/SRV-601 blocked or dependent (BLK-DOCKER active, RT-401 prerequisite).

### WATCH (collapse flags)

- **Run `20260702-102553-asn-demo-barlow-60208f`** (local, project autoresearch-demo, status finished): **8 collapse_alerts + 1 surgery**. events.jsonl shows effective rank fell 37.5 → 6.0 across steps 98–102 (two `sharp_drop` alerts at dropRatio 0.5, then repeated `below_floor` vs floor 12.0); tier-2 spectral surgery fired at step 102 (rankBefore 6.0); manifest final_effective_rank recovered to 40.09, eval/ndcg10 0.72. Hypothesis: this Barlow demo config (depth=4, lr 3e-4, batch 64, synthetic) enters a late-run redundancy-collapse regime where the Barlow objective alone provides no variance floor, so rank crashes below 12 until surgery intervenes; since ASN surgery is **rejected for fleet (0/4 — do not ship)**, the non-surgery mitigation is exactly AR-309's conditional VICReg rank-floor guard — this run is direct motivating evidence to keep AR-309 in the delegate queue.
- **Prod telemetry gap (process flag, not a collapse):** local `runboard list` shows only the one demo run above. Prod-lifecycle runs live on the Railway volume (`data/runs` is remote), so local listing cannot confirm prod runs are being recorded. Recommend Operator/ops verify the Railway volume run manifests during the next prod check.

### PROPOSE (new queue items — proposals only, not created)

Datalab manifests (`python -m datalab datasets`): 3 datasets, all below the >50-chunk training threshold — `evidence-and-science-review-ledgers` (27 chunks), `wiki---goals-and-build-docs` (8), `wiki-smoke` (5). **Zero datasets currently qualify** for a training queue item, so no train-on-datalab item is proposed on evidence grounds. One gap-closing proposal instead:

- **DATA-803 (proposed)** — grow the datalab docs corpus (ledgers + wiki sources) past the 50-chunk threshold via the existing datalab watch/ingest path, then run a tenant baseline vs Barlow recipe on it. Eval gate: nDCG@10 on a held-out query set must beat the identity/baseline recipe by ≥ 0.005 (same promotion bar as RT-401), with knn_full non-regression per program.md. Rationale: RAG-501 covers arXiv corpus growth only; no existing AR/RAG/RT item covers datalab-sourced internal-docs corpora.

## 2026-07-02 — run `20260702-183008-rnd`

| Duty | Status | Result |
|---|---|---|
| queue-snapshot | ok | `{"researchOpen": [{"id": "AR-301", "title": "Barlow \u03bb=0.022 near champion", "division": "research", "claimedBy": null, "blockedBy": []}, {"id": "AR-302", "title": "Synthetic D_SERVE=32 edge stress", "division": "research", "claimedBy": null, "blockedBy": []}, {"id": "AR-303", "title": "AUG=0.5 …` |
| telemetry-review | ok | `{"runs": [{"run": "20260702-102553-asn-demo-barlow-60208f", "status": "finished", "collapseAlerts": 8, "surgeries": 1}]}` |

**LLM loop:** skipped (GLM_API_KEY not set)


## 2026-07-02 — run `20260702-172949-rnd`

| Duty | Status | Result |
|---|---|---|
| queue-snapshot | ok | `{"researchOpen": [{"id": "AR-301", "title": "Barlow \u03bb=0.022 near champion", "division": "research", "claimedBy": null, "blockedBy": []}, {"id": "AR-302", "title": "Synthetic D_SERVE=32 edge stress", "division": "research", "claimedBy": null, "blockedBy": []}, {"id": "AR-303", "title": "AUG=0.5 …` |
| telemetry-review | ok | `{"runs": [{"run": "20260702-102553-asn-demo-barlow-60208f", "status": "finished", "collapseAlerts": 8, "surgeries": 1}]}` |

**LLM loop:** skipped (GLM_API_KEY not set)


## 2026-07-02 — run `20260702-120646-rnd`

| Duty | Status | Result |
|---|---|---|
| queue-snapshot | ok | `{"researchOpen": [{"id": "AR-301", "title": "Barlow \u03bb=0.022 near champion", "division": "research", "claimedBy": null, "blockedBy": []}, {"id": "AR-302", "title": "Synthetic D_SERVE=32 edge stress", "division": "research", "claimedBy": null, "blockedBy": []}, {"id": "AR-303", "title": "AUG=0.5 …` |
| telemetry-review | ok | `{"runs": [{"run": "20260702-102553-asn-demo-barlow-60208f", "status": "finished", "collapseAlerts": 8, "surgeries": 1}]}` |

**LLM loop:** skipped (GLM_API_KEY not set)



## 2026-07-03 — Delegate round 3 complete (claude): 4x DISCARD + a baseline-variance finding

AR-306 (depth-2 GELU@256): DISCARD, robust 1.289. AR-307 (InfoNCE+Barlow
0.1): DISCARD, 1.398. AR-308 (MRL prefix): DISCARD, 1.392. AR-309
(conditional rank floor, never armed — served_rank ~28 > 12): DISCARD,
1.411. **Finding:** all nine round-3 candidates across both lanes land at
1.39-1.41 while the champion baseline claims 1.465 — including a
hypothesis that should be a training no-op. The baseline is likely a
seed artifact. Proposed AR-310: 5x fixed-seed champion re-measurement
before any further round-3 spending.

**AR-310 resolution (same day):** null run of the unchanged champion
scores exactly 1.411 — identical to the AR-309 no-op run (harness is
deterministic). Baseline 1.465 is stale (recorded under different
conditions). Round-3 verdicts hold qualitatively: 306-308 truly regress
vs 1.411; 309 is a true no-op. Correct baseline going forward: 1.411
under the current harness. No re-runs warranted.
