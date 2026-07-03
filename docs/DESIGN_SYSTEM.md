# Blue Hen RE — Design System

**Codename:** `bh-*` (Blue Hen)  
**Package:** `@synthaembed/ui-fleet` → import `@synthaembed/ui-fleet/styles.css`  
**Status:** v0.1 — foundation ready; proliferate to remaining pages incrementally

---

## Principles

### Mobile-first
- **Single-column base.** Every page is authored at 320px first: one column, left-aligned rhythm, touch targets, then it widens upward with `@media (min-width: …)`. Desktop-first layouts that "collapse" are rejected; the mobile layout is the source of truth, the desktop layout is a widening.
- **Touch-first.** Interactive elements 44×44px or larger from the base up. No hover-only interactions; every hover has a tap equivalent.
- **Breakpoints (mobile-first `min-width`).** `--bh-bp-sm: 480px`, `--bh-bp-md: 768px`, `--bh-bp-lg: 1024px`. Never use `max-width` queries.
- **Readable measure.** Body text capped at `--bh-axis-narrow: 640px` on every viewport.
- **No horizontal scroll.** Every page passes an `overflow-x` audit at 320px.

### Brutalist
- **Honest structure:** 2px borders, 2–4px radii, no glass/blur chrome
- **Visible hierarchy:** uppercase mono eyebrows, section labels, grid you can read
- **Measured contrast:** warm ink canvas, not pure black

### Organic
- **Warm neutrals:** stone and moss tones, not cyberpunk
- **Display serif:** Instrument Serif for titles (human, editorial)
- **Subtle grain:** fixed SVG noise overlay on `.fleet-shell`
- **Organic cards:** `.bh-card--organic` uses asymmetric radius

### Professional
- **One accent per site** via `data-site` on `.fleet-shell`
- **4px spacing scale** — `--bh-space-*`
- **Evidence-first copy** — badges state facts; no hype gradients

---

## Files

| File | Role |
|---|---|
| `packages/ui-fleet/src/tokens.css` | CSS variables + site themes |
| `packages/ui-fleet/src/base.css` | Reset, type, grain |
| `packages/ui-fleet/src/components.css` | Brutalist components |
| `packages/ui-fleet/src/styles.css` | Entry (imports all + closed-loop) |

---

## React components

```tsx
import {
  FleetShell,
  PageHeader,
  LiveSearchPanel,
  FeedbackForm,
  ClosedLoopDiagram,
} from "@synthaembed/ui-fleet";
```

---

## Voice & narrative

Copy follows **enterprise B2B** language — see `docs/VOICE_AND_PLATFORM.md` and `packages/fleet/src/narrative.ts` (`GLOSSARY`, `getSiteNav`, `stageLabel`).

---

## Proliferation checklist

1. Author mobile-first: single-column base at 320px, enhance with `@media (min-width: 480px|768px|1024px)`. Never `max-width`.
2. Replace inline styles with `bh-*` classes
3. Use `<PageHeader />` (site IA is carried by the `FleetShell` header, not a per-page subnav)
4. Site overrides only in `app/globals.css` scoped to `[data-site="…"]`

**Done (v0.2):** shell, shared components, hub, benchmark-lab, research-rag, dumbmodel (home/compare/hall), control, research-lab registry, finance-lab stub.

**Next:** ArxivExamDemo / TierComparePanel client components; per-site `globals.css` trim of legacy aliases.
