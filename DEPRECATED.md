# This repository is deprecated

**Date:** 2026-08-09
**Status:** No further feature development in this monorepo. Development consolidates into the **dottie** monorepo: [github.com/jcdavis131/dottie](https://github.com/jcdavis131/dottie). This repo remains readable as history; salvage proceeds per the manifest below.

## Summary

- The **bhenre.com web surfaces are retired**: the storefront (`apps/sites/storefront` → bhenre.com), the Simulation Lab (`apps/sites/simulation` → signals.bhenre.com), the planned Data Refinery (`apps/sites/refinery` → data.bhenre.com, never fully shipped), the commerce service behind the storefront (`services/commerce`), and the org console previously served at www.bhenre.com (built in dottie under `apps/bluehenre`).
- **slasso.com is the successor surface** for validation and training progress: the new read-only, provenance-honest training-progress dashboard is being built in dottie and re-homed onto the Validation Lab venture. slasso's current queue/scorecards pages are the design ancestors of that dashboard, not deprecation targets.
- **Deprecating this codebase is distinct from taking down live properties.** The sites listed under "Not deprecated" stay live and continue to be served from their existing deploys per `config/fleet.json` until each is individually reworked or migrated.

## Not deprecated (live sites and their sources of truth)

| Site | Current source of truth | Notes |
|---|---|---|
| slasso.com | `apps/sites/validation` (domain attached to Vercel project `who-e`; fleet registry's legacy pointer names `agent-lasso`) | Successor surface; destination of the new training-progress dashboard |
| arxiviq.com | `apps/sites/research` (Vercel project `arxiv-exam-app`) | Unaffected; continues on existing deploy |
| dumbmodel.com | `apps/sites/dumbmodel` | Unaffected; continues on existing deploy |
| jcamd.com | Repurposed to the Operator personal site (2026-07-04, per `config/fleet.json` note); the hq app itself lives at bluehenre-control.vercel.app | Unaffected |
| training.jcamd.com | `apps/sites/observatory` | Under the jcamd domain, spared with it |

## Retired surfaces

| Surface | Source | Disposition |
|---|---|---|
| bhenre.com (storefront) | `apps/sites/storefront` + `services/commerce` | Retired with the commerce path |
| signals.bhenre.com (Simulation Lab) | `apps/sites/simulation` | Retired |
| data.bhenre.com (Data Refinery) | `apps/sites/refinery` (planned, Spec 0018) | Never fully shipped; dropped |
| www.bhenre.com (org console) | dottie `apps/bluehenre` | Retired as a deployed site; salvageable exporters/gates/parsers carry into the slasso dashboard |

## Salvage manifest

Verdicts: **salvage-now** (carry into dottie during wind-down), **salvage-later** (listed; port when the dottie-side dependency exists), **drop** (dies with the retired surfaces).

### From this repo

| Asset | Source | Verdict | Destination in dottie |
|---|---|---|---|
| Spec 0008 — Eval Harness & Deploy Gates (gate definitions, fail-closed doctrine) | `specs/0008-eval-harness-and-gates.md` | salvage-now | `docs/` — certification gate spec for the slasso dashboard |
| Spec 0012 — Operating Loop / promotion pipeline (ledger stages, handoff contracts; §§2, 4, 6, 8) | `specs/0012-synthetic-org-divisions-and-handoffs.md` | salvage-now | `docs/` — promotion-queue semantics for the slasso dashboard |
| Glossary (term decoder: Validation Queue, ledger stages, domain aliases, gate shorthand) | `memory/glossary.md` | salvage-now | `knowledge/` or memory glossary file (trim retired-method terms) |
| Site context notes for surviving surfaces | `memory/projects/slasso.md`, `memory/projects/arxiviq.md` | salvage-now | memory/context notes |
| fleet.json venture definitions (validation block esp.; also dumbmodel + research) | `config/fleet.json` | salvage-now | `config/` registry or the dashboard spec's framing section |
| Validation Queue schema + seed candidates | `content/fleet/bd/queue.json` (mirror: `apps/sites/validation/data/bd-queue.json`) | salvage-now | Data file backing the dashboard's promotion-queue card |
| Scorecards docs-as-data pages (frontmatter parser, verdict badges, empty-state copy) | `apps/sites/validation/app/scorecards/` (+ fixture `content/fleet/bd/scorecards/example-research-rag.md`) | salvage-now | Port into the slasso dashboard (strip workspace package imports) |
| Unified work-queue CLI + queue pattern | `scripts/pick_task.py` + `config/work_queue.json` shape | salvage-now | `scripts/` — adapt paths; feeds/regenerates `tasks/todo.md` |
| Multi-agent session conventions (one-claim rule, bucket-1/2/3 edit classification) | `docs/wiki/SESSION_BOOT.md` | salvage-now | Merge surviving rules into COORDINATION.md |
| EVIDENCE.md discipline (normative header only) | `EVIDENCE.md` | salvage-now | Evidence/claims doc convention (pattern, not content) |
| SCIENCE_REVIEW.md DROP/VERIFY review pattern | `SCIENCE_REVIEW.md` | salvage-now | Review convention (pattern only) |
| Certify funnel (form, API route, page copy) | `apps/sites/validation/app/certify/`, `components/CertifyForm.tsx` | salvage-later | Revisit when dottie has a certification intake backend; port copy only |
| eval-harness package (nDCG@10, effective rank, gate computation) | `packages/eval-harness/` | salvage-later | `pipeline/` when real certification runs are executed; not needed for the read-only dashboard |
| Storefront, Simulation Lab, Data Refinery, commerce stack + their specs | `apps/sites/storefront`, `apps/sites/simulation`, `services/commerce`, specs 0013/0021/0022 monetization line | drop | n/a — these are the retired bhenre.com surfaces |
| slasso Overworld/Verdict game layer | `apps/sites/validation/app/overworld/`, `app/verdict/` | drop | n/a for the dashboard; the live slasso deploy keeps serving it until the site is reworked |
| ASN method stack (engine, autoresearch scripts, whitepaper, trainer specs) | `packages/asn-engine`, `scripts/autoresearch_*`, `WHITEPAPER.md` | drop | Superseded by dottie's training stack; the deploy-gate lesson survives via Spec 0008 |

### From the retired org console (dottie `apps/bluehenre`)

| Asset | Source | Verdict | Destination in dottie |
|---|---|---|---|
| Eval-runs exporter + readout schema (provenance bins, sha256 pinning, `--check` freshness gate) | `apps/bluehenre/scripts/build_runs_readout.mjs` + `public/runs_readout.json` | salvage-now | slasso training-progress dashboard app (near-verbatim) |
| Pure-parser module + bare-node contract tests + run-card renderer | `apps/bluehenre/public/js/twin.mjs`, `twin.contract.test.mjs`, `console.mjs` (renderRuns) | salvage-now | Dashboard parser layer + test suite |
| Release gate — honesty-contract smoke (pre + post-deploy) | `apps/bluehenre/scripts/release_gate.mjs` | salvage-now | Dashboard deploy gate (rewrite assertions for its artifacts) |
| SPEC.md Pillar 3 (Monitor) + honesty doctrine + data-spine sections | `apps/bluehenre/SPEC.md` (lines 80–131, 174–179) | salvage-now | Requirements text for the slasso dashboard spec |
| Fleet design tokens, standalone (parchment/serif light+dark CSS) | `apps/bluehenre/public/org.html` (style block) | salvage-now | Dashboard stylesheet |
| Training-curve readout schema (trainer-event-segmented legs, decimated curves) | `apps/bluehenre/public/training_runs.json` (generator stays in dottie) | salvage-now | Dashboard's training-progress card contract |
| Steer channel poller | `apps/bluehenre/scripts/steer_poll.py` | salvage-later | Relocate box-side alongside the console's successor; never wired into slasso (public surface stays read-only) |
| Terminal-skin console UI, PWA shell, console cards | `apps/bluehenre/public/index.html`, `manifest.json`, `api/`, `server.mjs` | drop | n/a — dies with bhenre.com |

## Ground rules during wind-down

- No new features land in this repo. Changes are limited to salvage, deprecation notices, and corrections of record.
- Salvaged evidence and review conventions carry forward as **patterns**; retired-method measurement content does not.

## 2026-09-05 archive

The repository is archived on GitHub after this change. Summary of the archive commit:

- `README.md`: archive banner is now the first line; earlier 2026-08-09 notice folded beneath it.
- Agent entrypoints replaced with 5–10 line redirects to dottie (original content at `6f3787bc97351c06629056fdaa159956059ff32b`):
  `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/TEAM.md`, `AGENTS.md`, `docs/AGENT_INIT.md`,
  `docs/wiki/SESSION_BOOT.md`, and the four `.cursor/rules/*.mdc` files (frontmatter kept so Cursor still parses them).
- `HANDOFF.md`: dated archive block prepended; history untouched. Live handoff is dottie's `HANDOFF.md`.
- `.github/workflows/okf-refresh.yml`: weekly `schedule:` trigger removed so the OKF curator never commits here again
  (`workflow_dispatch` kept for history). It was the only scheduled workflow.
- `config/fleet.json`: `status` set to `retired` for `storefront` (bhenre.com), `synthorg` (fleet agent),
  `simulation` (signals.bhenre.com) and `refinery` (data.bhenre.com). Left `active`, matching the
  "Not deprecated" table above: `hq` (jcamd.com entry), `dumbmodel`, `validation` (slasso.com), `research`
  (arxiviq.com), `observatory` (training.jcamd.com). `packages/fleet/src/types.ts` gained `"retired"` in `SiteStatus`.
- Security-fix port check (commits `9aec4ff` XFF rate-limit, `5f4f5c1` SSRF DNS-rebinding): `services/core-api`
  and `packages/datalab` do not exist in dottie and no equivalent XFF-keyed limiter or user-URL fetcher was found
  there, so there is nothing to port.
- Open PR #1 (spec 0021 monetization line, 2026-07-04) closed as part of the archive.
