---
type: Review
title: UX / UI Review
description: Interface quality review of the fleet web surfaces — training console dataviz, ui-fleet design system, and site-level consistency.
tags: [review, ux, ui]
timestamp: 2026-07-02T15:30:07Z
reviewer: ux-ui-sme
status: living
---

# Charter

This is a living UX/UI review of the Blue Hen RE fleet web surfaces: the new
[training console](/platform/training-console.md) (W&B-style run telemetry UI),
the shared `@synthaembed/ui-fleet` design system, and the fleet sites (hub,
finance-lab, dumbmodel, research-rag). It judges information hierarchy, visual
consistency across sites, chart/dataviz quality (tooltips, legends,
accessibility, color usage), responsive behavior, loading/empty/error states,
and adherence to the stated "enterprise B2B voice — measured, evidence-backed"
(`docs/DESIGN_SYSTEM.md`, CLAUDE.md preferences).

The review is extended over time: new findings are appended under dated
headings in **Findings**, resolved items are marked resolved in place, and the
frontmatter `timestamp` tracks the latest revision. Telemetry contract context
lives in [core-api telemetry](/platform/core-api-telemetry.md).

# Findings

## 2026-07-02

| ID | Severity | Finding | Location |
|----|----------|---------|----------|
| UX-001 | high | Chart fallback data table pairs series values by array index, not by step — misreports data when series log on different steps | `apps/sites/training-console/components/LineChart.tsx:213-219` |
| UX-002 | high | Unknown run statuses are rendered as "Finished" with a green dot | `apps/sites/training-console/components/StatusPill.tsx:10-11` |
| UX-003 | high | Live dashboard goes silently stale: polling errors after first successful load are never surfaced | `apps/sites/training-console/components/RunDetail.tsx:75-84`, `apps/sites/training-console/app/page.tsx:48` |
| UX-004 | medium | Training console runs a parallel, disconnected token system inside FleetShell — two visual languages on one page; no `data-site="training-console"` theme exists | `apps/sites/training-console/app/console.css:4-31`, `packages/ui-fleet/src/tokens.css:105-138` |
| UX-005 | medium | `chart-grid` min column 380px overflows viewports narrower than ~412px — horizontal scroll on common phones | `apps/sites/training-console/app/console.css:98` |
| UX-006 | medium | Chart inspection is mouse-only (no touch/keyboard path); crosshair is anchored to series[0]'s nearest step while dots snap per-series, so they can disagree | `apps/sites/training-console/components/LineChart.tsx:77-87,172-182` |
| UX-007 | medium | Categorical slots `--s2` (#199e70) and `--s4` (#008300) are confusable (both greens, worse for deutan/protan); color-by-key promise breaks when a series appears mid-run | `apps/sites/training-console/app/console.css:16-19`, `components/RunDetail.tsx:13-15,215-218` |
| UX-008 | medium | Run-detail hero tiles show the first five numeric summary keys in arbitrary server order with raw keys; run list curates preferred metrics — inconsistent hierarchy | `apps/sites/training-console/components/RunDetail.tsx:109-116` vs `app/page.tsx:102-110` |
| UX-009 | medium | Voice drift on dumbmodel: "Hall of Cone", "DumbnessMeter", `dumbnessScore` UI copy vs the stated measured enterprise B2B voice; "collapse score" and "dumbness" used interchangeably | `apps/sites/dumbmodel/app/page.tsx:35-36`, `components/ComparePanel.tsx:76,173` |
| UX-010 | medium | Google Fonts loaded via CSS `@import` — render-blocking external request, FOUT, and a third-party dependency the CSP/self-hosting posture doesn't need | `packages/ui-fleet/src/base.css:5` |
| UX-011 | medium | Hub page is built from inline styles and a local `StatCard`, duplicating `StatTile`/`bh-metric`; contradicts the design system's own proliferation checklist which marks hub "done" | `apps/sites/hub/app/page.tsx:72-134,139-161`, `docs/DESIGN_SYSTEM.md:63-67` |
| UX-012 | low | Tooltip left-clamp at 70% with `min-width: 120px` still overflows narrow panels; vertical position is unclamped and can spill below the chart | `apps/sites/training-console/components/LineChart.tsx:184-191`, `app/console.css:111-116` |
| UX-013 | low | Finance-lab "Run paper sim →" resolves to a page containing only CLI instructions; spec link points at a different repo (`henington-homes`) | `apps/sites/finance-lab/app/simulate/[platform]/page.tsx:25-36`, `app/page.tsx:30-32` |
| UX-014 | low | Sub-minimum text sizes: 9px SVG ticks/legend labels scale down to ~6px effective in narrow panels; `bh-badge` is 0.62rem (~10px) uppercase | `apps/sites/training-console/components/LineChart.tsx:115,122,147`, `packages/ui-fleet/src/components.css:227` |
| UX-015 | low | Loading affordances inconsistent: skeleton system exists but the only data-heavy surface uses bare "Loading run…" text; mobile nav position hard-codes `top: 56px` | `packages/ui-fleet/src/base.css:102-133`, `components.css:132`, `apps/sites/training-console/components/RunDetail.tsx:84` |

### UX-001 — Data-table misalignment (correctness)

`LineChart` renders its accessibility fallback table by iterating
`series[0].points` and reading `series[s].points[i]` for the other columns
(`LineChart.tsx:213-219`). Rows carry `series[0]`'s step in the first column,
so any series that starts later, skips steps, or logs at a different cadence
(exactly the case for `eval/*` vs `train/*` metrics, or R2D curvature families)
has its values attributed to the wrong step. On a telemetry product whose whole
pitch is "evidence-backed", the fallback view must be correct or absent. Pair
by step (map lookup), rendering "—" for missing steps.

### UX-002 — Unknown status coerced to success

`StatusPill.tsx:10-11`: `const known = status in LABELS ? status : "finished"`.
A run whose backend status is `crashed`, `killed`, or `queued` displays as
**Finished** with the green `--status-good` dot. This inverts the meaning of
the one glanceable health signal on both the run list and run detail. Unknown
statuses should render neutrally (grey dot, raw label), never as success.

### UX-003 — Silent staleness on a live dashboard

Both pollers set `error` state on failure, but the run-detail view only renders
it when `!run` (`RunDetail.tsx:75-84`) and the run list only when
`runs === null` (`page.tsx:48`). After the first successful fetch, a dead
telemetry source produces a frozen dashboard indistinguishable from a healthy
idle one — the "Running" pill keeps pulsing on stale data. W&B-class tools
surface a "connection lost / last updated Ns ago" indicator; this needs the
same. (The empty/first-load error states themselves are good: actionable copy
with exact recovery commands.)

### UX-004 — Two design languages in one shell

`console.css` declares its own page background (`#0d0d0d` vs `--bh-canvas`
`#0b0d0a`), its own greys, `system-ui` type instead of DM Sans/Instrument
Serif, 8px radii and 1px hairlines instead of the brutalist 2px-border /
2-4px-radius system — all inside a `FleetShell` header/footer rendered with
`bh-*` tokens. The comment says the chart palette is deliberately separate
(sound: series colors should not collide with brand accents), but the
*surfaces, type, and structure* should come from `tokens.css`. There is also no
`data-site="training-console"` accent theme in `tokens.css:105-138`, so the
shell silently falls back to hub blue. Either register the site theme and map
`--page/--surface-1/--muted` onto `--bh-*` equivalents, or document the
console as intentionally off-system in `docs/DESIGN_SYSTEM.md`.

### UX-005 — Chart grid overflows small phones

`grid-template-columns: repeat(auto-fill, minmax(380px, 1fr))` with 16px page
padding forces a 380px track on a 375px-wide iPhone SE/13 mini class viewport
→ body-level horizontal scroll. Use `minmax(min(380px, 100%), 1fr)`. The run
grid (`minmax(320px, 1fr)`, `console.css:55`) is borderline at 360px viewports
for the same reason.

### UX-006 / UX-012 — Chart interaction gaps

Hover handling is `onMouseMove` only: no touch equivalent (pointer events) and
no keyboard focus path to inspect values, so tablet/phone users get lines with
no readouts. The `<details>` data table is a genuine mitigation (and the
`role="img"` + `aria-label` is correct), but it is downstream of UX-001's
misalignment. Separately, the crosshair line and tooltip step are taken from
`nearest[0]` (series 0's nearest point) while the highlight dots snap each
series independently — with unaligned series the dots visibly detach from the
crosshair. Snap all series to a shared step domain, and clamp the tooltip
within the panel on both axes.

### UX-007 — Palette confusability and slot stability

`--s2 #199e70` ("aqua") and `--s4 #008300` ("green") sit ~30° apart in hue at
similar lightness; under deuteranopia they are effectively one color, and the
legend swatches are 10px squares. Since R2D curvature families
(`asn/r2d_curvature_b1..bN`) are exactly the multi-series case, reorder the
slots so adjacent indices alternate hue families, or replace `--s4`. Also, the
`SLOT_ORDER` comment in `RunDetail.tsx:13-15` claims "colors follow the metric
key, never its position", but assignment is `SLOT_ORDER[i]` over the
family-sorted key list — a series that first logs mid-run reshuffles every
color after it. Hash the key suffix to a slot instead.

### UX-009 — Voice consistency

The operator preference and `docs/DESIGN_SYSTEM.md` both specify measured,
evidence-backed enterprise copy. The dumbmodel surface leads with "How does
your embedding compare?" and "measured on eval gates, not marketing claims"
(good), then presents a "DumbnessMeter", "Hall of Cone", and a select listing
"(collapse score N)" backed by a field named `dumbnessScore`. Playfulness may
be intentional for this property, but the same metric is called two things in
one panel, and "dumbness" leaks into what the header frames as benchmark
evidence. Standardize on "collapse score" in all UI copy; keep mascots if the
site's charter allows, but the metric vocabulary must be single and sober.

### UX-011 — Design-system adoption is regressing by copy-paste

Hub composes its dashboard from `style={{}}` props and a bespoke `StatCard`;
`ArxivExamDemo.tsx:32-52` does the same with legacy `fleet-badge` classes and
`ui-monospace` inline font. The fleet now has three stat-tile implementations
(hub `StatCard`, console `StatTile`, `bh-metric`) and two badge systems. Each
divergence is small; together they guarantee the sites drift apart. The
checklist in `DESIGN_SYSTEM.md` already names the fix — it just hasn't been
applied to the pages it marks "done".

# Recommendations

Prioritized; the first three are correctness/trust issues and should land
before the training console is shown to anyone external.

1. **Fix the data-table step pairing** (UX-001): build a step-indexed map per
   series; never pair by array position.
2. **Render unknown statuses honestly** (UX-002): neutral pill + raw label for
   anything outside `running/finished/failed`.
3. **Add a staleness/connection indicator** (UX-003): show "last updated Xs
   ago" from the last successful poll, and an inline reconnect banner when a
   poll fails after initial load. Pause polling on `document.hidden` while
   you're in there.
4. **Register `training-console` in `tokens.css`** and map the console surface
   tokens to `--bh-*` (UX-004); keep the chart-series palette separate by
   design, but on Blue Hen surfaces and type.
5. **Make chart grids shrinkable**: `minmax(min(380px, 100%), 1fr)` (UX-005).
6. **Unify chart snapping and add pointer events** (UX-006/UX-012): shared
   step domain for crosshair, dots, and tooltip; `onPointerMove` for touch;
   clamp the tooltip inside the panel.
7. **De-risk the categorical palette** (UX-007): replace or reorder `--s4`,
   and hash metric keys to slots so colors are truly stable.
8. **Curate run-detail hero tiles** (UX-008): reuse the run list's preferred-
   key ordering (`train/loss`, `eval/ndcg10`, `asn/effective_rank`) and strip
   prefixes in labels the same way.
9. **Single metric vocabulary on dumbmodel** (UX-009): "collapse score"
   everywhere user-facing.
10. **Move fonts to `next/font`** (UX-010) and delete the `@import`.
11. **One components pass on hub + ArxivExamDemo** (UX-011): `bh-metric`/
    `StatTile` consolidation, `bh-badge` over `fleet-badge`, kill inline
    styles per the proliferation checklist.
12. **Ship real content or gate the finance-lab sim pages** (UX-13): a
    product page whose only body is CLI copy reads as broken to a visitor;
    either render fixture results server-side or label the page "operator
    instructions" explicitly. Fix the cross-repo spec link.

# Watchlist

Re-check on future passes as the platform evolves:

- **LineChart at scale**: current SVG path rendering has no downsampling; a
  50k-step run will emit 50k-command paths per series. Watch render cost and
  add LTTB/decimation before long runs are real.
- **Design-system drift**: any new site or page that ships with inline styles
  or a fresh local token set (training console was the second instance;
  UX-004/UX-011). `DESIGN_SYSTEM.md` "Next" items remain open.
- **Dark-only assumption**: `console.css` notes light values are "kept for
  future theming" but none are wired; if a light theme lands, every hardcoded
  hex in charts and mascots needs an audit.
- **Status vocabulary**: the run status enum will grow (queued, crashed,
  preempted); StatusPill and the run-list "Running now" tile both assume the
  current three.
- **`--bh-faint` (#525850) contrast** (~2.6:1 on canvas): currently unused in
  reviewed surfaces; flag any adoption for body text.
- **Event kinds**: only `collapse_alert` and `surgery` have styling
  (`console.css:125-126`); new event kinds will render unmarked.
- **finance-lab Phase B → C**: when real simulation results render, this
  review needs a dataviz pass on that surface (Sharpe/turnover displays).

# Citations

1. [apps/sites/training-console/components/LineChart.tsx](../../apps/sites/training-console/components/LineChart.tsx)
2. [apps/sites/training-console/components/RunDetail.tsx](../../apps/sites/training-console/components/RunDetail.tsx)
3. [apps/sites/training-console/components/StatusPill.tsx](../../apps/sites/training-console/components/StatusPill.tsx)
4. [apps/sites/training-console/components/StatTile.tsx](../../apps/sites/training-console/components/StatTile.tsx)
5. [apps/sites/training-console/app/console.css](../../apps/sites/training-console/app/console.css)
6. [apps/sites/training-console/app/page.tsx](../../apps/sites/training-console/app/page.tsx)
7. [apps/sites/training-console/app/layout.tsx](../../apps/sites/training-console/app/layout.tsx)
8. [apps/sites/training-console/lib/api.ts](../../apps/sites/training-console/lib/api.ts)
9. [packages/ui-fleet/src/tokens.css](../../packages/ui-fleet/src/tokens.css)
10. [packages/ui-fleet/src/base.css](../../packages/ui-fleet/src/base.css)
11. [packages/ui-fleet/src/components.css](../../packages/ui-fleet/src/components.css)
12. [packages/ui-fleet/src/FleetShell.tsx](../../packages/ui-fleet/src/FleetShell.tsx)
13. [apps/sites/hub/app/page.tsx](../../apps/sites/hub/app/page.tsx)
14. [apps/sites/finance-lab/app/page.tsx](../../apps/sites/finance-lab/app/page.tsx)
15. [apps/sites/finance-lab/app/simulate/[platform]/page.tsx](../../apps/sites/finance-lab/app/simulate/%5Bplatform%5D/page.tsx)
16. [apps/sites/dumbmodel/app/page.tsx](../../apps/sites/dumbmodel/app/page.tsx)
17. [apps/sites/dumbmodel/components/ComparePanel.tsx](../../apps/sites/dumbmodel/components/ComparePanel.tsx)
18. [apps/sites/dumbmodel/app/globals.css](../../apps/sites/dumbmodel/app/globals.css)
19. [apps/sites/research-rag/app/page.tsx](../../apps/sites/research-rag/app/page.tsx)
20. [apps/sites/research-rag/components/ArxivExamDemo.tsx](../../apps/sites/research-rag/components/ArxivExamDemo.tsx)
21. [docs/DESIGN_SYSTEM.md](../../docs/DESIGN_SYSTEM.md)

## 2026-07-03 — Data Refinery launch review (DR-107)

**Verdict: BLOCK**

Scope: live site https://refinery-zeta.vercel.app (/, /catalog, /datasets/[slug], /contribute, /requests — all 200), `apps/sites/refinery/`, `packages/ui-fleet/src/tokens.css`, Spec 0018 §3.

1. **BLOCK — `--bh-copper` is referenced but never defined; the site's accent is broken in production.** `tokens.css:161-162` sets `--bh-accent: var(--bh-copper)` for `[data-site="refinery"]`, but no `--bh-copper:`/`--bh-copper-dim:` declaration exists anywhere in the repo or in the shipped bundle (verified: `/_next/static/css/521db9afdeeea45f.css` contains the reference and no definition; all seven sibling tokens — `--bh-clay: #c0a478`, `--bh-instrument: #66a09d`, etc. — are defined at :root). Per CSS custom-property semantics `--bh-accent` becomes guaranteed-invalid inside the refinery shell, so every one of the 31 `var(--bh-accent)`/`--bh-accent-dim` usages computes to `unset` — `.bh-btn--primary` (components.css:488) gets `background: transparent` with `color: var(--bh-canvas)` = canvas-on-transparent, i.e. the primary CTAs ("Browse the catalog", "Search", "Contribute with consent", "Request a proposal") are effectively invisible. Spec 0018 §3 required "new token `--bh-copper` family (distinct from all seven; AA-verify)" — the token was never added, so the mandated AA verification cannot have happened. Next action: define `--bh-copper`/`--bh-copper-dim` at :root in tokens.css, AA-check against `--bh-canvas`, redeploy, and eyeball every CTA.
2. **High — spec IA incomplete: `/ops` does not exist** (live 404; no `app/ops/` in `apps/sites/refinery/app/`). Spec 0018 §3 lists it as part of launch IA (workspace-key-gated division console). Next action: either ship `/ops` or amend Spec 0018 to move it to a later phase so the STATUS board is honest.
3. **High — canonical/sitemap URLs point at a domain that 404s.** `layout.tsx` sets `metadataBase: https://data.bhenre.com` and `robots.ts`/`sitemap.ts` emit `Sitemap: https://data.bhenre.com/sitemap.xml`; `https://data.bhenre.com/` currently returns 404 (G1 not yet granted). Crawlers on refinery-zeta.vercel.app are handed canonical + sitemap references to dead URLs. Next action: derive metadataBase from the fleet.json `domain` field (refinery-zeta.vercel.app) until G1 flips.
4. **Medium — homepage pipeline copy claims "robots-respecting" but the fetcher has zero robots.txt handling** (`grep -ri robots packages/datalab` → no hits) — an honesty-constraint violation in product copy (details in security review). Next action: cut the claim from `app/page.tsx` until the fetcher implements it.
5. **Low — positives worth recording:** TeamStrip renders live ("Data Operations" strip present in served HTML, registry-driven per Spec 0019 §2.4); empty states are honest and carry unblock commands (`bh-alert` blocks in page.tsx/catalog/page.tsx name the exact API endpoint); touch targets meet the 44px floor (components.css:95,167,473,1581); table/pre overflow is contained (`overflow-x: auto`, components.css:650; dataset page pre has explicit overflowX). No action.

Citations: `apps/sites/refinery/app/{layout,page,robots,sitemap}.tsx|ts`, `apps/sites/refinery/app/catalog/page.tsx`, `packages/ui-fleet/src/tokens.css`, `packages/ui-fleet/src/components.css`, `packages/ui-fleet/src/TeamStrip.tsx`, live: refinery-zeta.vercel.app (200s), data.bhenre.com (404), CSS bundle 521db9afdeeea45f.css.
