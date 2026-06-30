# 0009 — Training Worker & Lifecycle Pipeline

- **Status:** Implemented (local + Railway-ready; Modal TBD)
- **Owner:** ML / Platform
- **Related specs:** 0003, 0004, 0005, 0008, **0012**
- **Evidence:** [`EVIDENCE.md`](../EVIDENCE.md) · `scripts/collect_evidence.py`
- **Implementation:** `services/worker/main.py`, `packages/asn-engine/asn_engine/train_loop.py`

## Problem

Training jobs enqueued by core-api must run reliably, produce checkpoints, eval results, and
deployed searchable indexes — without blocking HTTP requests.

## Goals

- Postgres-backed job queue with worker claim semantics.
- ASN contrastive training with spectral surgery + Newton-Schulz conditioning.
- Post-train eval + deploy + pgvector indexing in one pipeline.

## Design

### Job queue (`training_jobs`)

States: `pending` → `running` → `completed` | `failed`

- `jobs.launch_train` — creates pending job linked to `collection_id`.
- `jobs.claim_next_job` — `FOR UPDATE SKIP LOCKED` for worker concurrency.
- Worker sets RLS GUC per job's `workspace_id`.

### Training (`train_loop.run_asn_training`)

- Loads pairs from collection meta.
- ASNEncoder + InfoNCE + three-tier surgery on trigger.
- Quintic NS on projection head (`newtonSchulzSteps` from recipe, default 5).
- Checkpoint → `data/artifacts/{workspaceId}/{model_version}.pt`

### Post-train pipeline (worker)

1. Complete job + register `model_versions` row.
2. Run `eval_harness.runner.evaluate_checkpoint`.
3. `deploy_model(..., truncate_dims=256, quant="int8")` + chunk indexing.
4. Ledger entries for train / eval / deploy / index stages.

**Ledger stages (v0.3):** `train` (completed), `eval` (eval-harness gates), `deploy`, `index`.
Stages `pilot` and `charter` are emitted when eval gates pass (pilot queue) and when operator
issues charter via admin API. Deploy requires charter when `SYNTH_CHARTER_GATE=1` (default).

### Scripts

| Script | Purpose |
|---|---|
| `scripts/bootstrap_orgs.py` | Create workspaces from fleet.json |
| `scripts/kickoff_lifecycle.py` | hill-climb all Phase A orgs |
| `scripts/backfill_deploy.py` | Deploy + index existing checkpoints |
| `scripts/retry_failed_orgs.py` | Recovery |
| `scripts/engine_proof.py` | 30-epoch collapse-trigger ablation (ASN vs InfoNCE) |
| `scripts/collect_evidence.py` | Math snapshot + optional hub ablation → `data/evidence/` |

### Phase A results (2026-06-27)

All four orgs trained, deployed, 8 chunks indexed each. **Effective rank on encoder outputs
must be re-logged** after `train_loop` fixes; prior ~62 figures were invalid.
2-epoch micro-ablation: erank ~7.37, WHITEPAPER gate 1 not met — see `EVIDENCE.md` §3.
Fixed collapse trigger (`§3.1`): ASN at no-harm parity when baseline does not collapse.

## Contract

Worker loop (pseudocode):

```
while True:
    job = claim_next_job()
    if not job: sleep; continue
    train → eval → deploy → index → ledger
```

Env: `DATABASE_URL`, same as core-api.

## Acceptance criteria

1. Worker claims and completes jobs without HTTP timeout. ✅
2. Failed eval does not fail entire job (try/except). ✅
3. Deploy writes to pgvector `document_chunks`. ✅
4. `pnpm kickoff:orgs` end-to-end on local stack. ✅

## Test plan

- Manual: `pnpm dev:worker` + `kickoff:orgs`.
- CI: ASN unit tests; core-api integration tests (not full train in CI — too slow).

## Rollout

- **Local:** `pnpm dev:worker` on Docker Postgres `:5433`.
- **Production:** Railway background service — same image as `core-api`, start command `worker`
  (`infra/docker-entrypoint.sh worker`; config in `railway.worker.toml`). Shared Neon
  `DATABASE_URL`; mount `/data/artifacts` volume (or S3 registry) before prod training.
  ≥4 GB RAM recommended (ADR-002). Orchestrated via `pnpm prod:deploy`.
- **GPU scale:** `services/trainer/modal_app.py` (Spec 0011) when Modal dispatch is wired.

## Risks

- Single worker, no horizontal scale → add job locking + multiple workers (already skip-locked).
- Local CPU training slow → Modal integration (0005 follow-up).
