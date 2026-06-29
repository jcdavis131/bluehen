# Railway deploy — core-api + worker (ADR-002)

Phase A backend host for `services/core-api` and `services/worker`. Sites stay on Vercel;
Postgres on Neon.

## Quick path (automation)

From repo root:

```bash
pnpm deploy:railway              # checklist + generates data/deploy/railway.env
# Edit data/deploy/railway.env → set Neon DATABASE_URL
pnpm deploy:railway:migrate      # Alembic against Neon
pnpm deploy:railway:exec         # Railway login + first core-api deploy
pnpm bootstrap:orgs              # after core-api URL is live
pnpm vercel:link-fleet:exec
pnpm vercel:env-fleet:exec       # push SYNTH_API_* to all Vercel projects
```

Windows PowerShell example after Railway URL is known:

```powershell
$env:SYNTH_API_BASE_URL = "https://core-api-production.up.railway.app"
$env:API_SECRET_KEY = (Get-Content data/deploy/railway.env | Where-Object { $_ -match '^API_SECRET_KEY=' }) -replace '^API_SECRET_KEY=',''
node scripts/bootstrap_orgs.py
node scripts/vercel-env-fleet.mjs --execute
```

## Prerequisites

- Neon production database with `DATABASE_URL` (Vercel Postgres integration or Neon console)
- Railway account linked to GitHub repo
- `API_SECRET_KEY` — 32+ byte random string (shared by API + worker)

## 1. Create Railway project

1. **New Project** → **Deploy from GitHub** → select `bluehenre` / `henington-homes`.
2. Railway detects the root `Dockerfile`. Create **two services** from the same repo:

| Service | Start command | Notes |
|---------|---------------|-------|
| `core-api` | *(default)* `api` | Public HTTPS; health check `/healthz` |
| `worker` | `worker` | No public port; ≥4 GB RAM recommended |

For the worker service, set **Custom Start Command** in Railway to:

```text
worker
```

(Railway passes this as the entrypoint argument; equivalent to `infra/docker-entrypoint.sh worker`.)

## 2. Shared environment variables

Set on **both** services (Railway shared variable group or copy):

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql+psycopg://…@…neon.tech/neondb` | yes |
| `API_SECRET_KEY` | *(random 32+ bytes)* | yes |
| `ENVIRONMENT` | `production` | yes |
| `SYNTH_ARTIFACTS_DIR` | `/data/artifacts` | yes (default in image) |
| `SYNTH_CORPORA_DIR` | `/data/corpora` | optional |
| `RESEARCH_COST_CEILING_USD_PER_DAY` | `50` | optional |
| `REDIS_URL` | Upstash URL | when Arq lands |

Railway injects `PORT` for `core-api`; do not hard-code.

## 3. Run migrations (once per schema change)

One-off job or release command on `core-api`:

```text
migrate
```

Or locally against Neon:

```bash
DATABASE_URL="postgresql+psycopg://…" pnpm db:migrate
```

## 4. Persistent artifacts (worker)

Training writes to `SYNTH_ARTIFACTS_DIR`. Before the first prod train job, attach a Railway
**volume** mounted at `/data/artifacts` on the worker service, **or** set `MODEL_REGISTRY_URI`
to S3-compatible storage (revisit in ADR-002 action #7).

**Phase A+ handoffs:** mount the same volume on **both** `core-api` and `worker` (or use a
shared path in the image) and set:

| Variable | Suggested path |
|----------|----------------|
| `BD_QUEUE_PATH` | `/data/handoffs/bd/queue.json` |
| `BD_SCORECARDS_DIR` | `/data/handoffs/bd/scorecards` |
| `RECIPES_DIR` | `/data/handoffs/recipes` |
| `SYNTH_CHARTER_GATE` | `1` |

Copy seed files from `content/fleet/bd/` and `config/recipes/` into the volume on first deploy.

## 5. Wire Vercel fleet sites

**Root Directory** (Vercel → Project → Settings → General — required for monorepo):

| Vercel project | Root directory |
|----------------|----------------|
| `frontend` | `apps/sites/hub` |
| `bluehenre-control` | `apps/control` |
| `dumbmodel` | `apps/sites/dumbmodel` |
| `agent-lasso` | `apps/sites/benchmark-lab` |
| `arxiv-exam-app` | `apps/sites/research-rag` |

After `core-api` has a public URL (e.g. `https://core-api-production.up.railway.app`):

1. Set `SYNTH_API_BASE_URL` on each Vercel project (hub, control, dumbmodel, slasso, arxiviq).
2. Run `pnpm bootstrap:orgs` locally against prod API (or copy keys from workspace rows).
3. Push per-site `SYNTH_API_KEY` into each Vercel project's environment.
4. Redeploy sites; confirm `/api/status` shows API reachable.

## 6. Smoke test

```bash
curl -sS "$SYNTH_API_BASE_URL/healthz"
curl -sS -H "Authorization: Bearer $ADMIN_KEY" "$SYNTH_API_BASE_URL/v1/admin/fleet"
```

Trigger a hill-climb from Operations Center or `pnpm kickoff:orgs` with prod env loaded; confirm
worker logs show job claim → train → deploy.

## Local Docker parity

```bash
docker build -t synthaembed-backend .
docker run --rm -p 8000:8000 --env-file .env synthaembed-backend api
docker run --rm --env-file .env synthaembed-backend worker
```

Requires reachable `DATABASE_URL` (local `:5433` or Neon).

## Escape hatch

If multi-region API or native volume semantics become necessary, export the same Dockerfile to
Fly.io (`fly launch`, two `fly.toml` apps). ADR-002 revisit triggers in
`docs/adr/002-core-api-hosting.md`.
