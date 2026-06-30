# Local development

**Blockers:** `uv run python scripts/pick_task.py blockers` — see `BLK-DISK`, `BLK-DOCKER` in
`config/work_queue.json`.

## Windows notes

- If `pnpm` is not on PATH: use `npx pnpm@9.12.0 <script>` or `npm i -g pnpm@9.12.0`
- Parallel `pnpm review` can OOM — build sequentially or `turbo run build --concurrency=2`
- Set `NODE_OPTIONS=--max-old-space-size=8192` for large site builds
- PowerShell scripts must use ASCII hyphens (not Unicode em dashes)

## Stack (full interactive fleet)

```powershell
npx pnpm@9.12.0 dev:stack
npx pnpm@9.12.0 db:migrate
npx pnpm@9.12.0 dev:api          # :8000
npx pnpm@9.12.0 dev:worker
npx pnpm@9.12.0 bootstrap:orgs   # data/workspaces/*.env
```

## Review all site UIs

```powershell
.\scripts\fleet-review.ps1 -Open
# or clean restart:
.\scripts\fleet-review.ps1 -Restart -Open
```

| Port | Site |
|------|------|
| 3000 | hub (bhenre.com) |
| 3001 | dumbmodel |
| 3002 | control (jcamd.com) |
| 3003 | benchmark-lab (slasso.com) |
| 3004 | research-rag (arxiviq.com) |

Single site with workspace env:

```bash
pnpm dev:site research-rag
```

## Tests

```bash
uv run pytest packages/asn-engine/tests services/core-api/tests -q
# 38 total: ~17 ASN + ~21 core-api (DB tests skip when Postgres down)
```

## Production (Operator)

See [`infra/railway.md`](../../infra/railway.md) and `pnpm prod:deploy`.
