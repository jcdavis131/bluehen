# Live-fix findings — arcade.dumbmodel.com (2026-09-06)

Lane L2 (`weekend/live-fix-arcade`), pipelined from the L1 live-fetch audit
(`C:\Users\jcdav\.claude\jobs\b3fe1852\tmp\lanes\L1-arcade\AUDIT_arcade.md`, full evidence there —
not restated here). This document covers the items this lane did **not** code-fix, and why, plus
one piece of registry drift observed in passing.

## Fixed in this branch (see commit for full evidence)

- `apps/sites/dumbmodel/app/layout.tsx:6` `metadataBase`
- `apps/sites/dumbmodel/app/sitemap.ts:4` `BASE`
- `apps/sites/dumbmodel/app/robots.ts:6` `sitemap` field — a **third** instance of the same
  hardcoded-apex-domain defect that L1's defect 2 didn't cite by line but is the identical root
  cause: live `curl https://arcade.dumbmodel.com/robots.txt` (captured before this fix, see
  `live_before/robots.txt` in this lane's scratch dir) returned
  `Sitemap: https://dumbmodel.com/sitemap.xml` — pointing crawlers that respect `robots.txt` at
  the wrong domain's sitemap even after the sitemap.ts fix alone. Left unfixed, defect 2's repair
  would have been incomplete for any crawler that discovers the sitemap via `robots.txt` rather
  than a direct fetch.

All three are single-literal-string changes (`https://dumbmodel.com` → `https://arcade.dumbmodel.com`),
matching the pattern every sibling site in this monorepo already uses for its own domain
(`apps/sites/{observatory,refinery,research,simulation,storefront,validation}/app/layout.tsx` each
hardcode their own literal `metadataBase` URL — confirmed by
`grep -rn "metadataBase" apps/sites/`). No env-var indirection was introduced; that would be a
bigger change than the defect calls for and isn't this repo's convention.

**Disclosure the verifier should not have to dig for:** this fix changes the `og:image` failure
mode, not just its host. Before: `https://dumbmodel.com/opengraph-image?...` → 404 (wrong site
entirely). After: `https://arcade.dumbmodel.com/opengraph-image` → 200 `image/png`,
**0 bytes** (see Defect 3 below — pre-existing, confirmed live by L1, unrelated to this fix). The
domain fix is still correct on its own terms (pointing OG scrapers at a different project's
deployment was wrong regardless of what the correct route itself returns), but it does not make
the OG image actually render; a Twitter/Discord/Slack unfurl will now hit the right host and get a
zero-byte image instead of the wrong host's 404. Both are broken; this fix narrows it to one bug.

## Not fixed — operator decision

### Defect 1: core-api backend down (all 9 game-backed routes fail)

Confirmed by L1 as a Railway hosting/deployment state, not an application bug (the Next.js route
handlers correctly call `SYNTH_API_BASE_URL` and correctly surface whatever the upstream returns;
`infra/railway.md`'s documented backend URL itself 404s straight from Railway's edge). This is
squarely `fix_scope: dashboard` per L1 — reviving/repointing a Railway deployment, or an explicit
retirement decision for these five features, is the operator's call, not a `weekend/*` branch's.
No code change was attempted for this item. See L1's audit for the full evidence and the two
narrow in-repo mitigations L1 identified (surface `/api/status.online` as a visible banner;
replace the raw upstream JSON error string on `/beat` with friendlier copy) — neither requires
this lane to guess at backend state, and this lane did not implement either since they weren't in
the defect list this lane was pipelined from as code-fixable-now (L1 flagged them as
"not attempted by this read-only lane," future work, not agreed defects for L2 to act on) and this
lane's brief is to fix the enumerated defects minimally, not add new UI states.

### Defect 3: `/opengraph-image` returns HTTP 200 image/png, 0 bytes (Severity: low)

L1 read the route source (`apps/sites/dumbmodel/app/opengraph-image.tsx`) and found nothing
obviously wrong: a standard `next/og` edge-runtime `ImageResponse` over static JSX, no external
font or image fetch, no data dependency. This lane attempted one additional read-only check before
declining to touch the file:

**Sibling-route comparison** (do other sites in this monorepo with a structurally identical
`opengraph-image.tsx` show the same failure, a different failure, or a working example?):

| domain | result |
|---|---|
| `https://bhenre.com/opengraph-image` | 307 → `https://www.bhenre.com/opengraph-image` → 404, 79B `text/plain` |
| `https://training.jcamd.com/opengraph-image` | 404, 13,369B `text/html` (Next.js not-found page) |
| `https://arxiviq.com/opengraph-image` | 404, 13,175B `text/html` |
| `https://slasso.com/opengraph-image` | 308 → `https://www.slasso.com/opengraph-image` → 404, 79B `text/plain` |
| `https://signals.bhenre.com/opengraph-image` | 404, 13,318B `text/html` |

**Result: inconclusive.** None of the five siblings reproduce arcade's exact signature
(`200`, `image/png`, `content-length: 0`) — but none of them serve a *working* example either;
every one 404s on the route (either the route resolves to nothing live at that domain, or those
projects don't currently deploy that route path the same way). This neither confirms a
shared/systemic bug across the monorepo's `next/og` usage nor gives a healthy reference
implementation to diff against. A real fix requires either the operator's Vercel function logs for
this specific edge invocation (not available read-only), or an actual `next build` + edge-runtime
execution of this route — which this lane did not attempt: the workspace has no installed
`node_modules` (fresh worktree, pnpm-workspace monorepo with `@synthaembed/*` internal deps), and
installing + building it is the "large in-memory build" guard 10 rules out at ~2 GB free RAM. No
source edit was made to `opengraph-image.tsx` because there is no verified root cause to fix —
editing it now would be a guess presented as a fix, which the "no estimates dressed as
measurements" rule forbids.

### Defect 4: shared `ledger` polling widget calls a route this site never implemented

L1 confirmed this is dead code today (no page mounts the widget; it fails silently and invisibly).
The widget itself lives in the shared `@synthaembed/ui-fleet` package, used by seven sites in this
monorepo, not in `apps/sites/dumbmodel`. Implementing `apps/sites/dumbmodel/app/api/ledger/route.ts`
would be **new code**, not a repoint/delete of something that already exists on a ref — outside
this lane's "minimal fix, no new files" mandate — and editing the shared `ui-fleet` package is a
cross-site change outside this lane's scope entirely (it would affect the other six sites that
import it). No action taken.

## Registry drift observed, not fixed (out of L1's fetch list — not a live fetch)

`config/fleet.json:131` still records `"domain": "dumbmodel.com"` for the `dumbmodel` site entry
(id `dumbmodel`, `appPath: apps/sites/dumbmodel`, described as "The arcade — Blind Rank, Beat the
Baseline..."). This is the same stale-apex-domain fact as defect 2, but in a registry/metadata
file, not something any live page fetches — it wasn't in L1's enumerated fetch/defect list, so
this lane did not touch it. Noting it here so it isn't lost: whoever eventually reconciles the
domain (or the operator, per §8 "operator decisions" in `NEXT_LEVEL_PLAN.md`) should update this
line too, since it's plausibly the source the three hardcoded literals fixed in this branch were
originally copied from.

## Non-action noted

This worktree carries `.claude/CLAUDE.md`, which instructs `cd C:\Users\jcdav\bluehenre` and
`uv run python scripts/pick_task.py claim <id>` before starting work. That script hardcodes a home
checkout path and writes to `TASKS.md`. This lane did not run it: guard 11 requires refusing any
script with a hardcoded `C:\Users\jcdav\<repo>` path, and this lane's actual mandate came from
`NEXT_LEVEL_PLAN.md` §6 (L2), not the bluehenre repo's own AR-*/RT-* autoresearch task queue, which
this work isn't part of.
