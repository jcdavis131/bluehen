# OpenCode guardrails — production & triage

OpenCode loads this file via `opencode.json` instructions. Applies to **interactive TUI** and
`opencode-loop.ps1` alike.

## Production deploy — Operator only

Do **not** run production deploy or hosting mutations unless the Operator explicitly asked in
this session:

| Blocked | Use instead |
|---------|-------------|
| `vercel deploy --prod` | Operator: `pnpm vercel:link-fleet:exec` / `vercel:env-fleet:exec` |
| `curl` / PATCH to `api.vercel.com` | Same — fleet scripts in `scripts/` |
| `pnpm prod:deploy*` / `deploy:railway*` | `node scripts/prod-deploy.mjs` (Operator, after Neon URL) |
| `railway up` / Railway CLI deploy | `infra/railway.md` runbook |
| `bootstrap:orgs` against prod API | Only after `SYNTH_API_BASE_URL` is confirmed prod |

**Work queue:** `INF-003` (Railway), `INF-004` (Vercel env), `INF-005` (domains) are **Cursor /
Operator** lanes — not `opencode` claim prefixes. If blocked on `BLK-PROD`, output
`<<<NEED_HUMAN>>>` (loop) or stop and report blockers.

## Triage buckets (IMPROVEMENT_LOOP)

| Bucket | OpenCode |
|--------|----------|
| **1** | Unattended default — docs, SITE-* UI, tests |
| **2** | Sign-off or `-FixUntilGreen -TestCmd` on the loop only |
| **3** | Never unattended — use `opencode-research` + human review |

Classify before editing:

```powershell
uv run python scripts/build_sync.py classify --path path/to/file
```

`scripts/prod-deploy.mjs` is **bucket-2** by policy.

## Safe commands (bucket-1 examples)

- `pnpm review`, `pnpm --filter @synthaembed/<site> build`
- `uv run pytest packages/asn-engine/tests services/core-api/tests -q`
- `pnpm dev:fleet`, `.\scripts\fleet-review.ps1 -Open`
- Wiki edits under `docs/wiki/`

## Secrets

Never paste API tokens into bash. Use `vercel` CLI login or env files gitignored under
`data/deploy/`.
