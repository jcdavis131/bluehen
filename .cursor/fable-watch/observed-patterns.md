# Fable 5 (Claude) — Observed Patterns

> Living log of behaviors observed in terminal 1.txt while Claude works in this repo.
> Each entry: timestamp, observed behavior, why it works, and the skill it maps to.
> Used to drive skill creation under `~/.cursor/skills/` so Cursor achieves parity.

## Session start: 2026-07-02 09:51 (UTC-5)

### P-001 — Orientation before action
- **Observed:** First actions in session were a Get-PSDrive disk-space check + recursive file count of the target site (`finance-lab`).
- **Why it works:** Establishes environmental constraints (BLK-DISK is a known blocker here) and scope (file count tells you if a site is a stub or real) before writing any code. Prevents wasted work on a blocked environment.
- **Maps to:** `session-orient` skill (boot-time environmental recon).

### P-002 — Confirm destructive/ambiguous shell before running
- **Observed:** A PowerShell command with subexpressions `$(...)` triggered an interactive confirm prompt with three options (Yes / Yes-don't-ask-again / No / Esc to cancel / ctrl+e to explain).
- **Why it works:** Subexpressions can hide injection/expansion risks; pausing once builds a permission allowlist so subsequent similar commands run silently. Balances safety with flow.
- **Maps to:** `shell-confirm-hygiene` skill (when to pause, how to phrase the confirm).

### P-003 — Multi-agent spawn with named SME lanes
- **Observed:** "spawn the five SME review agents producing OKF wiki reports" — Claude fans out to subject-matter-expert subagents each owning a lane and emitting a structured wiki report.
- **Why it works:** Parallel specialization > serial generalization. Each SME goes deep in one domain; the orchestrator only assembles. Output format is fixed (OKF wiki) so synthesis is trivial.
- **Maps to:** `sme-fanout` skill (when and how to spawn parallel subagents with fixed output contracts).

### P-004 — Structured output contract (OKF wiki reports)
- **Observed:** SME agents produce "OKF wiki reports" — a named, consistent format.
- **Why it works:** A named canonical format means downstream synthesis is mechanical. The format is decided once, upstream.
- **Maps to:** part of `sme-fanout` + a `output-contracts` reference.

## Tick 1: 2026-07-02 10:01 (UTC-5)

### P-005 — Smoke-import new packages without a full sync
- **Observed:** `uv run --no-sync python -c "import sys; sys.path.insert(0, 'packages/runboard'); sys.path.insert(0, 'packages/datalab'); import runboard, datalab; print('imports ok')"`.
- **Why it works:** `--no-sync` skips the expensive dependency resolution; `sys.path.insert` lets you import a package straight from the monorepo tree without installing it. A 1-second import check catches broken `__init__.py`, circular imports, and missing sibling packages before you ever run a test or build. The fastest possible "did I wire this up" signal.
- **Maps to:** `smoke-import` skill.

### P-006 — Visible, counted progress board with concrete deliverable names
- **Observed:** Footer reads `7 tasks (1 done, 1 in_progress, 5 open)` with `◼`/`◻`/`…` glyphs and task names like `Build packages/datalab data-collection pipeline (OSS stack + fallbacks)`.
- **Why it works:** A persistent, counted board gives the user ambient progress awareness without asking. Names are concrete deliverables (noun + scope + constraint), not verbs — so "done" is unambiguous. Collapsed tails (`… +1 pending`) keep the footer one line.
- **Maps to:** `progress-board` skill.

### P-007 — `cd` + path operation is its own confirm trigger
- **Observed:** The compound `cd <path>; uv run ...` tripped a confirm: "Compound command contains cd with path operation — manual approval required to prevent path resolution bypass."
- **Why it works:** A leading `cd` can relocate the effective working directory before a subsequent path-bearing command resolves, so the path the user sees and the path actually used can differ. This is a distinct risk class from raw subexpression injection.
- **Maps to:** update `shell-confirm-hygiene` with a `cd`+path trigger.

## Tick 2: 2026-07-02 10:09 (UTC-5)

### P-008 — Heavy adapters as opt-in extras, kept out of the universal lock
- **Observed:** Diff moves `crawl4ai, marker-pdf, outlines, litellm, instructor` out of the core dependencies into opt-in extras installed via `uv pip install`, with a comment: "kept out of the universal lock so their transitive pins (litellm→tokenizers, marker→transformers) can't constrain the shared training environment."
- **Why it works:** Heavy ML/ingestion libs drag transitive pins that conflict with the training stack. Isolating them as extras means the shared environment stays coherent; only the workspace that needs the adapter pays the pin cost. The "why" is written into the diff as a comment so the next agent doesn't undo it.
- **Maps to:** `dependency-hygiene` skill.

### P-009 — Targeted, tailed test runs across only the affected packages
- **Observed:** `uv run --no-sync python -m pytest packages/runboard/tests packages/datalab/tests services/core-api/tests -q 2>&1 | Select-Object -Last 6` — runs only the touched packages' tests, quiet flag, piped to the last 6 lines.
- **Why it works:** Running the whole suite on every change is slow and noisy. Naming exactly the affected package test dirs + `-q` + tailing keeps the signal-to-noise high and the wall-clock low. The tail prevents a passing run from flooding the context with green dots.
- **Maps to:** `affected-tests` skill.

### P-010 — Surface real cost on long operations
- **Observed:** Status line shows `(7m 4s · ↑ 14.7k tokens)` against a long-running wiring step.
- **Why it works:** Time + tokens are the two scarce resources of an agent loop. Showing them per-step lets the user spot a runaway step before it eats the budget, and lets the agent self-calibrate ("this step is taking 7m, I should not repeat this pattern casually").
- **Maps to:** `cost-transparency` skill.

### P-011 — Auto mode: work the board top-to-bottom, only surface decisions/blockers
- **Observed:** `auto mode on` with the agent working through the task list without per-step prompts, advancing the board (`◼ Wire routers` → next `◻ Build training-console`).
- **Why it works:** In auto mode the user has delegated the whole plan; interrupting for each step defeats the point. The right behavior is to execute the board top-to-bottom, only stopping to surface a genuine decision the user must make or a blocker the agent can't resolve.
- **Maps to:** `auto-mode` skill.

### P-012 — Parallel independent shell commands
- **Observed:** `Running 3 shell commands…` — three independent commands dispatched in one batch.
- **Why it works:** Independent commands have no data dependency between them; serializing wastes wall-clock. Batching them is free throughput.
- **Maps to:** fold into `affected-tests` / a general `parallel-commands` note.

## Tick 3: 2026-07-02 10:17 (UTC-5)

### P-013 — Named constants for magic numbers
- **Observed:** `const POLL_MS = 5000;` as a top-level named constant in a dashboard page, not an inline `5000`.
- **Why it works:** A named constant is self-documenting and grep-able; the poll interval is a tuning knob that lives in one place. Small signal, but it's the kind of thing that separates throwaway code from maintainable code.
- **Maps to:** too granular for its own skill; noted as a code-craft default.

### P-014 — Read a sibling file before writing a new one in the same area
- **Observed:** While building the `training-console` dashboard, Fable 5 ran `head -30 .../apps/sites/finance-lab/app/simulate/[platform]/page.tsx` — reading an existing similar page in a sibling site before authoring the new one.
- **Why it works:** A new file written from scratch will invent its own conventions (import style, component shape, polling pattern, API client usage). Reading one sibling that already does something similar lets you match imports, layout, data-fetching style, and folder structure. The new file lands as if the same author wrote both. This is the single highest-leverage "match the codebase" move.
- **Maps to:** `match-conventions` skill.

### P-015 — Two `in_progress` tasks when one is a backgrounded long-running op (corrects progress-board)
- **Observed:** Board shows `◼ Build training-console dashboard site` AND `◼ Create OKF knowledge bundle` simultaneously, while the dashboard build is at `15m 2s · ↑ 36.9k tokens`.
- **Why it works:** A 15-minute build is not something to sit idle through. Fable 5 backgrounded the long build and started parallel work on the OKF knowledge bundle. Two `◼` here is correct — one is a running background op, one is the active foreground lane.
- **Maps to:** refine `progress-board` — the "exactly one in_progress" rule is wrong; the real rule is "one *active foreground* in_progress; a second ◼ is allowed when it's a backgrounded long-running op".

## Tick 4: 2026-07-02 10:25 (UTC-5)

### P-016 — Boring hygiene files written as first-class artifacts
- **Observed:** For the new `training-console` site, Fable 5 wrote a `.gitignore` (`.next/`, `node_modules/`, `.vercel`) as one of the first files, alongside the actual app code.
- **Why it works:** Hygiene files are uninteresting so they get skipped, then the first commit accidentally vendors `.next/` or `node_modules/` and the repo bloats. Writing them up-front as deliberate artifacts prevents that.
- **Maps to:** note folded into `match-conventions` ("include the hygiene files a sibling has").

### P-017 — Cite a named procedure instead of improvising
- **Observed:** "Validating the chart palette per the dataviz procedure" — Fable 5 references a *named, documented procedure* (`dataviz procedure`) rather than picking colors ad hoc.
- **Why it works:** A written procedure encodes decisions already made (palette, contrast, accessibility). Citing it by name makes the choice auditable and reuses the decision instead of re-litigating it. This is the SDD ethos applied to a small decision.
- **Maps to:** `follow-procedure` skill.

### P-018 — Install (offline-preferring) → typecheck, both tailed, as the frontend validation gate
- **Observed:** `pnpm install --prefer-offline 2>&1 | Select-Object -Last 5; cd apps/sites/training-console; pnpm typecheck 2>&1 | Select-Object -Last 10` — the validation sequence for a frontend change, with `--prefer-offline` to avoid network and tailing to keep output small.
- **Why it works:** Install + typecheck is the cheapest non-trivial correctness gate for a TS/Next site. `--prefer-offline` avoids a slow registry hit when the lockfile is already satisfied. Tailing prevents a verbose install/typecheck from flooding context.
- **Maps to:** `validate-gate` skill (generalizes the install→typecheck/test pattern across frontend and backend).

### P-019 — Background failure doesn't abort the foreground lane
- **Observed:** `Background command "Run RLS tests in isolation" failed with exit code 1` appeared while the dashboard build continued — the board still shows the dashboard in progress. Fable 5 noted the failure and kept the foreground lane moving rather than panic-stopping.
- **Why it works:** A backgrounded op failing is information to triage, not a reason to abort unrelated foreground work. Stopping the whole session on a background failure wastes the foreground lane's progress. The failure is logged and queued; the foreground continues; triage happens at a natural boundary.
- **Maps to:** `background-failure-triage` skill.

## Tick 5: 2026-07-02 10:33 (UTC-5)

### P-020 — Explicit lane check before doing the work
- **Observed:** "I'll instrument the real autoresearch training script with runboard (guarded, optional) so live runs feed the dashboard — that's within my designated lane."
- **Why it works:** In a multi-agent fleet, two agents touching the same file create merge conflicts and duplicated work. Stating the lane check out loud makes the boundary auditable and stops the user/other agents from flagging it. The parenthetical "(guarded, optional)" shows the change is non-invasive to other lanes.
- **Maps to:** `lane-discipline` skill.

### P-021 — Fill the wait with an independent in-lane task
- **Observed:** "While the install runs, I'll instrument the real autoresearch training script…" — instead of idling through a long install, Fable 5 picks up an independent in-lane task to advance in parallel.
- **Why it works:** A 30s+ install or build is dead time if you block on it. Picking an independent in-lane task turns the wait into throughput. This is the active behavior behind the two-`◼` board (P-015).
- **Maps to:** `fill-the-wait` skill.

### P-022 — Parallel SME launch with explicit per-agent charter + fixed output dir
- **Observed:** "launching the five SME review agents in parallel (Task 4). Each gets a distinct charter and writes a living OKF review into knowledge/reviews/."
- **Why it works:** Confirms `sme-fanout` and adds two details: (1) each SME gets a *distinct charter* (not just "review X" — a specific scope/angle), and (2) a *fixed output directory* so the orchestrator knows where to collect.
- **Maps to:** refine `sme-fanout` — add "distinct charter per agent" and "fixed output dir" as required.

### P-023 — Per-subagent status board with task name + cost
- **Observed:** `◯ general-purpose Getting timestamp for backend-architecture.md 5m 50s · ↓ 89.5k tokens` — each background subagent shows its current task and resource cost.
- **Why it works:** `progress-board` + `cost-transparency` applied at the subagent level. Lets the user spot a stuck or expensive subagent without asking.
- **Maps to:** refine `sme-fanout` — include per-agent status with cost in the synthesis report.

## Tick 6: 2026-07-02 10:41 (UTC-5)

### P-024 — Spot-check subagent output against the named contract
- **Observed:** "Spot-checking OKF conformance of the whole bundle… Bundle is fully OKF-conformant with five substantive reviews."
- **Why it works:** Subagent output is the most trusted-yet-unverified thing in an agent loop — you dispatched it, it returned prose, you're tempted to trust it. But SMEs drift from the contract, skip sections, or pad. A spot-check against the named standard (OKF) catches drift before synthesis. The check is cheap; trusting bad output is expensive.
- **Maps to:** `verify-subagent-output` skill.

### P-025 — Kill a silent long op and retry with visible output
- **Observed:** "The pnpm job is still silent — killing it and retrying with visible output: `Stop-Process -Id 3380,57596 -Force …; pnpm install --prefer-offline --reporter=append-only 2>&1 | Select-Object -Last 15`".
- **Why it works:** A long op with no progress signal is a black box — you can't tell if it's working, hung, or waiting on input. Waiting blindly risks a 10-minute hang. Killing and restarting with a *visible-output reporter* (`--reporter=append-only`) plus a tail turns the black box back into an observable op.
- **Maps to:** `silent-op-recovery` skill.

### P-026 — Track PIDs of long-running ops so you can kill them cleanly
- **Observed:** `Stop-Process -Id 3380,57596 -Force` — Fable 5 had the PIDs of the ops it launched, so the kill was targeted, not a blanket `Stop-Process -Name node -Force` that would nuke unrelated processes.
- **Why it works:** A targeted PID kill only ends the op you want gone. A name-based kill is collateral damage. Tracking PIDs at launch time is the cheap enabler.
- **Maps to:** fold into `silent-op-recovery` — record the PID when you launch a long op.

## Tick 7: 2026-07-02 10:49 (UTC-5)

### P-027 — Check interim progress directly; don't wait for the exit notification
- **Observed:** "The background install will notify on exit — checking interim progress directly: Listed 1 directory".
- **Why it works:** Background notifications fire on *exit*, but "is it making progress?" is a question you need answered *now*. Polling interim state (a directory listing, a partial output file, a status endpoint) tells you whether to keep waiting or to recover. This is the lighter first step before kill-and-restart.
- **Maps to:** refine `silent-op-recovery` — interim-progress check is the first move; kill-and-restart is the escalation.

### P-028 — Save durable learnings to memory during a wait window
- **Observed:** "While waiting, saving durable session learnings to memory… writing 4 memories".
- **Why it works:** A wait window is the perfect time to persist learnings — the work is blocked, the context is loaded, and the learnings are fresh. Writing them to `memory/` now means the next session inherits them for free. Learnings saved at the *end* of a session are often lost to context pressure; learnings saved mid-wait survive.
- **Maps to:** `persist-learnings` skill.

### P-029 — Batch mixed actions in one turn
- **Observed:** "Reading 1 file, running 4 shell commands, writing 4 memories" + editing `.github/workflows/ci.yml` in a single turn.
- **Why it works:** Confirms P-012 extended to mixed read/write/shell actions. Independent actions are dispatched together, not serialized turn-by-turn.
- **Maps to:** confirmation of the parallel-commands note in `affected-tests`.

### P-030 — Memory as a first-class session artifact
- **Observed:** "writing 4 memories" — memory files are treated as deliverables of the session, not optional notes.
- **Why it works:** A session that only edits code leaves the next session to re-derive the same lessons. A session that writes memory files compounds — each session starts from the accumulated learnings of the prior ones.
- **Maps to:** part of `persist-learnings`.

## Tick 8: 2026-07-02 10:57 (UTC-5)

### P-031 — Recap on long elapsed time
- **Observed:** `※ recap: Building out the training platform … everything is built, tested, and reviewed except the dashboard's dependency install. Next: finish pnpm install, then typecheck and final report.`
- **Why it works:** After 48m of work, the user (and any fresh context) can't re-enter without re-reading everything. A compressed recap — what's done, what's in flight, what's next — is the cheap bridge. It's a checkpoint that lets the conversation survive a context reset.
- **Maps to:** `recap-on-long-session` skill.

### P-032 — Event-driven wait: arm a watcher for the signal you're waiting for
- **Observed:** `Monitor event: "training-console node_modules appears (pnpm install progressed)"` — Fable 5 set up a monitor that fires when `node_modules` appears, instead of polling blindly.
- **Why it works:** Polling asks "is it done yet?" on a timer; event-driven waiting is woken *by* the actual signal (a file appearing, a log line, a ref advancing). Less noise, zero missed ticks, lower token cost. This is the healthy-case counterpart to `silent-op-recovery`'s kill-and-restart.
- **Maps to:** `event-driven-wait` skill.

### P-033 — State the conditioned next action during a wait
- **Observed:** "I'll complete the typecheck and deliver the final readiness report as soon as the install finishes."
- **Why it works:** Naming the next action *conditioned on the wait* tells the user the plan and makes the wait legible ("we're not idle — we're queued for this specific next step").
- **Maps to:** fold into `progress-board` / `fill-the-wait` — state the conditioned next action alongside the board.

## Tick 9: 2026-07-02 11:05 (UTC-5)

### P-034 — Reuse the shared design-system package, don't hand-roll
- **Observed:** New `apps/sites/hub/app/legal/privacy/page.tsx` imports `PageHeader` from `@synthaembed/ui-fleet` and uses its `eyebrow` / `title` props, instead of hand-rolling a header.
- **Why it works:** A shared UI package is the encoded design system. Using its primitives gives consistency across sites for free, and changes to the design system propagate. Hand-rolled markup drifts.
- **Maps to:** `use-design-system` skill.

### P-035 — Verify the class/primitive exists in the source before using it
- **Observed:** `grep -n "bh-btn\|bh-card__title\|bh-card " components.css | head -6` — grepping the design-system's CSS to confirm the class names exist before relying on them.
- **Why it works:** Memory of a class name is unreliable; the source is ground truth. A 1-line grep confirms the primitive exists and is spelled right, preventing a broken render or a silently-failing style. This is the verify-before-rely pattern applied to design tokens.
- **Maps to:** fold into `use-design-system` — grep the source before using a class/primitive.

### P-036 — Set page metadata as a standard page convention
- **Observed:** `export const metadata = { title: "Privacy — Blue Hen RE" };` on the new page.
- **Why it works:** A standard Next.js convention — every page sets its title/metadata. Skipping it leaves a generic title and hurts SEO/share cards. Small, but it's part of "a page is done when it has its metadata".
- **Maps to:** fold into `use-design-system` / `match-conventions` — page conventions include a metadata export.

## Tick 10: 2026-07-02 11:13 (UTC-5) — readiness handoff

### P-037 — Structured "needs your input" readiness report
- **Observed:** A numbered list of items needing user input, each classified and IDed, ending with exact kick-the-tires commands.
- **Why it works:** The handoff is the most-read part of a long session. A structured list (numbered, classified, ID-tagged) is scannable in seconds; prose isn't. The user can act item-by-item without re-deriving the state.
- **Maps to:** `readiness-report` skill.

### P-038 — Document deliberate non-action with rationale
- **Observed:** "I deliberately did not wire runboard into the hill-climb loop — per-step logging inside a time-budgeted training loop would perturb measured results; it needs a small spec."
- **Why it works:** A missing piece is usually read as an oversight. Stating "I deliberately didn't do X *because* Y" converts a presumed gap into a documented decision the user can ratify or override. The non-action is the decision.
- **Maps to:** `document-non-action` skill.

### P-039 — Classify each item as pre-existing vs introduced
- **Observed:** "BLK-PROD (pre-existing)", "Security review SEC-003/004 (pre-existing endpoints, bucket-2)".
- **Why it works:** Pre-existing vs introduced changes the user's response (ratify vs. fix-now). Conflating them hides whether *this* work caused the issue.
- **Maps to:** fold into `readiness-report`.

### P-040 — Reference the repo's issue IDs, not prose descriptions
- **Observed:** SEC-003/004, EC-002/003, BLK-PROD.
- **Why it works:** IDs are grep-able, link to prior context, and stay stable; prose descriptions drift and can't be searched. Use the repo's issue/blocker ID system.
- **Maps to:** fold into `readiness-report`.

### P-041 — End with exact kick-the-tiers commands
- **Observed:** "seed it with `uv run python -m runboard demo`, serve with `uv run python -m runboard serve`, and open the Training Observatory on :3006."
- **Why it works:** The user's next move is verification. Giving the exact commands (with the port) removes the "how do I see it?" step. A report without runnable verification is half a report.
- **Maps to:** fold into `readiness-report`.

## Tick 11: 2026-07-02 11:21 (UTC-5) — commit & provider swap

### P-042 — Test results reported as exact counts + skip reasons
- **Observed:** "Suite fully green now — 40 passed, 7 skipped, zero failures (the RLS auth failures are fixed by the conftest key + proper skip markers)."
- **Why it works:** "Tests pass" hides skips; "40 passed, 7 skipped because RLS auth" is auditable. A skip is a deferred test, not a pass — naming the reason keeps it honest.
- **Maps to:** refine `validate-gate` — report exact pass/skip/fail counts + skip reasons.

### P-043 — Tie work to a named item in the tracker
- **Observed:** "This is the 'uncommitted fleet migration' flagged as P0 in TECH_DEBT".
- **Why it works:** Cites the tech-debt register by name and priority, so the commit is traceable to a tracked item, not a vibe.
- **Maps to:** confirmation of `follow-procedure` — the tracker is the procedure.

### P-044 — Pre-commit: exclude junk, scan for secrets, before the big commit
- **Observed:** "I'll commit the whole migration, but first excluding junk and scanning for secrets" — then `du -sh .opencode/*`, `.claude/*`, reads `.claude/settings.local.json`, `ls -b | grep -i linked`.
- **Why it works:** A big migration commit will vendor junk (`.opencode/`, `.claude/`, `node_modules/`, build output) and may include secrets (local settings, env files). Sizing junk dirs, inspecting local settings, and checking for stray "linked"/artifact paths *before* `git add` is the cheap guard that prevents a painful force-push history rewrite.
- **Maps to:** `pre-commit-hygiene` skill.

### P-045 — User reaffirmed: never commit secrets; scan for vulns/anti-patterns
- **Observed:** User message: "security is everything! Never commit secrets and scan for known vulnerabilities, anti-patterns, etc."
- **Why it works:** Validates P-044 and extends it — secrets scan is the floor; vuln/anti-pattern scan is the ceiling.
- **Maps to:** fold into `pre-commit-hygiene` — secrets scan required; vuln/anti-pattern scan is the reach.

### P-046 — Provider-agnostic abstraction with a default, not a hard swap
- **Observed:** "Refactor hub commerce to provider-agnostic layer (Medusa default)" — when asked for an open-source Shopify alternative, Fable 5 didn't hard-swap Shopify→Medusa; it abstracted the commerce interface with Medusa as the default provider.
- **Why it works:** A hard swap locks you to the new vendor; an agnostic layer with a default lets you swap again without a rewrite. The default means you ship now; the abstraction means you're not stuck.
- **Maps to:** `abstract-the-provider` skill.

### P-047 — Split a big migration into logical commits
- **Observed:** "Pushed to GitHub as three logical commits (baseline migration → observability/data stack → commercial platform)".
- **Why it works:** One giant migration commit is unreviewable and un-revertable. Splitting by logical concern makes review tractable and lets you revert one slice without rolling back the others.
- **Maps to:** `logical-commit-split` skill.

### P-048 — Branch name encodes the commit story
- **Observed:** Branch `platform/fleet-baseline-observability-commerce` — the three logical commits are visible in the branch name itself.
- **Why it works:** The branch name is the review's table of contents. A reviewer reads the name and knows the scope before opening a file.
- **Maps to:** fold into `logical-commit-split`.

### P-049 — Respect a safety guard; use the legitimate path; surface the relaxation
- **Observed:** "Direct push to main is blocked by the safety guard against bypassing review, so the branch is ready to merge here: <compare URL>. If you'd rather I push straight to main in the future, add a Bash allow rule for git push origin main."
- **Why it works:** Fable 5 hit a guard, didn't bypass it, used the legitimate path (branch + PR), and told the user exactly how to relax the guard if they want. Bypassing would have been faster and wrong.
- **Maps to:** `respect-the-guard` skill.

### P-050 — Surface the missing tool and the one-click alternative
- **Observed:** "The gh CLI isn't installed, so I couldn't open the PR programmatically — one click on that link does it."
- **Why it works:** Don't fail silently when a tool is missing; name the gap and give the manual alternative so the user can complete the action in one step.
- **Maps to:** fold into `readiness-report` — a missing-tool gap is a "needs your input" item with a manual alternative.

### P-051 — Next-step handoff for the chosen default provider
- **Observed:** "For Medusa go-live you'll need to: stand up a Medusa backend (npx create-medusa-app@latest), create …".
- **Why it works:** After the provider abstraction lands, the default provider still has to be stood up. Handing off the go-live steps for the chosen default closes the loop on `abstract-the-provider`.
- **Maps to:** fold into `abstract-the-provider` — include the go-live handoff for the default.

### P-052 — Align every metadata/docs surface after a structural change
- **Observed:** After adding the commerce service, Fable 5 updated: README architecture diagram + buyer path + quick starts; root `package.json` (description/repository/homepage); `config/fleet.json` (registers `commerce: services/commerce`); OKF commercial-platform concept + bundle log.
- **Why it works:** A new service that lands in code but not in the docs/registry creates drift — the README lies, the fleet registry doesn't know about it, the package metadata is stale. Aligning every surface that references the structure keeps the docs truthful at the moment the structure changes (when context is loaded), instead of a painful doc-debt cleanup later.
- **Maps to:** `metadata-align` skill.

### P-053 — Tool-gap handoff with both the install path and the no-tool manual alternative
- **Observed:** "the GitHub-side repo description/topics need the gh CLI, which isn't installed. If you want them set, run: `! winget install GitHub.cli` then `! gh auth login`, and I'll push the description and topics — or paste the package.json description into the repo's About box on GitHub, which takes ten seconds."
- **Why it works:** Two paths, not one. The install path (`winget install …; gh auth login`) restores the programmatic route; the manual path ("paste into the About box, ten seconds") lets the user finish right now without installing anything. The manual path's time estimate ("ten seconds") tells the user it's trivial.
- **Maps to:** refine `readiness-report` — give both the install path and the no-tool manual alternative with a time estimate.

### P-054 — Explicit "closes the full request chain" closure
- **Observed:** "That closes the full request chain: merged and pushed to main (c229ebc), Medusa backend scaffolded at services/commerce with deploy files, README/package.json/fleet.json aligned, and now the GitHub-side About panel matches the repo."
- **Why it works:** After a long multi-step request, the user wants to know the *whole* arc is closed, not just that the last step ran. Naming the chain end-to-end (merge → scaffold → docs align → GitHub metadata) confirms completeness against the original ask.
- **Maps to:** `close-the-loop` skill.

### P-055 — Cite the commit SHA in the closure
- **Observed:** "merged and pushed to main (c229ebc)".
- **Why it works:** The SHA is the auditable anchor — the user can `git show c229ebc` to verify exactly what landed. A closure without a SHA is a claim; a closure with a SHA is a checkable fact.
- **Maps to:** fold into `close-the-loop`.

### P-056 — "Two small notes for later" — deferred items separated from the closure
- **Observed:** "Two small notes for later: (a) `gh auth login --web` for full gh functionality; (b) Medusa first boot waiting on a Postgres database (Neon branch, or local once Docker is unblocked)."
- **Why it works:** A closure that hides its loose ends is dishonest; a closure that mixes loose ends into the win is muddy. Separating "this is closed" from "two small notes for later" keeps the win clear and the follow-ups visible.
- **Maps to:** fold into `close-the-loop`.

### P-057 — Time estimate + doc pointer on the deferred next step
- **Observed:** "15 minutes via services/commerce/README.md whenever you're ready."
- **Why it works:** The deferred step gets a time estimate ("15 minutes") and a doc pointer (`services/commerce/README.md`) so the user can pick it up later without re-deriving it. "Whenever you're ready" signals it's not blocking.
- **Maps to:** fold into `close-the-loop`.

### P-058 — Note the precise capability boundary of the available credential
- **Observed:** "the stored git token works for pushes and metadata but not gh's interactive features."
- **Why it works:** A credential that "works" is not a credential that "works for everything". Naming the exact scope (pushes + metadata yes; interactive gh no) prevents a future silent failure when an interactive gh command is attempted.
- **Maps to:** fold into `respect-the-guard` — credential scope is guard-adjacent.

## Tick 15: 2026-07-02 11:53 (UTC-5) — disk pressure

### P-059 — Proactive cache pruning before installs fail, while foreground work continues
- **Observed:** "Disk is at 2.0 GB with two installs incoming — pruning the uv cache for headroom while I build agentkit".
- **Why it works:** A constrained-disk environment (BLK-DISK) makes installs fail mid-flight, leaving broken state. Pruning *before* the install fails is cheaper than recovering after. And the prune is run *in parallel* with the foreground build — disk-headroom work doesn't block feature work.
- **Maps to:** `disk-pressure-proactive` skill.

### P-060 — State the safety property of the prune before running it
- **Observed:** "Pruning the pnpm store (safe, removes only unreferenced packages)".
- **Why it works:** A prune command sounds destructive. Naming its safety property ("removes only unreferenced packages") tells the user it won't break installed packages, so they trust it without a confirm round-trip.
- **Maps to:** fold into `disk-pressure-proactive`.

### P-061 — Multi-target prune cascade with bounded recursion
- **Observed:** `Clear-RecycleBin -Force; Get-ChildItem apps -Recurse -Directory -Filter ".next" -Depth 3 | ForEach-Object { measure size … }` — recycle bin, then build-output dirs under apps with `-Depth 3` and a size measurement before deletion.
- **Why it works:** Pruning one source isn't enough; a cascade hits the cheap wins in priority order (recycle bin → build output → package stores). `-Depth 3` bounds the recursion so the scan itself doesn't cost more than the reclaim. Measuring before deleting gives a reclaim estimate.
- **Maps to:** fold into `disk-pressure-proactive`.

## Tick 16: 2026-07-02 12:01 (UTC-5) — assumption correction + Medusa boot

### P-062 — State assumption corrections explicitly with evidence
- **Observed:** "PG16 is already running on :5432 — it existed all along."
- **Why it works:** The documented blocker (BLK-DOCKER) said Postgres :5433 was unavailable, so the assumption was "no Postgres". On checking, PG16 was running on :5432 the whole time. Stating the correction + the evidence (the port found) updates the mental model out loud, so the user and any other agent aren't still operating on the wrong assumption. Silent correction leaves everyone else blocked on a non-blocker.
- **Maps to:** `correct-assumptions` skill.

### P-063 — Capture exit code + sample output for a long command
- **Observed:** `npx medusa db:migrate > "$CLAUDE_JOB_DIR/tmp/medusa-migrate.log" 2>&1; echo "migrate exit=$?"; tail -5 "$CLAUDE_JOB_DIR/tmp/medusa-migrate.log"`.
- **Why it works:** A long command's full output floods context; silence loses the exit code. The idiom — redirect to a job-dir log, echo the exit code explicitly, tail the log for a sample — gives you the fate (exit code) + a bounded sample, without the flood. This is the routine-capture counterpart to silent-op-recovery's kill-and-restart.
- **Maps to:** refine `silent-op-recovery` — add the capture-exit-and-sample idiom for observable long commands.

### P-064 — Check the auth/config state before an action that depends on it
- **Observed:** "Now I need access to create the medusa database; checking the auth config."
- **Why it works:** A "create database" action depends on having the right DB auth. Verifying the auth/config *before* the action avoids a failed action and a recovery cycle.
- **Maps to:** confirmation of `session-orient` — recon before action.

### P-065 — Acknowledge background-op completion too, not just failure
- **Observed:** "Background command 'Size of build outputs' completed (exit code 0)".
- **Why it works:** A background op completing is information (reclaim done, gate passed). Acknowledging it — not just the failures — keeps the background state legible and lets you reap the result.
- **Maps to:** refine `background-failure-triage` — acknowledge both completion and failure explicitly.

## Tick 17: 2026-07-02 12:09 (UTC-5) — diagnose before retry

### P-066 — Diagnose the failure from logs before retrying
- **Observed:** "The migration started (created the migrations table) then lost connectivity mid-run — checking the Postgres server log."
- **Why it works:** A blind retry of a failed op reproduces the failure and wastes a cycle. Reading the relevant log (Postgres server log) to form a hypothesis *before* retrying turns the retry into a test of the hypothesis. The diagnosis also names how far the op got ("created the migrations table") — useful for idempotency reasoning.
- **Maps to:** `diagnose-before-retry` skill.

### P-067 — Distinguish op failure from self-caused interruption
- **Observed:** "Postgres itself is healthy — the disconnect line is my TaskStop."
- **Why it works:** The disconnect in the log was caused by Fable 5's *own* TaskStop, not a Postgres failure. Misdiagnosing a self-caused artifact as an infra failure leads to "fixing" healthy infrastructure. Recognizing your own stops/kills in the log is the guard against that.
- **Maps to:** fold into `diagnose-before-retry`.

### P-068 — Hypothesize a likely cause with supporting context, not certainty
- **Observed:** "The failure may have been transient load (three parallel jobs at the time)."
- **Why it works:** Names the hypothesis (transient load) + the supporting context (three parallel jobs at the time), with appropriate uncertainty ("may have been"). Doesn't assert certainty it can't back. The hypothesis then drives the retry strategy (foreground, no parallel load).
- **Maps to:** fold into `diagnose-before-retry`.

### P-069 — Retry in foreground with timeout + CR-to-NL + blank-strip + tail
- **Observed:** `timeout 420 npx medusa db:migrate 2>&1 | tr '\r' '\n' | grep -vE "^\s*$" | tail -15`.
- **Why it works:** The retry is observable and bounded — foreground (not backgrounded) for direct view; `timeout 420` so it can't hang forever; `tr '\r' '\n'` converts progress-bar carriage returns to newlines so they don't smear into one line; `grep -vE "^\s*$"` strips blanks; `tail -15` bounds the output. The retry is also the hypothesis test (no parallel load this time → if it succeeds, transient load was likely).
- **Maps to:** fold into `diagnose-before-retry` — the retry-with-observability idiom.

## Tick 18: 2026-07-02 12:17 (UTC-5) — agent teams

### P-070 — Deterministic duties are load-bearing; the LLM adds judgment only
- **Observed:** "The design principle: deterministic duties are load-bearing and always execute; the LLM adds judgment only."
- **Why it works:** An agent where the LLM is the backbone fails when the LLM hallucinates, drifts, or is unavailable. An agent where the deterministic duties are the backbone *always runs* (reliable, auditable, no hallucination) and the LLM only adds ranking/curation/judgment on top. If the LLM layer is off, the agent still does its load-bearing work; if it's on, the work is better. This is the robust agent architecture.
- **Maps to:** `deterministic-core-llm-judgment` skill.

### P-071 — Map teams to the existing division model, don't invent a new structure
- **Observed:** "The three teams map to your division model: Data Harvesting (data), R&D (research), Operations (orchestration)."
- **Why it works:** Inventing a new team structure creates a parallel org that drifts from the real one. Mapping to the existing division model keeps the agent org and the human org aligned — same lanes, same vocabulary, same handoffs.
- **Maps to:** confirmation of `follow-procedure` (the division model is the procedure).

### P-072 — Per-team scope boundary stated explicitly (what it never touches)
- **Observed:** "R&D never touches training code — it feeds the delegate lanes."
- **Why it works:** A team's scope is defined as much by what it *doesn't* touch as what it does. "Never touches training code" is a crisp boundary that prevents the R&D team from colliding with the Claude (terminal) lane.
- **Maps to:** `lane-discipline` extended to sub-agent teams — note it.

### P-073 — Per-team allowlists + bounded loops + full transcripts
- **Observed:** "per-team allowlists, bounded loops, full transcripts."
- **Why it works:** An autonomous agent team without guardrails can run forever, do things it shouldn't, and leave no trail. Allowlists (what it can do), bounded loops (can't run forever), and full transcripts (auditable) are the three guardrails that make autonomy safe.
- **Maps to:** `agent-guardrails` skill.

### P-074 — Living OKF run log per team, append-per-run, in a fixed dir
- **Observed:** "each now has a living OKF run log in knowledge/teams/ that appends per run."
- **Why it works:** A recurring agent needs an append-only run log in a fixed location so each run is auditable and trend-visible over time. The fixed dir makes collection trivial; append-per-run keeps history.
- **Maps to:** fold into `sme-fanout` (the output contract applied to recurring runs).

### P-075 — Offline eval gate in CI + exact counts + secrets scan before push
- **Observed:** "50 Python tests passed (10 new agentkit tests run fully offline as the spec's eval gate, now in CI), 7 environment-gated skips, zero failures, secrets scan clean before push."
- **Why it works:** The eval gate runs *fully offline* (no network dependency → no flaky failures), is wired into CI (runs every time, not just locally), reports exact counts + skip reasons, and the secrets scan runs before the push. Confirms `validate-gate` + `pre-commit-hygiene`.
- **Maps to:** confirmation of `validate-gate` (offline eval gate in CI) + `pre-commit-hygiene`.

### P-076 — Config-driven scheduling with the exact command
- **Observed:** "schedule per config/agent_teams.json: uv run python -m agentkit run operations --loop 1440".
- **Why it works:** Scheduling is config-driven (the cadence lives in a file, not hardcoded) and the exact command is given so the user can run it without deriving it.
- **Maps to:** confirmation of `readiness-report` / `close-the-loop` (exact commands).

### P-077 — Name the single user-only input
- **Observed:** "set GLM_API_KEY — that's the one input only you can provide."
- **Why it works:** Of all the readiness items, exactly one is user-only (the API key). Naming it as "the one input only you can provide" focuses the user on the single action that unlocks the LLM layer.
- **Maps to:** confirmation of `readiness-report` (the credential item).

## Tick 19 (manual rerun): 2026-07-02 12:35 (UTC-5) — phased feature delivery

### P-078 — Phased board: numbered phases each with a named deliverable, in dependency order, last phase = verify+report
- **Observed:** `Phase 1: Fleet engagement audit → docs/reviews/ui-ux-engagement-audit.md`, `Phase 2: Hub gamification design (shared vs local)`, `Phase 3: Build ui-fleet primitives + hub wiring + sibling passes`, `Phase 4: Verify, task done, readiness report`.
- **Why it works:** A large feature tracked as one task is unmanageable; tracked as ad-hoc sub-steps is invisible. Numbered phases each with a concrete deliverable (often a file path) make the plan legible and each "done" unambiguous. Phases are in dependency order (audit → design → build → verify), and the last phase is explicitly "Verify, task done, readiness report" — the gate is built into the plan.
- **Maps to:** refine `progress-board` — the phased variant.

### P-079 — Audit phase writes to a fixed review path
- **Observed:** `docs/reviews/ui-ux-engagement-audit.md` — the audit phase's deliverable is a doc at a fixed review path.
- **Why it works:** A fixed review path makes the audit collectable and comparable across runs. Confirms `sme-fanout`'s fixed-output-dir pattern.
- **Maps to:** confirmation of `sme-fanout`.

### P-080 — "Shared vs local" decision in feature design
- **Observed:** `Phase 2: Hub gamification design (shared vs local)`.
- **Why it works:** A feature built for one site may belong in the shared `ui-fleet` package (available to all sites) or as hub-local code. Deciding shared-vs-local *in the design phase* prevents building a shared thing locally (or vice-versa) and having to move it.
- **Maps to:** refine `use-design-system` — decide shared vs local placement during design.

### P-081 — Build shared primitive → wire into primary → pass through siblings
- **Observed:** `Phase 3: Build ui-fleet primitives + hub wiring + sibling passes`.
- **Why it works:** The shared primitive is built once (in `ui-fleet`), wired into the primary site (hub), then propagated through sibling sites. This is the shared-primitive-then-propagate pattern — build once, use everywhere.
- **Maps to:** refine `use-design-system` — the primitive-then-propagate build order.

### P-082 — UI components consume domain logic from the SDK, don't hardcode it
- **Observed:** `import { ledgerStageToDivision, stageLabel } from "@synthaembed/fleet";` — `RaceFeed.tsx` pulls stage→division mapping and stage labels from the fleet SDK.
- **Why it works:** Domain mappings (stage→division, labels) are business logic that lives in one place — the fleet SDK. A UI component that hardcodes them drifts from the source of truth. Importing from the SDK keeps the UI a pure view over the SDK's model.
- **Maps to:** refine `use-design-system` — UI consumes domain logic from the SDK, never hardcodes it.

### P-083 — Heavy SDK domain-layer reuse across primitives (confirms P-082)
- **Observed:** `InteractiveCircuit.tsx` imports `BRAND`, `getDivisionRelay`, `getLedgerStages`, `getOrgDivision`, `GLOSSARY`, `ledgerStageToDivision` — a full suite of domain primitives from `@synthaembed/fleet`.
- **Why it works:** Confirms P-082 at scale — the UI pulls brand constants, glossary, division/stage mappers, and relay lookups from the SDK rather than hardcoding any of it. The SDK is the single source of domain truth; the UI is a pure view over it.
- **Maps to:** confirmation of `use-design-system`'s SDK-owns-domain-logic rule (P-082).
