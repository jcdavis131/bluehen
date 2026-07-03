---
type: Review
title: General Usability Review
description: End-to-end operator and developer experience review — onboarding docs, CLI ergonomics, and the runboard-to-training-console golden path
tags: [review, usability, dx]
timestamp: 2026-07-02T15:32:24Z
reviewer: usability-sme
status: living
---

# Charter

Usability and developer-experience review of the Blue Hen RE monorepo, covering: onboarding documentation (`README.md`, `HANDOFF.md`, `TASKS.md`, `docs/wiki/SESSION_BOOT.md`, `docs/wiki/BUILD.md`, `docs/wiki/LOCAL_DEV.md`, this knowledge bundle's [index](/index.md)); CLI surfaces (`scripts/pick_task.py`, `python -m runboard`, `python -m datalab`); the new training workflow end to end (`runboard demo` → `runboard serve` → the [training console](/platform/training-console.md)); empty/error states in the console UI; and terminology consistency across `CLAUDE.md`, `config/fleet.json`, and the knowledge bundle. The governing question: **can a new operator get from `git clone` to a working training dashboard without asking anyone?**

**Living-document convention:** this file is append-only by date. New findings go under a new `## YYYY-MM-DD` heading inside `# Findings`; resolved findings get a status note in place rather than deletion. IDs (`US-NNN`) are never reused.

# Journey Map

The golden path a new operator is implicitly asked to walk, with stall points marked:

```
git clone
  └─ README.md "Quick start"
       ├─ pnpm install ................................ OK
       ├─ uv sync --all-packages --extra dev --extra model ... OK
       ├─ pnpm dev:stack .............................. ⛔ STALL 1 — script does not exist
       │    (none of the ~20 documented pnpm scripts exist in package.json;
       │     no fallback raw commands are given)
       └─ (no mention of runboard / datalab / training-console at all)
            └─ ⛔ STALL 2 — the new training workflow is only discoverable
               via knowledge/platform/*, which no onboarding doc links to

knowledge/platform/training-console.md  (if found)
  ├─ uv run python -m runboard demo .................... OK (if cwd = repo root)
  │    └─ ⚠ STALL 3 — run from any other directory, the store silently
  │       lands in <cwd>/data/runs and later steps show "No runs recorded"
  ├─ uv run python -m runboard serve ................... OK in a full env
  │    └─ ⛔ STALL 4 — in a fresh env the remedy message
  │       ("uv sync --extra api") fails at the repo root
  └─ pnpm --filter @synthaembed/training-console dev ... OK → :3006
       └─ dashboard renders; empty/error states are good (see US-008 note)

scripts/pick_task.py (task loop)
  └─ claim without --agent silently attributes work to "cursor" ... ⚠ STALL 5
```

**Verdict on the governing question:** No. A new operator stalls at step 3 of the README quick start and never learns the training workflow exists. An operator who is *handed* the knowledge bundle link can reach the dashboard in ~3 commands — the workflow itself is coherent; the discovery chain to it is broken.

# Findings

## 2026-07-02

| ID | Severity | Finding | Location |
|----|----------|---------|----------|
| US-001 | high | None of the documented `pnpm` scripts exist — quick start fails at first command | `package.json:8-15` vs `README.md:80-129`, `HANDOFF.md` §6, `docs/wiki/LOCAL_DEV.md`, `docs/wiki/SESSION_BOOT.md`, `docs/wiki/BUILD.md` |
| US-002 | high | New training workflow (runboard → serve → console) invisible from the entire onboarding chain | `README.md`, `HANDOFF.md`, `TASKS.md`, `docs/wiki/*` — zero mentions of runboard/datalab/training-console/knowledge bundle |
| US-003 | high | `runboard serve` and `datalab extract` error remedies name a `uv sync --extra ...` command that fails at the repo root | `packages/runboard/runboard/__main__.py:47`, `packages/datalab/datalab/structure.py:50` |
| US-004 | medium | runboard store root is cwd-relative; wrong-directory invocations silently read/write a different store | `packages/runboard/runboard/store.py:56-58` |
| US-005 | medium | Failed `datalab collect` still emits dataset artifacts, an OKF card, and a knowledge `log.md` entry | `packages/datalab/datalab/pipeline.py`, observed: `knowledge/log.md`, `knowledge/datasets/` |
| US-006 | medium | `pick_task.py claim` defaults `--agent` to `cursor`; no guard for blocked/already-claimed tasks; `claim`/`done` don't refresh TASKS.md | `scripts/pick_task.py:109-133,246` |
| US-007 | medium | Terminology drift: "Training Observatory" vs "Training Console" vs `training-console`; site absent from CLAUDE.md projects, README fleet table, LOCAL_DEV port table | `config/fleet.json:136-152`, `CLAUDE.md`, `README.md:26-33`, `docs/wiki/LOCAL_DEV.md:31-38`, `knowledge/platform/index.md` |
| US-008 | medium | Console swallows fetch errors after first success — dead telemetry source keeps showing stale data with no indicator | `apps/sites/training-console/app/page.tsx:48`, `components/RunDetail.tsx:75` |
| US-009 | medium | `datalab extract` is silently hard-wired to a `FinancialMetrics` schema; help text names neither the schema nor the LLM prerequisite | `packages/datalab/datalab/__main__.py:22-24,50-57` |
| US-010 | low | `runboard list` / `datalab datasets` print nothing on an empty store — no next-step guidance, no headers | `packages/runboard/runboard/__main__.py:29-34`, `packages/datalab/datalab/__main__.py:43-48` |
| US-011 | low | `runboard demo` success message doesn't state the next step (serve + console) | `packages/runboard/runboard/__main__.py:36-41` |
| US-012 | low | `knowledge/reviews/index.md` links three review files that don't exist yet (ux-ui, ecommerce, backend-architecture) | `knowledge/reviews/index.md` |
| US-013 | low | README quick start doesn't mention `.env.example` copy or cross-link the active BLK-DISK/BLK-DOCKER blockers that make the documented stack unstartable on the dev machine | `README.md:78-113` vs `TASKS.md:7-19` |

### US-001 — documented pnpm surface does not exist (high)

`package.json` defines exactly six scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `format`) and has never defined more (unchanged since the initial scaffold, per git history). Yet `README.md`, `HANDOFF.md` §6, `docs/wiki/LOCAL_DEV.md`, `docs/wiki/SESSION_BOOT.md`, and `docs/wiki/BUILD.md` collectively document ~25 commands that do not exist: `pnpm dev:stack`, `db:migrate`, `dev:api`, `dev:worker`, `bootstrap:orgs`, `kickoff:orgs`, `dev:fleet`, `dev:site`, `review`, `evidence:collect`, `evidence:fleet`, `prod:deploy`, `deploy:railway*`, `vercel:*`, `build:upload`, `build:inflow*`, `build:reflect`, `literature:radar`, `research:loop`. A new operator's third command fails with `ERR_PNPM_NO_SCRIPT`, and the docs never provide the raw fallback (the implementations do exist: `scripts/bootstrap_orgs.py`, `scripts/kickoff_lifecycle.py`, `scripts/dev-site.mjs`, `scripts/prod-deploy.mjs`, `infra/docker-compose.yml`, etc.). This is the single hardest stall in the whole journey: the operator cannot tell whether the repo is broken or they are. Either add the script block to `package.json` or rewrite the docs against the real invocations — but one of the two must be canonical.

### US-002 — the new training workflow is undiscoverable (high)

The three-command golden path (`runboard demo` → `runboard serve` → `pnpm --filter @synthaembed/training-console dev`) is well written — but it lives *only* in [training console](/platform/training-console.md) and [experiment tracking](/platform/experiment-tracking.md). Nothing in the discovery chain a new operator actually follows (`README.md` → `HANDOFF.md` → `TASKS.md` → `docs/wiki/*` → `CLAUDE.md` lookup path) mentions `runboard`, `datalab`, `training-console`, or even that `knowledge/` exists. The LOCAL_DEV port table ends at 3004; port 3006 appears only in `config/fleet.json` and this bundle. One line in README's "What's here" list and one row in the LOCAL_DEV port table would fix discovery.

### US-003 — error remedies that fail when followed (high)

Verified: at the repo root, `uv sync --extra api` (the exact command `runboard serve` prints on ImportError) fails with `error: Extra 'api' is not defined in the project's 'optional-dependencies' table`, because the workspace root `pyproject.toml` defines no extras. The working command is `uv sync --all-packages --extra api` — and even that silently *removes* previously installed extras (dev/model) unless they are repeated, a classic uv-sync trap. `datalab/structure.py:50` has the same defect (`uv sync --extra llm`). An error message that fails when followed verbatim is worse than none: the operator now has two failures to debug. Fix the strings, or define pass-through extras on the root project.

### US-004 — cwd-relative run store (medium)

`RunStore` resolves to `$RUNBOARD_DIR` or `./data/runs` *relative to the current working directory*. Verified: `runboard list` invoked from another directory prints nothing (no error, no store path), and a `demo` run seeded from the wrong cwd is invisible to a `serve` started from the repo root — the console then shows "No runs recorded yet", sending the operator down a false debugging path. No command ever prints which store root it resolved. Cheapest fix: print the resolved root in `list`/`demo`/`serve` output; better: anchor the default to the repo root.

### US-005 — failed collections permanently pollute the knowledge bundle (medium)

Verified empirically: `python -m datalab collect missing-file.txt --name x` exits 1 and prints the failure, but *still* writes `data/datalab/<id>/`, emits `knowledge/datasets/<id>.md`, and appends "Collected dataset x (0 docs, 0 chunks)" to `knowledge/log.md`. A single typo'd path leaves three artifacts an operator must manually hunt down and delete (this review had to clean up its own test). A collection with zero documents should either abort before the OKF write or mark the card/log entry as failed.

### US-006 — pick_task.py silent misattribution and drift (medium)

`claim` defaults `--agent` to `cursor` (`pick_task.py:246`), so any human or agent who forgets the flag silently credits Cursor — in a multi-agent shop where `claimedBy` drives lane accountability, wrong-by-default is worse than required. `claim` also succeeds on tasks that are blocked or already claimed by someone else (no warning, no `--force`), and `done` accepts any id with no claim check. Neither command refreshes `TASKS.md`, so the human-readable snapshot drifts until someone remembers `render` (SESSION_BOOT documents `done` + `render` as two steps; folding render into claim/done would remove a whole class of stale-doc confusion). On the positive side: `blockers` output is excellent — why, unblock steps, and blast radius per blocker.

### US-007 — three names for one surface (medium)

The dashboard is "Training Observatory" (fleet.json `name`, UI `<h1>`, this bundle's concept title), "Training Console" (the [platform index](/platform/index.md) link text), and `training-console` (site id, package, app path). None of the three appears in `CLAUDE.md`'s Projects table, `memory/` lookup chain, README's fleet/domain table, or LOCAL_DEV's port table — so the established name→id→port lookup ritual fails for exactly the newest site. Pick one display name (fleet.json's "Training Observatory" is the natural source of truth, per the "pair display name with site id" convention used by the other six sites) and register it in the same four places every other site lives.

### US-008 — stale-data blindness after first successful poll (medium)

Credit first: the *initial* empty/error states are the best in the fleet — the unreachable-source state gives the two exact seeding commands plus the production env vars (`app/page.tsx:48-60`), and the zero-runs state names both `runboard.init(...)` and the demo command. This is precisely what "tell the user what to do next" looks like. The gap is after first success: `page.tsx` renders the error banner only while `runs === null`, and `RunDetail` only while `!run` — once data has loaded, every subsequent poll failure is silently swallowed (`setError` is set but nothing renders it), so killing `runboard serve` leaves both views showing confident, frozen data with live-looking status pills. A small "telemetry source unreachable — showing data as of HH:MM:SS" ribbon on poll failure would close it. Minor adjacent issue: `RunDetail` permanently stops polling once a run's status is non-`running`, so a resumed run never live-tails again without a page reload.

### US-009 — datalab extract's hidden contract (medium)

`datalab extract <path>` help says only "structured extraction from a file". It does not say (a) extraction is hard-wired to a `FinancialMetrics` schema (`__main__.py:55-56`), (b) an LLM is required, defaulting to `ollama/llama3` via `$DATALAB_MODEL`, or (c) the `llm` extra must be installed. An operator extracting a non-financial document gets financial fields with no explanation; one without Ollama gets an import/connection error two layers deep. The `--help` epilog should state the schema and prerequisites, and the schema should be a `--schema` choice even if only one exists today.

### US-010 / US-011 — CLI empty states and next-step hints (low)

`runboard list` and `datalab datasets` print literally nothing on an empty store — no header, no "0 runs — seed one with `python -m runboard demo`". `runboard demo` prints the written path but not the two commands that make it visible (`serve`, then the console dev server), forcing a round-trip to the knowledge bundle mid-flow. One `print` each.

### US-012 / US-013 — broken links and blocker cross-referencing (low)

`knowledge/reviews/index.md` links five reports; before this document, only `security.md` existed — `ux-ui.md`, `ecommerce.md`, and `backend-architecture.md` are still dead links in a bundle whose credibility rests on link discipline. Separately, README's quick start neither mentions the `.env.example` copy step (HANDOFF does) nor links `TASKS.md`'s BLK-DISK/BLK-DOCKER section, which currently makes the documented local stack unstartable on the dev machine; TASKS.md explains the blockers well, but only if you already know to look there.

# Recommendations

Prioritized; the first two unblock the "clone → dashboard without asking anyone" goal by themselves.

1. **Reconcile the pnpm surface (US-001).** Add the documented script block to `package.json` (aliasing the existing `scripts/*.py|mjs` and `infra/docker-compose.yml`), or sweep README/HANDOFF/LOCAL_DEV/SESSION_BOOT/BUILD to the real commands. One source must be canonical; today both lie.
2. **Wire the training workflow into the discovery chain (US-002, US-007).** One row in README's fleet table and LOCAL_DEV's port table (`3006 | training-console (Training Observatory)`), one bullet in README "What's here" pointing at `knowledge/`, and an entry in CLAUDE.md's Projects table. Standardize on "Training Observatory" as display name everywhere prose refers to it.
3. **Fix the two broken remedy strings (US-003).** `runboard/__main__.py:47` → `uv sync --all-packages --extra api`; `datalab/structure.py:50` likewise for `llm`. Cheap, verified-broken, and each currently converts one failure into two.
4. **Print the resolved store root (US-004)** in every runboard subcommand, and consider anchoring the default store to the repo root rather than cwd.
5. **Make failed collections leave no trace (US-005):** abort before the OKF card/log write when `doc_count == 0`, or mark the card `status: failed`.
6. **Harden pick_task.py (US-006):** require `--agent` (no default), warn on claiming blocked/claimed tasks, auto-render TASKS.md on claim/done.
7. **Add a staleness ribbon to the console (US-008)** when a poll fails after first success; re-arm polling if a run's status returns to `running`.
8. **Document datalab extract's contract (US-009)** and add `--schema`.
9. **Fill or trim the reviews index (US-012)** and cross-link TASKS.md blockers from README's quick start (US-013).

# Watchlist

* **Doc/code drift regression:** any new `pnpm <script>` mentioned in docs should be grep-verified against `package.json` — consider a CI check that extracts fenced `pnpm` commands from README/HANDOFF/wiki and asserts the script exists.
* **Knowledge-bundle side effects:** as more tools auto-write to `knowledge/` (datalab cards, log entries), watch for write-on-failure patterns like US-005 and for concurrent-append races on `log.md`.
* **Console against real (non-demo) runs:** all empty/error-state review so far exercised the synthetic `demo` run; re-review once `autoresearch_train.py` is instrumented with `runboard.init` — long runs, sparse metrics, and multi-day timestamps will stress the charts and the "3 s live tail" differently.
* **Port collisions:** fleet.json assigns 3006 to training-console and finance-lab sits adjacent; keep the LOCAL_DEV port table (once fixed) as the single human-readable registry.
* **Root `uv` extras story:** if more workspace packages grow extras (`api`, `llm`, `dev`), decide once whether the root project mirrors them; every package-local "run `uv sync --extra X`" message will otherwise repeat US-003.
* **BLK-DISK:** with ~0.2 GB free, even doc-only workflows (Next.js dev servers, `.next/` caches for the console) will start failing in confusing ways unrelated to any finding above.

# Citations

* `README.md` (quick start, fleet table)
* `HANDOFF.md` (§6 run-it-locally)
* `TASKS.md` (blockers section)
* `docs/wiki/SESSION_BOOT.md` · `docs/wiki/BUILD.md` · `docs/wiki/LOCAL_DEV.md`
* `package.json` · `pyproject.toml` (workspace root)
* `scripts/pick_task.py`
* `packages/runboard/runboard/__main__.py` · `packages/runboard/runboard/store.py` · `packages/runboard/pyproject.toml`
* `packages/datalab/datalab/__main__.py` · `packages/datalab/datalab/structure.py`
* `apps/sites/training-console/app/page.tsx` · `apps/sites/training-console/components/RunDetail.tsx` · `apps/sites/training-console/lib/api.ts` · `apps/sites/training-console/package.json`
* `config/fleet.json` · `CLAUDE.md`
* `knowledge/index.md` · `knowledge/log.md` · `knowledge/platform/training-console.md` · `knowledge/platform/experiment-tracking.md` · `knowledge/platform/index.md` · `knowledge/reviews/index.md`

## 2026-07-03 — Data Refinery launch review (DR-107)

**Verdict: SHIP-WITH-NOTES**

Scope: /contribute comprehension, /catalog search/filter affordances, /datasets/[slug] information hierarchy. Live pages 200; components read in full.

1. **High — the contribute flow explains consent well but hides what "a receipt" is worth until after you submit, and offers no erasure affordance despite promising erasability.** `ContributeForm.tsx` is genuinely good: line count + "max 64" is live, the consent label spells out storage/review/publish/training and "no account identity is attached", and the success card returns the receipt UUID. But a stranger reads "keep it if you ever want the contribution erased" (line 44) with no link or instruction for *how* to erase — and no erasure path exists (see backend review). That's a comprehension trap: the UI implies a self-service control that isn't there. Next action: make the receipt actionable — either link an erasure/contact route or reword to "email <address> with this receipt to request erasure".
2. **High — catalog filtering is advertised but only half-usable: no way to discover or pick a tag.** `/catalog` copy says "Filter by tag or search by name" and the API supports `?tag=`, but the UI only renders a free-text `q` search box (`catalog/page.tsx:26-39`) — there is no tag list, chips, or facet, and every live dataset has `tags:[]` anyway, so tag filtering is both undiscoverable and empty. A stranger told "filter by tag" finds no tags. Next action: either render a tag facet from the catalog (and start tagging datasets) or drop the "filter by tag" promise from the lead copy.
3. **Medium — dataset page hierarchy is inverted for a data buyer: raw OKF card markdown dominates, the sellable summary is thin.** `datasets/[slug]/page.tsx` leads with Provenance (good), then dumps the full `cardMd` into a `<pre>` (line 39) — for the live arXiv datasets this is a wall of RSS-derived markdown. Sample chunks (the thing that shows data quality) come *after* the card and are capped at 8. The buyer's decision info (what is this, is it clean, how big) is buried under a raw document. Next action: render the OKF card as structured sections (or collapse it) and promote sample chunks + size/token facts above it.
4. **Medium — search has no result feedback or count.** Submitting `q` re-renders the list with no "N results for X" line; an empty match shows the honest `bh-alert` ("No datasets match... request one") which is good, but a *narrowing* search gives no signal that filtering happened. Next action: add a result count / active-filter summary above the list.
5. **Low — strong points:** empty/error states everywhere name the unblock action; "Older datasets →" pagination is a clear single affordance; the /requests success state tells the user exactly what happens next (measured proposal with price). No action.

Citations: `apps/sites/refinery/components/ContributeForm.tsx`, `apps/sites/refinery/app/catalog/page.tsx`, `apps/sites/refinery/app/datasets/[slug]/page.tsx`, `apps/sites/refinery/components/RequestForm.tsx`. Live: /contribute, /catalog, /datasets/<slug> all 200; every catalog dataset tags=[].
