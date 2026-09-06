# weekend/live-fix-arcade

**What and why.** `apps/sites/dumbmodel` (the arcade app in this monorepo) moved to serve
from the `arcade.dumbmodel.com` subdomain, but three files kept a literal
`https://dumbmodel.com` from before the move. That apex is now a **different** site (Games
Hub, confirmed live: `<title>DUMBMODEL.COM — Games Hub . Japandi v4</title>`), so every
reference resolved to the wrong deployment.

**Measured evidence.**
- `layout.tsx:6` `metadataBase` → broke every relative OG/Twitter image URL. Before (live):
  `og:image` meta = `https://dumbmodel.com/opengraph-image?...` → curl: 404, 79B,
  `text/plain`.
- `sitemap.ts:4` `BASE` → broke sitemap discovery. Before (live): `sitemap.xml` listed 9
  URLs all under `dumbmodel.com`; `dumbmodel.com/arena` and `/beat` both curl 404 (79B
  each).
- `robots.ts:6` `sitemap` field → a third instance of the same defect, not called out by
  line in the L1 audit but confirmed live in this lane: `curl
  https://arcade.dumbmodel.com/robots.txt` (before) → `"Sitemap:
  https://dumbmodel.com/sitemap.xml"` — crawlers following `robots.txt` would still be sent
  to the wrong host even with `sitemap.ts` fixed alone.

All three are single-literal-string fixes matching every sibling site's own convention in
this monorepo (each `apps/sites/*/app/layout.tsx` hardcodes its own literal
`metadataBase`; no env-var indirection introduced).

**Verified, and how.**
- No `node_modules` in this pnpm workspace, so no static build to serve — a plain
  `http.server` can't exercise a Next.js route handler or `metadataBase` resolution;
  documented instead of faked.
- Ran the repo's own self-contained test (`node --experimental-strip-types --test
  app/arena/pairing.test.ts`, needs no install): **4/4 pass**, verbatim in the lane report.
- Guard 11: `bluehenre` (this repo's local home checkout) was not in the GPU queue
  (`qctl.py status` confirmed); the home checkout `C:\Users\jcdav\bluehenre` was never read
  or written by this lane — a fresh clone into lane scratch was used instead (per the
  arcade-specific brief), and its pre-existing untracked files predate this session
  (mtimes 2026-07-04/05).

**Explicitly NOT done** (`docs/LIVE_FIX_FINDINGS_arcade_2026-09-06.md`, operator decision /
out of lane scope):
- Defect 1: core-api backend down (dashboard/Railway issue).
- Defect 3: after this fix, the `og:image` failure narrows from "404 on the wrong host" to
  "200 `image/png`, 0 bytes on the right host" — that 0-byte body is a separate,
  pre-existing bug this lane could not root-cause without an actual next build/edge run,
  which the ~2GB-free-RAM guard rules out; a 5-sibling-domain comparison was inconclusive
  (none reproduce the same 200/0-byte signature, none serve a working example either) and
  is recorded, not guessed past.
- Defect 4: dead ledger-widget route — lives in a shared `ui-fleet` package, new code, not
  a repoint; out of scope.

**Merge target and blocker.** Base: `origin/main` (re-verified at write time of this PR
body: `origin/main` had advanced from `b5a8f67` to `6f3787b` — a fetch, no push — since
this branch was cut; the branch's merge-base with the *current* `origin/main` tip is that
tip itself, 1 commit ahead, 0 behind — i.e. a clean, conflict-free rebase state as of this
check, not the 6-commit-ahead figure an earlier stale-ref comparison would have shown).
Touches only `apps/sites/dumbmodel/app/{layout.tsx,robots.ts,sitemap.ts}` plus a findings
doc — no code overlap with anything else moving on `main`. No blocker.
