## Run 2026-07-02T20:27:53

### Phase 0 — Orient
- disk free: 3.3 GB
- git head: b0eb51d feat(ux): unified org navigation + sitemaps across the fleet
- git status: 2 changed
- blockers:
```
ACTIVE BLOCKERS

  BLK-DOCKER: Docker Desktop API error (consequence of BLK-DISK)
    Why: Postgres :5433, Redis :6379 unavailable â€” local API/worker/kickoff/migrate blocked.
    Unblock: Fix BLK-DISK first, then: pnpm dev:stack && pnpm db:migrate
    Blocks: INF-001, INF-002, RAG-501, SRV-601

  BLK-PROD: Prod stack not provisioned (Operator)
    Why: No Neon DATABASE_URL, Railway core-api/worker, or Vercel fleet env. Sites still on localhost API.
    Unblock: Operator: Neon via Vercel Marketplace, Railway deploy (ADR-002), pnpm vercel:link-fleet:exec
    Blocks: INF-003, INF-004, INF-005

READY NOW (19 tasks) â€” no infra blocker:
  INF-000 [infra] Free disk space + restart Docker Desktop
  AR-301 [research] Barlow Î»=0.022 near champion
  AR-302 [research] Synthetic D_SERVE=32 edge stress
  AR-303 [research] AUG=0.5 lower view noise
  AR-304 [research] Batch=48 intermediate
  AR-305 [research] Weight decay 5e-5
  AR-306 [research] depth=2 GELU@256 encoder (code change)
  AR-307 [research] InfoNCE + Barlow aux 0.1 hybrid loss
  AR-308 [research] MRL prefix loss in autoresearch_train.py
  AR-309 [research] Rank floor when served_rank < 12
  RT-401 [research] Real-text bake-off: research-rag corpus
  RT-402 [research] Real-text bake-off: AG News + both sites
  RT-403 [research] Collapse-regime vs BGE/e5/Qwen3 panel
  RAG-502 [research] Implement rag_chunk_ablation.py
  RAG-503 [research] Hard negative mining in hill-climb pair builder
```

### Phase 1 — Lane & Plan
Board snapshot:
```
Traceback (most recent call last):
  File "C:\Users\jcdav\bluehenre\scripts\pick_task.py", line 269, in <module>
    raise SystemExit(main())
                     ~~~~^^
  File "C:\Users\jcdav\bluehenre\scripts\pick_task.py", line 256, in main
    return cmd_list(args.all)
  File "C:\Users\jcdav\bluehenre\scripts\pick_task.py", line 92, in cmd_list
    for t in sorted(data_tasks(data), key=lambda x: (x.get("priority", 99), x["id"])):
             ~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
TypeError: '<' not supported between instances of 'str' and 'int'
```

### Phase 2-9 — Agent-driven
Handed to the `monorepo-review-loop` skill arc: fan out reviewers (Phase 2), code review (3), gates (4), guards (5), metadata-align (6), deploy+smoke (7), triage as needed (8), close-out (9).

