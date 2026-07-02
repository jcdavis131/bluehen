# Technical debt register

Prioritized backlog from cross-agent audits (2026-06-29; SME review pass
2026-07-02 — full findings in `knowledge/reviews/`). Score =
**(Impact + Risk) × (6 − Effort)**.

## P1 — from the 2026-07-02 SME reviews (unremediated remainder)

| Item | Source | Action |
|------|--------|--------|
| Run/dataset stores not tenant-scoped | SEC-001/002 | Spec tenant-namespaced stores before opening `/v1/runs*` beyond admin |
| `/v1/trace/{id}` skips RLS (no workspace ctx) | SEC-003 | Scope `get_trace` to tenant workspace |
| Run store vs multi-host prod (Railway ephemeral disk) | BE-002 | Decide: volume `/data/runs` or serve runs from Postgres |
| Stuck jobs stay `running` after worker crash | BE-005 | Heartbeat + requeue sweep |
| Public leaderboards show demo metrics under competitor names | EC-002/003 | Label as illustrative or wire live eval data (Operator call) |
| Documented pnpm scripts missing from package.json (~25) | US-001 | Reconcile docs ↔ scripts |
| Leads on Vercel are ephemeral | commercial-platform | `LEADS_DIR` durable mount or core-api endpoint |
| Autoresearch loop not instrumented with runboard | training-console | Needs spec (per-step logging perturbs `budget_sec` runs) |
| `pnpm audit`: jsondiffpatch <0.7.2 (moderate XSS), `ai` SDK <5.0.52 (2 low) — transitive via apps/synthorg agent tooling, not public sites | audit 2026-07-02 | Upgrade `ai` to v5 in synthorg (breaking); postcss already overridden to >=8.5.10 |

## P0 — unblock or ship

| Item | Score | Action |
|------|-------|--------|
| BLK-DISK / BLK-DOCKER | 50 | Free 5+ GB on C:; `pnpm dev:stack` |
| Uncommitted fleet migration | 30 | Commit sites, CI, Dockerfile |
| Model reload per embed | 30 | Workspace-scoped model cache + batch indexing |
| Gitignore `.eve/`, worktrees | 30 | Prevent artifact commits |

## P1 — architecture hygiene

| Item | Score | Spec / ADR |
|------|-------|------------|
| `ui-fleet` bypasses `synth-core` | 21 | 0006 |
| API bodies as raw `dict` | 18 | 0004 |
| `collections.meta` JSONB bloat | 18 | 0004 / data layer |
| Worker `sys.path` hack | 21 | 0009 |
| BLK-PROD Railway cutover | 18 | ADR-002, INF-003 |

## P2 — quality gates

| Item | Score | Action |
|------|-------|--------|
| core-api lifecycle HTTP tests | 18 | search, ingest, train |
| CI omits trainer tests | 28 | Add job to `.github/workflows/ci.yml` |
| Zero frontend tests | 14 | Playwright smoke per site |
| Doc drift (test counts) | 20 | Keep HANDOFF §9 in sync |

## Paid down (2026-06-28 — 2026-06-30)

- ADR-002 Railway + Neon documented; `prod-deploy.mjs`, `/readyz`, `railway.worker.toml`
- ADR-003 unified org-scoped `synth` CLI
- B.U.I.L.D. wiki + `build_sync.py` + `config/agents.json`
- OpenCode unattended loop (`docs/OPENCODE_LOOP.md`, `scripts/opencode-loop.ps1`)
- Fleet site build: `@synthaembed/fleet` import extensions fixed
- `fleet-review.ps1` for Windows fleet UI review
- pytest fast-skip when Postgres unavailable (`conftest.py`)

## References

- Structural review: [ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md)
- Work queue: `config/work_queue.json`
- Spec matrix: `specs/README.md`
