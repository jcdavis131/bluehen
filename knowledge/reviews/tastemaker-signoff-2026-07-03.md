# Spec 0017 — Tastemaker Redesign · Operator sign-off request

**Date:** 2026-07-03
**Spec:** [0017-fleet-tastemaker-redesign](../../specs/0017-fleet-tastemaker-redesign.md)
**Tasks:** SITE-014 → SITE-019 (Phases 2–6)
**Status:** Automated gates green · **pending Operator visual sign-off**

---

## What shipped

The fleet tastemaker redesign is complete across all 7 sites. The visual voice —
Kubrick one-point perspective, Wes Anderson overture title cards, modernized TUI
status bars, warm-ink dark mode — now defines every homepage.

### SITE-016 — Spine rollout
All 6 remaining homepages (hq, dumbmodel, validation, research, observatory,
simulation) now render through `<FleetShell>` + `<StatusLine>` + `<Axis>` +
`<TitleCard>` + `<RuledSection>`, mirroring the storefront pilot. Existing
functionality (InteractiveCircuit, ArxivExamDemo, WaitlistForm, leaderboard) is
preserved inside `RuledSection` chapters.

### SITE-017 — Accent desaturation + a11y gate
- All 7 per-site accents desaturated ~10% to read as one muted family.
- `hen-blue` lifted to `#5384a1` (L=0.48) to clear WCAG AA 4.5:1 on
  `--bh-canvas` (#0b0d0a).
- `scripts/check-tastemaker.mjs` authored — CI-gateable a11y check:
  - No pure black (`#000`/`#000000`) in spec-touched CSS
  - All 7 accents ≥ 4.5:1 contrast on canvas
  - No `@media (max-width)` in spec-touched files (mobile-first mandate)
  - tokens.css drift detection vs the ACCENTS table
- Pre-existing desktop-first `@media (max-width)` blocks in `components.css` and
  `styles.css` inverted to mobile-first `@media (min-width)` — fleet shell nav,
  title card centering, switcher panel, closed-loop diagram, fluid type.

### SITE-018 — Copy + marginalia pass
- Title cards, section labels, and marginalia reviewed against
  `docs/VOICE_AND_PLATFORM.md`.
- Evidence-first enterprise B2B voice throughout; no sports metaphors, no
  decorative emoji in product UI.
- `hq` section label "Live circuit" → "Live operating loop" (enterprise term).
- `GLOSSARY.raceLog` renders as "Operations Ledger" (already correct).

### SITE-019 — CI gate + sign-off
- `check-tastemaker.mjs` wired into `.github/workflows/ci.yml` after `pnpm review`.
- `fleet-review -Build` production build green for all 5 active sites.

---

## Gate results

| Gate | Command | Result |
|---|---|---|
| Build + typecheck | `pnpm review` | ✓ 6/6 sites green |
| Tastemaker a11y | `node scripts/check-tastemaker.mjs` | ✓ all green (0 pure-black, 0 max-width, 7/7 accents ≥ 4.5:1) |
| Fleet production build | `turbo run build` (5 sites) | ✓ 5/5 green |
| Voice lint | `rg "sports\|game-changer\|winning\|champions" apps/` | ✓ 0 matches |

---

## Operator sign-off requested

The automated gates are green. What remains is **visual sign-off** — the
Operator confirming the look reads as intended across the fleet.

### How to review

```powershell
pnpm dev:fleet
```

Then open each site and confirm:
1. **One-point perspective** — content sits on a centered `Axis` column; the
   page reads as a single vanishing-point composition on desktop.
2. **Overture title cards** — each homepage opens with a centered `TitleCard`
   (Instrument Serif title, mono eyebrow, short marginalia). Symmetry engages
   at ≥768px; collapses to left-aligned on mobile.
3. **TUI status bar** — `StatusLine` at the top of each homepage
   (`site · section · status · time` in IBM Plex Mono).
4. **Warm-ink dark mode** — no pure black; canvas is `#0b0d0a`, surfaces are
   warm-tinted. Accents read as one muted family.
5. **Per-site accent identity** — each site's accent hue is distinct but
   harmonized (storefront steel, hq slate, dumbmodel cone-rust, validation moss,
   research heather, simulation clay, observatory instrument-teal).
6. **Mobile nav** — hamburger drawer with ≥44px touch targets; desktop inline
   nav at ≥721px.

### Sites to view

| Site | URL | Accent |
|---|---|---|
| storefront | localhost:3000 | hen-blue |
| dumbmodel | localhost:3001 | cone-rust |
| hq | localhost:3002 | slate-blue |
| validation | localhost:3003 | moss |
| research | localhost:3004 | heather |
| observatory | (dev: `pnpm --filter @synthaembed/observatory dev`) | instrument |
| simulation | (dev: `pnpm --filter @synthaembed/simulation dev`) | clay |

---

## Acceptance criteria traceability (Spec 0017)

| # | Criterion | Status |
|---|---|---|
| 1 | All 7 sites render homepages through spine primitives | ✓ SITE-016 |
| 2 | Warm-ink dark mode, no pure black | ✓ check-tastemaker |
| 3 | `check-tastemaker.mjs` green for all 7 accents | ✓ SITE-017 |
| 4 | Accent desaturation ~8–12%, one family | ✓ SITE-017 |
| 5 | No `max-width` queries in spec-touched CSS | ✓ check-tastemaker |
| 6 | Mobile-first axis (full-width <768px, centered ≥768px) | ✓ SITE-017 |
| 7 | WCAG AA 4.5:1 for all accents on canvas | ✓ check-tastemaker |
| 8 | Voice aligned to VOICE_AND_PLATFORM | ✓ SITE-018 |
| 9 | `pnpm review` green | ✓ all phases |
| 10 | Operator visual sign-off | **pending** |

---

## Files touched this session

**New:**
- `scripts/fleet_loop.py` — cursor-lane task driver
- `scripts/check-tastemaker.mjs` — a11y/voice CI gate

**Modified:**
- `apps/hq/app/page.tsx` — spine adoption + copy
- `apps/sites/{dumbmodel,validation,research,simulation,observatory}/app/page.tsx` — spine adoption
- `packages/ui-fleet/src/tokens.css` — accent desaturation + muted tints
- `packages/ui-fleet/src/components.css` — mobile-first inversion
- `packages/ui-fleet/src/styles.css` — mobile-first inversion
- `.github/workflows/ci.yml` — check-tastemaker CI step
- `package.json` — `fleet:loop` / `fleet:loop:status` aliases
- `config/work_queue.json` — SITE-016/017/018/019 statuses
