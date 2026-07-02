# Deep code review — 2026-07-02 (post-rebrand, post-venture buildout)

> Principal-engineer pass over critical paths after the fleet rebrand,
> venture buildout, agentkit, and commerce boot. Findings ranked;
> remediation status updated same-day where fixed.

## Critical — FIXED same day (commit 1f3f59b)

1. **`governance.get_trace` destroyed** — the `def` line had been deleted;
   every `GET /v1/trace/{id}` 500'd, and the orphaned body ran the
   *unscoped* query (RLS bypass, the very thing a prior fix attempted).
   Restored with `workspace_id` scoping; `main.py` call site updated.
2. **Charter overrode the eval gate** — `services/worker/main.py`
   deployed on `charter_allows_deploy()` alone with note "gates pending";
   all four shipped charters are `modelVersion: "*"`, so gate-failed
   models could auto-deploy. Now requires `gates_passed AND charter`.

## High — OPEN (queued)

3. **Tenant identity split after rename (REV-901)** — prod workspaces
   keyed by old site ids. Migration staged:
   `scripts/migrate_workspace_site_ids.py` (dry-run verified: 4 rows,
   no conflicts). **Blocks bootstrap/vercel-env** — run with `--execute`
   after Operator review, then rename `data/workspaces/*.env`, rerun
   `bootstrap:orgs`, then `vercel-env-fleet --execute`.
4. **vercel-env-fleet blanks keys when env files missing (REV-902)** —
   sets `SYNTH_API_KEY=""` fleet-wide if `data/workspaces/{new-id}.env`
   absent. Sequence-dependent on #3; script should also fail loudly on
   missing files.
5. **Per-request model loading (REV-903)** — `embed_texts` does
   `torch.load` + tokenizer init per call; per *chunk* in indexing.
   Behind the public dumbmodel `/api/diagnose` (no rate limit) this is a
   trivial DoS. Needs an LRU checkpoint cache + BFF rate limiting.
6. **Leads unwritable on Vercel (REV-904)** — contact/waitlist persist
   to repo-relative `data/leads` (read-only/ephemeral on Vercel). Real
   customer leads 500 or vanish. Needs `LEADS_DIR` on durable storage or
   a core-api leads endpoint.
7. **Demo-pair eval gate (REV-905)** — with <5 pairs, gates are computed
   on 3 hard-coded demo pairs and can pass — "deploy gate" means nothing
   for thin corpora. Gate should fail (not fall back) below a minimum
   real-pair count.

## Medium — OPEN (queued)

8. `config/org-divisions.json` `publicSites`/`owns` still old ids →
   division↔site joins silently empty (REV-906).
9. `torch.load(weights_only=False)` on request path — artifact-volume
   write access becomes RCE (REV-907).
10. agentkit `add_watch_source` accepts arbitrary URLs/globs — SSRF +
    secret-ingestion risk from the unattended loop (e.g.
    `data/workspaces/*.env` glob) (REV-908).
11. datalab `watch_state.json` non-atomic writes; concurrent runners
    race — duplicate datasets after crash (REV-909).
12. `config/work_queue.json` commands reference old ids + ~25 pnpm
    scripts that don't exist in root package.json (REV-910, US-001).
13. `/v1/embed` uncapped batch size (REV-911).

## Low

14. RaceFeed dedupe key `${ts}-${stage}` collides same-second; unbounded
    `known` set. 15. No immediate first poll in RaceFeed/InteractiveCircuit
    (20s blind spot). 16. Medusa seed non-idempotent (documented).

## Verified clean

Trainer tests are substantive (266-line real-math suite); observatory
polling stops on terminal status + honest stale banner; ui-fleet
primitives tear down listeners/observers correctly.
