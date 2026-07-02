# Commerce backend (Medusa v2)

Open-source (MIT), self-hosted commerce serving the hub store
(`apps/sites/hub` → `lib/commerce.ts`). Store API on **:9000**.
Payment completes on Stripe's PCI-compliant flow — card data never
touches this service or the hub.

This service manages its **own** dependencies and lockfile (it is not a
pnpm-workspace member) so Medusa's dependency tree cannot constrain the
platform's.

## Bring-up (~15 minutes, needs Postgres)

```powershell
cd services/commerce
npm install                        # own lockfile; not part of the pnpm workspace
copy .env.template .env            # fill DATABASE_URL + generated secrets
npm run migrate                    # medusa db:migrate
npx medusa user -e you@bhenre.com -p <admin-password>
npm run seed                       # region + products + publishable key (printed)
npm run dev                        # API + admin on http://localhost:9000/app
```

Local Postgres: `pnpm dev:stack` (Docker) and create a `medusa` database
on :5433, or point `DATABASE_URL` at a Neon branch database.

## Wire the hub

Set on the hub (Vercel env or `.env.local`):

```
COMMERCE_PROVIDER=medusa
MEDUSA_BACKEND_URL=http://localhost:9000     # prod: Railway service URL
MEDUSA_PUBLISHABLE_KEY=pk_...                # printed by seed
MEDUSA_REGION_ID=reg_...                     # printed by seed
MEDUSA_STOREFRONT_URL=                       # optional hosted checkout base
```

## Deploy (Railway, next to core-api)

`infra/Dockerfile.commerce` + `railway.commerce.toml` at the repo root.
Provision a `medusa` database (Neon), set the env from `.env.template`,
then run `db:migrate`, `medusa user`, and `seed` once via a Railway
one-off command. Health check: `GET /health`.

Stripe: create a restricted API key, set `STRIPE_API_KEY`, add a webhook
endpoint `https://<service>/hooks/payment/stripe_stripe` and set
`STRIPE_WEBHOOK_SECRET`.

## Version note

`@medusajs/*` pinned to `^2.7.0`; **all `@mikro-orm/*` pins must exactly
match the `@mikro-orm/core` version Medusa resolves** (currently 6.6.14)
or every module fails at init with a misleading
"MikroORM failed to connect… Retrying" loop. If `npm install` reports
peer conflicts on a newer 2.x line,
regenerate the manifest with `npx create-medusa-app@latest --skip-db`
and copy back `medusa-config.ts`, `src/scripts/seed.ts`, and the env
template — those three files are the platform-specific parts.
