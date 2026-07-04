# Security Policy

## Reporting a vulnerability

Email **jcdavis131@gmail.com** with a description, reproduction steps,
and impact assessment. You will receive an acknowledgment within 72
hours. Please do not open public issues for security reports.

## Scope

- The `services/core-api` production API and its authentication layers
  (tenant keys, admin key, RLS policies)
- The public fleet sites and their BFF routes
- The data-consent pipeline (exhaust, submissions, erasure receipts)

## Practices in this codebase

- Secrets are never committed: runtime credentials live in gitignored
  `data/workspaces/` and `data/deploy/` and in platform env vars.
- Tenant isolation via Postgres row-level security plus per-table grants
  (see `services/core-api/alembic/versions/003_tenant_role.py` onward).
- Outbound fetches are SSRF-guarded (`packages/datalab/datalab/ingest.py`);
  public endpoints are rate-limited (`services/core-api/app/ratelimit.py`).
- User data is stored only with explicit consent and carries a
  provenance receipt; erasure is honored on request quoting the receipt.
