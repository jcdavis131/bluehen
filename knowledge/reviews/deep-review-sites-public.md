# Deep Review — Public Sites (hub, control, dumbmodel)

## Scope
- **hub** — `apps/sites/hub/` (bhenre.com, Platform Console, port 3000): `app/layout.tsx`, `app/page.tsx`, `app/{try,research,pricing,store,contact,feedback,legal/{terms,privacy}}/page.tsx`, `app/api/{search,status,models,ledger,feedback,contact,checkout}/route.ts`, `lib/{commerce,shopify}.ts`, `components/GuidedTry.tsx`, `data/experiments.json`, `package.json`, `next.config.mjs`, `tsconfig.json`, `.gitignore`.
- **dumbmodel** — `apps/sites/dumbmodel/` (dumbmodel.com, Baseline Comparison, port 3001): `app/layout.tsx`, `app/{,check,compare,hall}/page.tsx`, `app/api/{search,diagnose,compare,models,status,feedback}/route.ts`, `components/{site,site-mascots,HealthCheckPanel,ComparePanel,HallOfCone}.tsx`, `lib/{baselines,scoring,corpus}.ts`, `app/globals.css`, `package.json`, `tsconfig.json`, `.gitignore`.
- **control** — `apps/control/` (jcamd.com, Operations Center, port 3002): `app/layout.tsx`, `app/{,actions,feedback}/page.tsx`, `app/api/{status,feedback,hill-climb,admin/hill-climb,admin/bd/queue,admin/bd/promote}/route.ts`, `components/{HillClimbActions,BdPromotionPanel}.tsx`, `package.json`, `tsconfig.json`, `.gitignore`.
- Cross-cutting: `config/fleet.json` venture blocks, `packages/synth-core/src/{client,index}.ts`, `packages/ui-fleet/src/{routes/index.ts,admin-api.ts,site-api.ts}`.

## Findings

### hub
- 🟢 Real, complete site — 9 page routes (`/`, `/try`, `/research`, `/pricing`, `/store`, `/contact`, `/feedback`, `/legal/terms`, `/legal/privacy`) and 7 API routes, all internally linked and wired. No stub pages, no dead links. — `apps/sites/hub/app/**`
- 🟢 Convention adherence is strong: `FleetShell` + `CommandPalette` in `app/layout.tsx:2,36`; `PageHeader` + `SiteSubnav` + `getSiteCircuit`/`getSiteNav` on every content page (e.g. `app/page.tsx:76-97`, `app/try/page.tsx:34-39`, `app/research/page.tsx:19-32`); shared BFF routes re-export `@synthaembed/ui-fleet/routes` (`app/api/{search,status,models,ledger,feedback}/route.ts`).
- 🟡 Server components bypass `@synthaembed/synth-core` and do raw `fetch` with manual `Bearer ${KEY}` — `app/page.tsx:27-45` (`/healthz`, `/v1/budget`, `/v1/ledger`, `/v1/models`) and `app/try/page.tsx:10-25` (`/v1/models`). Per `AGENTS.md` "Sites → core-api only via `@synthaembed/synth-core`", these should use `synthFromEnv("hub")` → `synth.ledger.tail(30)`, `synth.ledger.budget()`, `synth.model.list()`. The bypass skips trace headers/span context (`packages/synth-core/src/client.ts:42-55`), so the highest-traffic hub pages emit no traces. The `/healthz` call is justified (no `Synth` helper for it).
- 🟡 Home page does not export `metadata` — `app/page.tsx` has no `export const metadata`; relies on `app/layout.tsx:5-8` title "Blue Hen RE — Hub". Every other hub page sets metadata. SEO/social gap on the front door.
- 🟢 venture{} is coherent and wired: `config/fleet.json:86-94` CTA "Start a briefing" → `/contact` (linked from `app/page.tsx:84` and `app/pricing/page.tsx:29`); monetization via pricing tiers + Medusa/Shopify store (`lib/commerce.ts:46-66` provider-agnostic, defaults to Medusa); `app/store/page.tsx:15-22` degrades honestly to "Store opening soon" when `commerceConfigured()` is false; `/api/checkout/route.ts:7-22` validates `variantId` and 303-redirects to hosted checkout; dataConsent points to `/legal/privacy` which exists and matches the contact-flow PII handling (`/api/contact/route.ts:45-55` persists to `data/leads/leads.jsonl`, root `.gitignore:24` ignores `/data/`).
- 🟢 Hygiene: `.gitignore` present; `tsconfig.json` valid (strict, bundler, `resolveJsonModule`); `next.config.mjs:4` transpiles the three workspace packages; no vendored junk. `.gitignore` only lists `.vercel` but root `.gitignore` covers `.next/` and `node_modules/`.

### dumbmodel
- 🟢 Real site — 4 page routes (`/`, `/check`, `/compare`, `/hall`) all linked from the home CTA row (`app/page.tsx:32-44`) and `SiteSubnav`; 6 API routes. Mascots are re-exported from `@synthaembed/ui-fleet` (`components/site-mascots.tsx:6`), not forked.
- 🟢 Convention adherence: `FleetShell` in `app/layout.tsx:14`; `PageHeader` + `SiteSubnav` + `getSiteCircuit`/`getSiteNav` on `/check`, `/compare`, `/hall`, `/`; shared BFF routes re-export `ui-fleet/routes` for `search`, `diagnose`, `models`, `status`, `feedback` (`app/api/*/route.ts`).
- 🟡 `app/api/compare/route.ts` is dead — no client calls `/api/compare`. `ComparePanel.tsx:32` calls `/api/search` for live mode and uses local `rankForModel` (`lib/scoring.ts:32`) for static mode. Either wire the compare page to this route or delete it.
- 🟡 `components/site.tsx` exports `SiteHeader` and `SiteFooter` (`site.tsx:4,26`) that are never imported anywhere (grep across `apps/sites/dumbmodel` finds only the definitions, no callers — `FleetShell` replaced them). Dead code.
- 🟡 `app/globals.css` carries ~80 lines of legacy class aliases (`.hero`, `.hero h1`, `.hero .tagline`, `.hero-actions`, `.card`, `.grid-2`, `.muted`, `.mono`, `.page`, `.btn-primary`, `.btn-hen`, `.btn-ghost`) — none of those class names appear in any dumbmodel tsx (grep for `className="(hero|card|grid-2|muted|mono|page|btn-*)"` returns no matches). The `.bh-btn--hen` / `.bh-btn--primary.bh-btn--cone` overrides are still live (used by `ComparePanel.tsx:89,162`); keep those, drop the legacy block.
- 🟡 Home page (`app/page.tsx`) does not export `metadata` — relies on `app/layout.tsx:5-8`. `/check`, `/compare`, `/hall` all set metadata. Same SEO gap as hub.
- 🟢 venture{} coherent and wired: `config/fleet.json:148-156` CTA "Run the free health check" → `/check` (`app/page.tsx:33`); dataConsent opt-in implemented in `components/HealthCheckPanel.tsx:63-76` (checkbox bound to `consent` state, sent in the `/api/diagnose` body at line 35); monetization "Evaluation Credits via bhenre.com/store" — result CTA links to `https://bhenre.com/store` and `https://bhenre.com/contact?topic=evaluation-sprint` (`HealthCheckPanel.tsx:138-143`). Coherent end-to-end.
- 🟢 Data contracts: `lib/{baselines,corpus}.ts` re-export from `@synthaembed/eval-public` (single source of truth); `scoring.ts` consumes `DEMO_CORPUS` + `BaselineModel.retrievalBias` shape consistently. `GET /api/compare` returns a model shape that matches `eval-public`'s `BaselineModel`.

### control
- 🟢 Real operator site — 3 page routes (`/`, `/actions`, `/feedback`) and 6 API routes. `HillClimbActions.tsx` and `BdPromotionPanel.tsx` are live, wired to admin-api, with loading/error states. No stubs.
- 🟢 Convention adherence: `FleetShell` in `app/layout.tsx:13`; `PageHeader` + `SiteSubnav` on every page; `getSiteNav`/`getSiteCircuit`/`listSites`/`devCommand` from `@synthaembed/fleet`; BFF re-exports `ui-fleet/routes` for `status`/`feedback`; admin routes delegate to `@synthaembed/ui-fleet/admin-api` (`app/api/admin/hill-climb/route.ts:1`, `app/api/admin/bd/{queue,promote}/route.ts:1`).
- 🟡 `app/api/hill-climb/route.ts` (non-admin re-export of `POST_hillClimb`) is dead — `HillClimbActions.tsx:17` calls `/api/admin/hill-climb`, never `/api/hill-climb`. Remove.
- 🟡 Home page reads `API_SECRET_KEY ?? SYNTH_ADMIN_KEY` directly and does raw `fetch` to `/v1/admin/fleet` — `app/page.tsx:5-6,17-29`. The admin key handling is correct and matches `packages/ui-fleet/src/admin-api.ts:8`, but this is the only page in the fleet that touches the admin key inline rather than going through `admin-api`. Move to an `adminFleetStatus()` helper in `@synthaembed/ui-fleet/admin-api` to centralize key handling and keep the page thin. (The `/healthz` call is unauthenticated and fine as raw fetch.)
- 🟢 Env var pattern is consistent across the fleet: `SYNTH_API_KEY` for workspace/site calls (`packages/ui-fleet/src/site-api.ts:29`), `API_SECRET_KEY ?? SYNTH_ADMIN_KEY` for operator/admin calls (`packages/ui-fleet/src/admin-api.ts:8`). control uses both correctly.
- 🟢 No `venture{}` in `config/fleet.json` for control (operator-internal control plane) — correct; no monetization/CTA expected.
- 🟢 Hygiene: `.gitignore` present; `tsconfig.json` valid; `next.config.mjs:4` transpiles the three workspace packages; no vendored junk.

### Cross-cutting
- 🟢 No site imports a DB driver or calls Postgres directly. All data access flows through `core-api` — either via `synth-core`/`ui-fleet` BFF routes or direct `fetch` to core-api endpoints.
- 🟢 No hardcoded localhost except as env fallback (`?? "http://localhost:8000"` in `hub/app/page.tsx:27`, `hub/app/try/page.tsx:10`, `control/app/page.tsx:5`) — acceptable dev default, overridable by `SYNTH_API_BASE_URL`.
- 🟢 Root `.gitignore` covers `.next/`, `node_modules/`, and `/data/` (so `data/leads/leads.jsonl` PII is ignored). Per-site `.gitignore` files only listing `.vercel` is sufficient.

## Risk
- **Synth-core bypass on hub home/try + control home (low–medium):** those page loads skip trace span emission (`packages/synth-core/src/client.ts:32-34,47`), creating an observability blind spot on the highest-traffic pages. Compounds as traffic grows; trivial to fix.
- **Dead routes/components/CSS (low):** `dumbmodel/api/compare`, `dumbmodel/components/site.tsx` (SiteHeader/SiteFooter), `dumbmodel/app/globals.css` legacy block, `control/api/hill-climb` — maintenance noise that confuses new contributors and inflates bundle/CSS slightly.
- **Missing per-page `metadata` on hub + dumbmodel home pages (low–medium):** the two most important landing pages inherit only the layout-level title; weaker SEO and social-share cards.
- **Inline admin-key read in control home (low):** not a leak (server component), but diverges from the centralized `admin-api` pattern and is easy to drift.
- **Hub contact leads path fragility (low):** `LEADS_DIR` defaults to `path.join(process.cwd(), "..", "..", "..", "data", "leads")` (`app/api/contact/route.ts:9`) — relies on cwd being the site dir. Vercel/Next satisfy this, but a non-standard invocation could misplace the JSONL. Override via `LEADS_DIR` env if ever needed.

## Recommendation
1. **Restore tracing on hub home/try:** refactor `apps/sites/hub/app/page.tsx:34-53` and `app/try/page.tsx:13-25` to use `synthFromEnv("hub")` for `/v1/budget`, `/v1/ledger`, `/v1/models`; keep raw `fetch` only for `/healthz`. One-line behavioural win for observability.
2. **Add `export const metadata`** (title + description) to `apps/sites/hub/app/page.tsx` and `apps/sites/dumbmodel/app/page.tsx` — match the pattern already used by their sibling pages.
3. **Centralize control's admin fleet call:** add `adminFleetStatus()` to `packages/ui-fleet/src/admin-api.ts` and call it from `apps/control/app/page.tsx:17-29` so the page stops reading `API_SECRET_KEY` inline.
4. **Delete dead code:** `apps/sites/dumbmodel/components/site.tsx` (SiteHeader/SiteFooter), `apps/sites/dumbmodel/app/api/compare/route.ts` (or wire it), `apps/control/app/api/hill-climb/route.ts`, and the legacy block in `apps/sites/dumbmodel/app/globals.css` (keep only the `.bh-btn--hen` / `.bh-btn--primary.bh-btn--cone` overrides).
5. **Optional hygiene:** add `.next/` and `node_modules/` to each site's `.gitignore` for defence-in-depth (root already covers them).

## Evidence
- Files read: all listed in Scope; plus `packages/synth-core/src/{client,index}.ts`, `packages/ui-fleet/src/{routes/index.ts,admin-api.ts,site-api.ts}`, `config/fleet.json` (venture blocks for hub/dumbmodel/control), root `.gitignore`.
- Key observations:
  - `Synth` client (`packages/synth-core/src/client.ts:24-118`) exposes `ledger.tail/budget`, `model.list`, `vector.search`; `synthFromEnv()` at `src/index.ts:19-23` reads `SYNTH_API_BASE_URL`/`SYNTH_API_KEY`. Hub home/try do not use it.
  - `ui-fleet/routes` (`packages/ui-fleet/src/routes/index.ts`) re-exports `GET_health`, `POST_search`, `POST_diagnose`, `GET_models`, `GET_ledger`, `POST_feedback`, `POST_hillClimb`, `GET_bdQueue` — all route handlers in hub/dumbmodel/control that use these are correct one-liners.
  - `ui-fleet/admin-api.ts:8` reads `API_SECRET_KEY ?? SYNTH_ADMIN_KEY`; control `app/page.tsx:6` mirrors this exactly — consistent.
  - `dumbmodel` venture CTA → `/check` chain verified end-to-end: `config/fleet.json:148-156` → `app/page.tsx:33` → `app/check/page.tsx` → `HealthCheckPanel.tsx:63-76` (consent) → `/api/diagnose` → `ui-fleet/routes POST_diagnose` → `siteDiagnose`.
  - `hub` venture CTA → `/contact` chain verified: `config/fleet.json:86-94` → `app/page.tsx:84` → `app/contact/page.tsx` → `/api/contact/route.ts:45-55` → `data/leads/leads.jsonl` (root `.gitignore:24` ignores `/data/`).
  - Dead-code grep: `SiteHeader`/`SiteFooter` defined only in `apps/sites/dumbmodel/components/site.tsx:4,26`, no callers; `/api/compare` referenced nowhere in `apps/sites/dumbmodel`; `/api/hill-climb` referenced nowhere in `apps/control` (only `/api/admin/hill-climb`).
  - Legacy CSS grep: `className="(hero|card|grid-2|muted|mono|page|btn-*)"` returns no matches in `apps/sites/dumbmodel`.
