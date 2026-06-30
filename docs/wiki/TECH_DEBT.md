# Technical debt register

Prioritized backlog from cross-agent audits (2026-06-29). Score =
**(Impact + Risk) × (6 − Effort)**.

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
