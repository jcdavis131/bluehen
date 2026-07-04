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

## Tick 21: 2026-07-02 12:48 (UTC-5) — spec index, a11y gate, touched-sites build

### P-084 — Spec index maintained with status + sign-off state per spec
- **Observed:** specs README diff — a table with spec link, status (`**Implemented**` / `**Draft**`), and notes ("Awaiting Operator sign-off on venture map + consent language").
- **Why it works:** A specs index that tracks each spec's status and what's blocking it makes the spec backlog scannable and shows which drafts need sign-off. This is the registry surface for specs — part of `metadata-align`.
- **Maps to:** refine `metadata-align` — the specs README is a registry surface to keep statused.

### P-085 — Static a11y verification of new UI primitives (while builds run)
- **Observed:** "While builds run, static a11y verification of the new primitives (animations gated, keyboard/aria present)."
- **Why it works:** New UI primitives can ship with unguarded animations (no `prefers-reduced-motion`), missing keyboard support, or absent ARIA. A static a11y check on each new primitive catches these before they ship — and it's a perfect fill-the-wait task while builds run. The three things to check: animations gated, keyboard accessible, ARIA present.
- **Maps to:** `a11y-gate` skill.

### P-086 — Backgrounded build across only the touched sites
- **Observed:** "Production build all three touched sites" — a backgrounded production build across the three sites this change touched, not all sites.
- **Why it works:** `affected-tests` (P-009) applied to builds — build only the touched sites, not the whole fleet. Cheaper, less noise, faster signal.
- **Maps to:** fold into `affected-tests` — the build analog of the affected-tests rule.

### P-087 — Transport retry with backoff + visible attempt cap
- **Observed:** "Unable to connect to API (FailedToOpenSocket) · Retrying in 13s · attempt 6/10".
- **Why it works:** A connection failure retries with a backoff (13s) and a visible attempt cap (6/10). The cap prevents infinite retry; the visibility tells the user it's happening. This is the harness's transport behavior, not a deliberate agent pattern — noted, not a skill.
- **Maps to:** note only (platform transport behavior).

## Tick 22: 2026-07-02 13:05 (UTC-5) — policy-as-config, build verification

### P-088 — Encode consent + data flow as config, not code
- **Observed:** fleet.json diff: `"dataConsent": "Opt-in checkbox on /check; consented samples → data/datalab/inbox (datalab source: dumbmodel-health-checks)"`.
- **Why it works:** The consent mechanism (opt-in checkbox on `/check`) AND the data flow (where consented samples go, what source they're tagged as) are encoded in config, not hardcoded. This makes consent auditable (it's a data field, grep-able), changeable without a code edit, and visible to the fleet registry. Consent/policy-as-code is the compliance counterpart to infrastructure-as-code.
- **Maps to:** `policy-as-config` skill.

### P-089 — Verify phase runs three gates: new tests, typechecks, production build
- **Observed:** "Verification — new tests, typechecks, production build".
- **Why it works:** Confirms `validate-gate` — the verify phase is exactly the three-gate stack.
- **Maps to:** confirmation of `validate-gate`.

### P-090 — Keep the package's barrel export current when adding a type
- **Observed:** `index.ts` diff — added `DiagnoseResult` to `export type { ... }`.
- **Why it works:** A new type that isn't exported from the package's barrel (`index.ts`) is invisible to consumers. Keeping the export surface current is part of "the primitive is done".
- **Maps to:** refine `use-design-system` — keep the barrel export current.

### P-091 — Build verification with exit-code capture + targeted error-grep
- **Observed:** `CI=true pnpm --filter @synthaembed/dumbmodel --filter @synthaembed/hub build > "$JOB_DIR/tmp/venture-build2.log" 2>&1; echo "exit=$?"; grep -E "error|Failed" "$JOB_DIR/tmp/venture-build2.log" | head -4`.
- **Why it works:** The capture-exit-and-sample idiom (P-063) applied to a build, refined with a targeted `grep -E "error|Failed" | head -4` — show the exit code AND surface just the error/Failed lines. Faster diagnosis than a raw tail when the build log is long.
- **Maps to:** refine `silent-op-recovery` — add the error-grep variant to the capture idiom.

### P-092 — `CI=true` to force CI-equivalent build behavior locally
- **Observed:** `CI=true pnpm --filter … build`.
- **Why it works:** Setting `CI=true` makes the build behave as it would in CI (fail on warnings, no interactive, stricter). Running it locally gives you CI-equivalent signal before pushing.
- **Maps to:** refine `validate-gate` — set `CI=true` for local builds to get CI-equivalent behavior.

## Tick 23: 2026-07-02 13:13 (UTC-5) — data seed, placeholder-pending-decision

### P-093 — Spec + task ID cited in the file header
- **Observed:** `add-certification.ts` opens with `/** Add the slasso RAG Certification product (Spec 0015, SITE-009). */`.
- **Why it works:** Every new file's header cites its spec number and work-queue ID, so the work is traceable from code back to the tracker. This is the repo's documented "Spec traceability" convention (AGENTS.md) in practice.
- **Maps to:** confirmation of `follow-procedure` + the repo's spec-traceability rule.

### P-094 — Placeholder-pending-Operator-decision documented inline
- **Observed:** `Price is a placeholder pending Operator pricing decision — adjust in [admin/UI]`.
- **Why it works:** A data value that can't be finalized yet (price needs a product decision) is set to a placeholder with a documented owner (Operator) and next step (adjust in admin). This is `document-non-action` applied to a data value — a placeholder is a deferred decision, not a forgotten one.
- **Maps to:** refine `document-non-action` — the placeholder-pending-decision variant.

### P-095 — Idempotent data-seed script with skip-detection in the run grep
- **Observed:** `add-certification.ts` is a one-shot data seed (`npx medusa exec ./src/scripts/add-certification.ts`), and the run command greps `grep -iE "certification|error|added|skip" | tail -3` — watching for "skip" because the seed detects if the product already exists and skips.
- **Why it works:** A data-seed that isn't idempotent fails or duplicates on a second run. An idempotent seed (detect existing → skip) is re-runnable safely, and grepping for `added|skip|error` shows what actually happened in one line. This is the data-setup counterpart to `affected-tests` — a cheap, re-runnable, observable seeding step.
- **Maps to:** `idempotent-seed-script` skill.

## Tick 24: 2026-07-02 13:21 (UTC-5) — ventures shipped

### P-096 — "Demo became the product" reframing
- **Observed:** "arxiviq.com — the demo became the product. Homepage now opens with 'Search arXiv like it's your own corpus' — the live tier-compare panel is the pitch — followed by a design-partner subscription CTA into the store."
- **Why it works:** Recognized that for arxiviq the demo *is* the product and restructured the homepage so the demo leads, with a CTA into the store. Product-strategy insight, not strictly an agent behavior — noted.
- **Maps to:** note (product insight).

### P-097 — Deferral tied to a spec gate, recorded in the venture block
- **Observed:** "One honest deferral, recorded in the venture block: query logging waits until a consent UI ships, per the gate you set in Spec 0015."
- **Why it works:** The deferral isn't ad-hoc — it's tied to a gate set in a spec (0015), and recorded in the venture block (config). So the deferral is traceable (to the spec), auditable (in config), and unblocked by a known condition (consent UI ships). This is `document-non-action` + `policy-as-config` together.
- **Maps to:** confirmation of `document-non-action` + `policy-as-config`.

### P-098 — Guardrail kept explicit in user-facing copy
- **Observed:** "Every line of copy keeps the guardrail explicit — simulation only, no live capital, no trading advice."
- **Why it works:** A guardrail isn't just code-enforced; it's stated in the user-facing copy so the promise is visible to the user and the brand. The v1 "no live trading" guardrail (Spec 0001) is enforced in every line of finance-lab copy, not just in the code that doesn't place trades.
- **Maps to:** refine `respect-the-guard` — guardrails appear in copy, not just code.

### P-099 — Registry as source of truth; internal vs public explicit
- **Observed:** "all five public sites now carry a venture block in config/fleet.json (valueProp, CTA, monetization, dataConsent)… Control and training-console remain explicitly internal."
- **Why it works:** The business layer is config-inspectable the same way the fleet is, and internal sites are *explicitly* internal (not just absent from the public list). Confirms `metadata-align` + `policy-as-config`.
- **Maps to:** confirmation of `metadata-align` + `policy-as-config`.

### P-100 — End-to-end funnel narration
- **Observed:** "The full funnel, end to end: dumbmodel's free check → hub store credits; slasso certification → store checkout; arxiviq → design-partner seat; finance-lab → waitlist → future premium notes — every path terminating in the live Medusa backend or the leads file, and consented interactions flowing into the datalab inbox for the R&D flywheel."
- **Why it works:** Narrates the whole business funnel, confirming every path terminates somewhere real (Medusa or leads file) and consented data flows into the R&D flywheel. This is the business-layer close-the-loop — not just "the code is done" but "the funnel is wired end to end".
- **Maps to:** refine `close-the-loop` — narrate the end-to-end funnel, not just the code arc.

### P-101 — Open items with owners + a forward offer
- **Observed:** "Open items for you: set the certification price in Medusa Admin, review the consent copy on dumbmodel /check and the finance-lab privacy line before public deploy, and when you're ready to take arxiviq's query-log flywheel live I'll spec the consent UI as the next SITE task."
- **Why it works:** Open items name the owner ("for you" = Operator) + the precondition ("before public deploy"), and Fable 5 proactively offers the next spec as a follow-up ("I'll spec the consent UI as the next SITE task"). The forward offer turns a deferred item into a proposed next action.
- **Maps to:** refine `readiness-report` — open items name owners + preconditions, and include a forward offer for the next spec.

## Tick 25: 2026-07-02 13:29 (UTC-5) — attention pass (confirmations)

### P-102 — Glossary constants for UI labels
- **Observed:** `label={GLOSSARY.fleet}` for a StatCard label, instead of a string literal.
- **Why it works:** Vocabulary lives in the `GLOSSARY` constant, not hardcoded. Renaming "Fleet" → "Fleet OS" is a one-place change. Confirms P-082/P-083 (SDK owns domain logic, including vocabulary).
- **Maps to:** confirmation of `use-design-system`.

### P-103 — Shared `Reveal` animation wrapper with stagger index
- **Observed:** `<Reveal index={3}>…</Reveal>` wrapping content for animation, with an `index` prop for staggered reveal.
- **Why it works:** A shared animation primitive is the right place to enforce `prefers-reduced-motion` once (see `a11y-gate`), and the `index` prop gives staggered reveal without per-call timing code. Confirms `use-design-system` + reinforces `a11y-gate`.
- **Maps to:** confirmation of `use-design-system` + `a11y-gate`.

### P-104 — Cross-site nav via SDK helpers with a local flag
- **Observed:** `siteHref(getSite("control")!, local)` — fleet SDK helpers for cross-site links, with a `local` flag for local vs prod URLs.
- **Why it works:** Cross-site navigation logic (which site is "control", what its URL is in this env) comes from the SDK, not hardcoded. The `local` flag handles env-specific URLs. Confirms P-082.
- **Maps to:** confirmation of `use-design-system`.

## Tick 26: 2026-07-02 13:37 (UTC-5) — Vercel deploy

### P-105 — Load the available integration's tools before using them
- **Observed:** "The Vercel integration is available in this session — loading its tools and checking the existing projects before deploying."
- **Why it works:** Before deploying, Fable 5 discovered the Vercel integration is available, loaded its tools, and inspected existing project state — rather than assuming or asking. You act on ground truth (what projects exist, their deploy state) not on assumption.
- **Maps to:** `use-available-integrations` skill.

### P-106 — Check existing state first; only act on the missing set
- **Observed:** "All five existing projects deployed READY from the final push 4 minutes ago. Creating the two missing projects (finance-lab, training-console) and deploying them."
- **Why it works:** Checked the existing projects' deploy state first, found five already READY from the recent push, so only created + deployed the two missing ones. The affected-set principle applied to deploys — don't redeploy what's already live and green.
- **Maps to:** fold into `use-available-integrations` — inspect existing state, act only on the missing/delta set.

### P-107 — Reuse stored credentials from the platform's auth file
- **Observed:** `TOKEN=$(python -c "import json;print(json.load(open(r'.../com.vercel.cli/Data/auth.json'))['token'])")` — read the Vercel CLI's stored auth token from its standard auth.json to authenticate API calls, instead of asking the user for a token.
- **Why it works:** The user has already logged into the Vercel CLI; its token is in a known location. Reusing it avoids a credential round-trip and lets the deploy proceed without blocking on the user. (Mind the scope — a CLI token's scope may differ from a deploy token; see `respect-the-guard`'s credential-scope note.)
- **Maps to:** fold into `respect-the-guard` — reuse stored credentials from their standard location, and name the scope.

### P-108 — Direct API call as fallback for ops the integration tools don't expose
- **Observed:** `curl -s -X PATCH "https://api.vercel.com/v9/projects/..."` with the reused bearer token — when the loaded integration tools don't expose a specific operation (updating a project), fall back to a direct authenticated API call.
- **Why it works:** Integration tools cover the common cases; the long tail needs the raw API. Reusing the same credential for the direct call keeps the fallback seamless.
- **Maps to:** fold into `use-available-integrations` — integration tools first, direct API as fallback.

## Tick 27: 2026-07-02 13:45 (UTC-5) — review handoff

### P-109 — Monorepo subdirectory deploy: set Root Directory so workspace deps resolve
- **Observed:** "fixed the monorepo Root Directory setting via the API (a subdirectory deploy can't see workspace:* packages)".
- **Why it works:** A subdirectory deploy that doesn't set Root Directory can't resolve `workspace:*` packages — the build breaks on imports. Setting Root Directory via the API fixes the resolution scope. A monorepo deploy gotcha.
- **Maps to:** fold into `use-available-integrations` — monorepo deploy gotcha.

### P-110 — Lift SSO interstitial so review links are shareable
- **Observed:** "lifted Vercel's SSO interstitial so their links are shareable."
- **Why it works:** A deployment behind Vercel SSO can't be shared with reviewers who aren't on the team. Lifting the interstitial makes the URL publicly viewable for review.
- **Maps to:** fold into `use-available-integrations` — review-deploy setting.

### P-111 — "Designed states, not bugs" — pre-emptively label expected empty/error states
- **Observed:** "these are designed states, not bugs: production core-api isn't deployed yet (the BLK-PROD item), so the hub badge reads 'API offline,' meters and race feed show their empty states, dumbmodel's health check will return a polite error, the store shows 'opening soon' (Medusa is local-only), and the Training Observatory shows its telemetry-unreachable guidance."
- **Why it works:** A reviewer who hits "API offline" files it as a bug; a reviewer who knows it's the expected BLK-PROD state doesn't. Pre-emptively listing the expected empty/error states with their cause turns would-be bug reports into confirmed-designed behavior.
- **Maps to:** refine `readiness-report` — include a "designed states, not bugs" section.

### P-112 — Curated review tour with time budget + per-URL check items + framing
- **Observed:** "Worth 10 minutes of your review: bhenre.com (hero button feel, card cascade, mascot following your cursor, ⌘K), dumbmodel.com/check (consent copy — read it as your lawyer would), slasso.com/certify, and the Signal Lab waitlist flow…"
- **Why it works:** A time budget (10 min) tells the reviewer what they're committing; the URLs with per-site check items focus the review; the framing ("read it as your lawyer would") tells them *how* to review the consent copy. A vague "review the sites" gets a vague review; a curated tour gets a targeted one.
- **Maps to:** refine `readiness-report` — include a curated review tour.

### P-113 — Flag a prod limitation with the unblock condition + gating event
- **Observed:** "it writes to the serverless instance's ephemeral disk in prod — a real lead store needs the LEADS_DIR decision from TECH_DEBT before you promote it."
- **Why it works:** Names the prod limitation (ephemeral disk), the unblock condition (LEADS_DIR decision from TECH_DEBT), and the gating event (before you promote). The reviewer knows the waitlist works *for review* but not *for prod leads*, and exactly what unblocks prod.
- **Maps to:** confirm `document-non-action` + `readiness-report`.

### P-114 — Forward offer with the specific one-line unblock
- **Observed:** "If you want finance-lab and training-console on real domains (or nicer *.vercel.app names), that's a one-line domain attach per project — tell me which domains and I'll wire them."
- **Why it works:** Confirms P-101 — a forward offer with the specific unblock ("tell me which domains") and the cost ("one-line per project").
- **Maps to:** confirms `readiness-report`'s forward-offer rule.

## Tick 28: 2026-07-02 13:53 (UTC-5) — fleet rebrand (confirmations)

### P-115 — Nav config keyed by site id; adding a site adds its nav key
- **Observed:** Diff of a nav config object keyed by site id — `"research-rag"` renamed to `research`, plus new `simulation` and `observatory` keys.
- **Why it works:** Nav structure is config-keyed by site id, so adding/rebranding a site is a config edit (add/rename its key), not a code change in every page. Confirms `metadata-align` + `policy-as-config` (structure as data).
- **Maps to:** confirmation of `metadata-align`.

### P-116 — Cross-cutting change (rebrand) handled with the phased board, split across two board items
- **Observed:** `Execute Cursor rebrand plan P1–P4 (spine, renames, artifacts, backend)` and `Execute rebrand P5–P8 (role split, copy, docs, validate)` — a rebrand broken into named phases (P1–P8) grouped into two board tasks.
- **Why it works:** A cross-cutting change is unmanageable as one task; the phased board (P-078) scales from feature → rebrand. The phases are ordered (spine/renames first, copy/docs/validate last) and grouped into reviewable board items. Confirms `progress-board`'s phased variant applies beyond features.
- **Maps to:** confirmation of `progress-board` (phased variant) + `logical-commit-split`.

### P-117 — Rebrand task bundles audit + subdomain wiring + vision close-out
- **Observed:** `Fleet rebrand audit + subdomain wiring + vision close-out` as one task.
- **Why it works:** The rebrand task includes the audit (what to rebrand), the subdomain wiring (the infra consequence), and the vision close-out (closing the spec/vision that drove the rebrand) — the full consequence chain in one task, not just the rename.
- **Maps to:** confirmation of `close-the-loop` + `metadata-align` (subdomains are a surface).

## Tick 29: 2026-07-02 14:01 (UTC-5) — rebrand alignment + conservative rename

### P-118 — Clean up now-unused imports after a rename
- **Observed:** "Cleaning the now-unused imports in the storefront page".
- **Why it works:** A rename/rebrand leaves imports that referenced the old name now-unused. Explicitly cleaning them (not leaving them to a linter pass) keeps the diff clean and the rename complete in one phase.
- **Maps to:** fold into `conservative-rename`.

### P-119 — Conservative brand-alignment: paths and ids only, no blanket word replaces
- **Observed:** "docs/memory brand alignment with conservative patterns (paths and ids only; no blanket word replaces)".
- **Why it works:** A blanket word replace on a brand rename over-replaces — "cursor" the agent name vs "cursor" the CSS/UX term; "hub" the site vs "hub" the generic word. Restricting the replace to paths and ids (the structured references) avoids corrupting prose and creating false matches. This is the rename safety guard.
- **Maps to:** `conservative-rename` skill.

### P-120 — Rebrand phases 6–7 are the alignment phases (copy/metadata, then docs/memory)
- **Observed:** "Phase 6 — copy/metadata alignment across the renamed sites" and "Phase 7 — docs/memory brand alignment".
- **Why it works:** The rebrand's late phases are the `metadata-align` work — copy/metadata across sites, then docs/memory. Confirms `metadata-align` as a rebrand phase, ordered after the structural renames.
- **Maps to:** confirmation of `metadata-align`.

## Tick 30: 2026-07-02 14:09 (UTC-5) — post-deploy smoke + failure acknowledgement

### P-121 — Run the Python suite while builds churn (fill-the-wait)
- **Observed:** "Running the Python suite while builds churn".
- **Why it works:** The long build is a window to run the test suite in parallel. Confirms `fill-the-wait`.
- **Maps to:** confirmation of `fill-the-wait`.

### P-122 — Acknowledge test failures + locate them precisely before fixing
- **Observed:** "Two test failures are half-swept literals in the test file itself — inspecting".
- **Why it works:** Acknowledges the failures (doesn't hide them), locates them precisely ("half-swept literals in the test file itself" — leftover literals from the rename), and says it's inspecting. Confirms `diagnose-before-retry` applied to test failures.
- **Maps to:** confirmation of `diagnose-before-retry` + `validate-gate`.

### P-123 — Post-deploy smoke loop: bounded retry polling live URLs for expected content
- **Observed:** `for i in 1 2 3 4 5 6 7 8; do ok=1; for u in "https://jcamd.com|Headquarters" "https://www.bhenre.com|Storefront"; do url="${u%%|*}"; want="${u##*|}"; hit=$(curl -sL --max-time 20 "$url" | grep -c "$want"); [ "$hit" -ge 1 ] || ok=0; done; [ "$ok" = 1 ] && break; done` — a bounded (8-iteration) retry loop that polls live URLs and greps for expected content, breaking when both match.
- **Why it works:** A deploy isn't "done" when the API returns 200; it's done when the live URL serves the expected content (deploy propagation has a delay). Polling the live URL for an expected string confirms the deploy actually propagated, with a bounded retry so it can't loop forever.
- **Maps to:** `post-deploy-smoke` skill.

### P-124 — `export TERM=dumb` to keep scripted output clean
- **Observed:** The smoke loop opens with `export TERM=dumb`.
- **Why it works:** Setting `TERM=dumb` stops terminal control sequences from polluting the scripted output. A small hygiene touch for any scripted command.
- **Maps to:** fold into `post-deploy-smoke`.

### P-125 — Re-point all Vercel projects after the rename
- **Observed:** "All Vercel projects re-pointed."
- **Why it works:** After the rebrand, the Vercel projects are re-pointed to the new paths/names. Confirms `metadata-align` + `use-available-integrations` at the platform layer.
- **Maps to:** confirmation of `metadata-align` + `use-available-integrations`.

## Tick 31: 2026-07-02 14:17 (UTC-5) — named monitor + classifier-approved actions

### P-126 — Monitor as a named action with task id + timeout
- **Observed:** `Monitor(Rebranded titles go live on bhenre.com + jcamd.com) — Monitor started · task b2lqx5mpo · timeout 720s`.
- **Why it works:** The event-driven wait is formalized as a named action: a human-readable event name ("Rebranded titles go live on…"), a task id for reference, and a timeout (720s) so it can't wait forever. Confirms `event-driven-wait` with the formalization details.
- **Maps to:** refine `event-driven-wait` — the monitor is a named, id'd, time-bounded action.

### P-127 — Auto-mode classifier approves guarded actions
- **Observed:** "Allowed by auto mode classifier".
- **Why it works:** Auto mode has a classifier that approves or blocks actions. A monitor starting was classified as safe → allowed. This is the guard layer under `auto-mode` — autonomy isn't unconditional; a classifier gates each guarded action.
- **Maps to:** refine `auto-mode` — a classifier gates guarded actions.

### P-128 — Read project id from `.vercel/project.json` to parameterize a CLI deploy
- **Observed:** `OBS=$(python -c "import json;print(json.load(open('apps/sites/observatory/.vercel/project.json'))['projectId'])") && VERCEL_ORG_ID=... VERCEL_PROJECT_ID=$OBS vercel deploy --prod --yes --scope ...`.
- **Why it works:** Reads the projectId from the Vercel project.json (the stored config) to parameterize a CLI deploy, combined with the org/team id. No hardcoded project ids — they come from the config the `vercel link` step wrote.
- **Maps to:** fold into `use-available-integrations` — read project ids from their stored config.

### P-129 — CLI deploy as fallback for a targeted single-site redeploy
- **Observed:** "redeploying observatory with its fixed title (CLI-managed)" — `vercel deploy --prod --yes` for one site after a fix, when the integration didn't redeploy it.
- **Why it works:** The integration handles fleet-wide deploys; a targeted single-site redeploy after a fix uses the CLI directly. Fallback to the most granular tool when the higher-level one doesn't fit.
- **Maps to:** fold into `use-available-integrations` — CLI as the granular fallback.

### P-130 — Fill-the-wait with a targeted redeploy
- **Observed:** "While the git builds run, redeploying observatory with its fixed title".
- **Why it works:** The git builds run while a targeted redeploy happens in parallel. Confirms `fill-the-wait`.
- **Maps to:** confirmation of `fill-the-wait`.

## Tick 32: 2026-07-02 14:25 (UTC-5) — prod backend redeploy

### P-131 — Check DB migration head; skip migrate if already at head
- **Observed:** "DB already at head."
- **Why it works:** Before running migrations, checked the DB's current migration head and found it was already at head — so skipped the migrate. The idempotent/affected-set principle applied to migrations: check current state, skip if already applied. Avoids a no-op migrate that could still error on a partially-applied state.
- **Maps to:** refine `idempotent-seed-script` — the migration variant: check head, skip if current.

### P-132 — Monitor watches for a health endpoint to confirm a backend deploy
- **Observed:** "Watching for the new image to go live (/readyz appearing = current build)".
- **Why it works:** A backend deploy's "expected content" is the health endpoint (`/readyz`) appearing — signaling the new image is serving. This is `post-deploy-smoke` generalized to backends: poll `/readyz` instead of grepping for a string. The monitor is the event-driven form of the smoke loop.
- **Maps to:** refine `post-deploy-smoke` — the backend variant (poll a health endpoint).

### P-133 — State the conditioned next action while waiting
- **Observed:** "I'll proceed the moment the Railway build reports ready or the review returns."
- **Why it works:** Confirms P-033 — names the next action conditioned on the wait, with two possible triggers (build ready OR review returns).
- **Maps to:** confirmation of `progress-board` / `fill-the-wait`.

### P-134 — Background agent review with per-agent task + cost
- **Observed:** "◯ general-purpose Reviewing embed_texts torch loading 3m 31s · ↓ 59.4k tokens".
- **Why it works:** Confirms P-023 — per-subagent status with task name + cost.
- **Maps to:** confirmation of `sme-fanout`.

### P-135 — Board narrows to a single task for a focused phase
- **Observed:** "1 tasks (0 done, 1 in progress, 0 open) ◼ Prod backend: redeploy Railway, migrate, bootstrap orgs, Vercel env".
- **Why it works:** When the work narrows to one focused task, the board narrows to one task — no padding with completed or future items. The board scales with the work: phased for big, single-task for focused.
- **Maps to:** confirmation of `progress-board`.

## Tick 33: 2026-07-02 14:33 (UTC-5) — architecture diagram + config verify

### P-136 — Architecture diagram maps each site to domain + role
- **Observed:** Diff of an architecture description: "storefront (bhenre.com) · hq (jcamd.com, org hub w/ live operating loop) · dumbmodel · validation (slasso) · research (arxiviq) · simulation (signals.bhenre.com) · observatory (training.jcamd.com)".
- **Why it works:** The architecture doc maps each site to its domain AND its role (storefront, hq, validation, research, simulation, observatory). A reader gets the full topology — which site, which domain, which role — in one line. Confirms `metadata-align` with the site→domain→role mapping detail.
- **Maps to:** refine `metadata-align` — the architecture diagram maps site→domain→role.

### P-137 — Named background review agent completion with elapsed time
- **Observed:** "Agent 'Deep review critical platform paths' finished · 10m 7s".
- **Why it works:** Confirms P-023 — a named background review agent, its completion acknowledged with elapsed time.
- **Maps to:** confirmation of `sme-fanout` + `background-failure-triage` (acknowledge completion).

### P-138 — Verify a config value by parsing the actual env file
- **Observed:** `python -X utf8 -c "import re; t = open('data/workspaces/hub.env', encoding='utf-8').read(); base = re.search(r'SYNTH_API_BASE_URL=(.*)', t); print('baseUrl in hub.env:', ...)"` — parses the workspace env file to check the baseUrl the site points at.
- **Why it works:** Rather than assuming the site's configured baseUrl, reads the actual env file and extracts the value. `python -X utf8` handles UTF-8 on Windows. Confirms `correct-assumptions` — verify config by reading the file, not by assumption.
- **Maps to:** confirmation of `correct-assumptions` + `session-orient`.

### P-139 — Multiple monitors running concurrently
- **Observed:** "2 monitors" in the status bar.
- **Why it works:** Multiple named monitors can run concurrently (the `/readyz` monitor + another). Each is independently named, id'd, and time-bounded. Confirms `event-driven-wait` scales to concurrent watchers.
- **Maps to:** confirmation of `event-driven-wait`.

## Tick 34: 2026-07-02 14:41 (UTC-5) — review findings + handoff + gate limit

### P-140 — Deep review found two real prod bugs; gates made non-overridable
- **Observed:** "governance.get_trace had its def line destroyed (every trace read 500'd, and the orphaned body was the unscoped RLS-bypass query — restored with workspace scoping), and the worker deployed charter-approved models even when eval gates failed — a '*' charter meant gate-failed models auto-deployed; now gates are non-overridable."
- **Why it works:** The review found real bugs with precise mechanisms (a destroyed def → 500s + RLS bypass; a '*' charter → gate-failed models auto-deployed). The gate-bypass was fixed by making gates non-overridable — a '*' charter can no longer override a failed gate. Confirms `verify-subagent-output` (the review had substance) + adds: gates should be non-overridable.
- **Maps to:** refine `respect-the-guard` — gates are non-overridable.

### P-141 — Parallel-edit convergence on the same file
- **Observed:** "Cursor converged on the same file in parallel and extended it cleanly."
- **Why it works:** Two agents edited the same file in parallel and converged cleanly because the changes were non-conflicting extensions. Confirms `lane-discipline` with the nuance that parallel same-file edits can converge when extensions don't overlap.
- **Maps to:** confirmation of `lane-discipline`.

### P-142 — Review findings queued as tracked REV-NNN items
- **Observed:** "The remaining 8 highs/mediums are queued as REV-901…910 in TASKS.md".
- **Why it works:** Review findings become tracked items (REV-901…910) in the task tracker, not prose in a report. Confirms `follow-procedure` (tracker IDs) + `readiness-report`.
- **Maps to:** confirmation of `follow-procedure` + `readiness-report`.

### P-143 — Prioritize the findings that gate the specific release
- **Observed:** "the two I'd do before promoting dumbmodel's /check publicly: per-request torch model loading behind an unauthenticated route (trivial DoS), and leads writing to Vercel's read-only filesystem."
- **Why it works:** Out of 8 findings, named the 2 that specifically gate the dumbmodel /check public promotion, with the mechanism. Prioritization tied to a concrete release, not generic severity.
- **Maps to:** refine `readiness-report` — prioritize findings by what gates the specific release.

### P-144 — HANDOFF.md opens with a dated session-continuation block
- **Observed:** "HANDOFF.md now opens with a dated session-continuation block — live state, the exact 4-command gate sequence, and ordered follow-ups. That's the note to paste into any fresh session."
- **Why it works:** A handoff note designed to be paste-able into a fresh session: dated, with live state, the exact gate command sequence, and ordered follow-ups. This is the session-to-session bridge — the most-read artifact at the start of the next session.
- **Maps to:** refine `persist-learnings` — the handoff note is the paste-into-fresh-session form.

### P-145 — PLAN.md rewritten as-built
- **Observed:** "PLAN.md §3.1 rewritten as-built (live fleet, Railway, venture map)".
- **Why it works:** The plan doc is rewritten to reflect what was actually built, not the original plan. Confirms `metadata-align` — the plan doc is a surface that should reflect as-built state.
- **Maps to:** confirmation of `metadata-align`.

### P-146 — Strategic flag: a gate that passes on thin corpora isn't proof
- **Observed:** "with fewer than 5 training pairs, the eval gate silently scores against 3 demo pairs and can pass (REV-905) — until that's fixed, treat 'gates passed' on thin corpora as unproven."
- **Why it works:** Fable 5 flagged a strategic limit of its own gate: on thin data the gate can silently pass. This is the caution against over-trusting a gate — "gates passed" is conditional on the corpus being sufficient. Confirms `validate-gate` with the gate-limits nuance.
- **Maps to:** refine `validate-gate` — a gate that passes on thin data isn't proof; state the corpus condition.

## Tick 35: 2026-07-02 14:49 (UTC-5) — e2e proof + served-vs-source

### P-147 — Monitor stream-end acknowledged
- **Observed:** "Monitor 'Storefront BFF reports core-api online with key' stream ended".
- **Why it works:** The monitor's stream ending is explicitly acknowledged — completion of a wait, not just completion of a background command. Confirms `background-failure-triage` extended to monitors.
- **Maps to:** confirmation of `background-failure-triage` + `event-driven-wait`.

### P-148 — One end-to-end proof through a public site's BFF before closing out
- **Observed:** "The fleet is on live data. One end-to-end proof through a public site's BFF, then closing out."
- **Why it works:** Before declaring the fleet live, Fable 5 runs ONE end-to-end proof through a public site's BFF — a single concrete path through the live system (public site → BFF → core-api → key). You don't verify every path; you prove one complete path end-to-end, which validates the wiring. Then close out.
- **Maps to:** refine `close-the-loop` — prove one complete e2e path before declaring a fleet live.

### P-149 — Discrepancy diagnosed by comparing served value vs source value
- **Observed:** "A 401 on storefront despite the push — the key Vercel serves differs from the file. Comparing directly."
- **Why it works:** A 401 despite an env push means the value Vercel serves ≠ the value in the file. Rather than re-pushing blindly, Fable 5 compared the served value vs the source value directly. Confirms `diagnose-before-retry` + `correct-assumptions` — when a deployed value misbehaves, compare what's served vs what's source.
- **Maps to:** refine `correct-assumptions` — compare served vs source.

### P-150 — `vercel env pull` to fetch what's actually served in production
- **Observed:** `vercel env pull /tmp/sf.env --environment production --yes` then parse and compare to the file's value.
- **Why it works:** Pulls the production env vars to a local file to compare against the source. The served env is ground truth for what the deploy actually has; the source file is what you pushed. Discrepancy between them explains the 401.
- **Maps to:** fold into `correct-assumptions` / `use-available-integrations` — pull the served env to verify.

### P-151 — /btw side-question channel without interrupting
- **Observed:** "Tip: Use /btw to ask a quick side question without interrupting Claude's current work" + user used "/btw Can we make dumbmodel.com a fun interactive game".
- **Why it works:** A side-question channel that doesn't interrupt the main flow — the user can ask a parallel question while the agent keeps working. Platform feature, noted.
- **Maps to:** note (platform feature).

## Tick 36: 2026-07-02 14:57 (UTC-5) — prod training stand-up

### P-152 — Combined api+worker in one container for a shared filesystem
- **Observed:** "entrypoint 'all' mode: worker (background) + uvicorn in one container: shared filesystem for model…".
- **Why it works:** When api and worker need a shared filesystem (e.g. for model files / baked corpora), combine them in one container with an 'all' entrypoint mode — worker runs backgrounded, uvicorn foreground. This solves the shared-fs constraint that separate containers (with separate filesystems) can't.
- **Maps to:** fold into `use-available-integrations` — prod architecture pattern.

### P-153 — Persistent volume attached via CLI
- **Observed:** `railway volume add --mount-path /data --service api`.
- **Why it works:** Provisions a persistent volume at `/data` on the api service via the Railway CLI. Persistent storage for things that must survive redeploy (leads, run logs, model cache).
- **Maps to:** fold into `use-available-integrations` — provision persistent storage via CLI.

### P-154 — Structured conventional-commit message with bullet points
- **Observed:** `git commit -q -m "feat(prod): combined api+worker mode, baked corpora, persistent /data volume - entrypoint 'all' mode: worker (background) + uvicorn in …"`.
- **Why it works:** Conventional-commit prefix (`feat(prod):`) + a summary line + bullet points of the changes. The message is the change's documentation in history. Confirms `logical-commit-split` + `follow-procedure`.
- **Maps to:** refine `logical-commit-split` — the commit message shape.

### P-155 — Baked corpora as a deploy artifact
- **Observed:** "baked corpora" in the commit summary.
- **Why it works:** Corpora are baked into the image (not fetched at runtime) — prod reproducibility and no runtime fetch dependency. A deploy with baked corpora is self-contained.
- **Maps to:** note (prod reproducibility).

## Tick 37: 2026-07-02 15:05 (UTC-5) — root-cause fix + event-driven kickoff

### P-156 — Fix the structural cause: corpora travel with the repo so the build can't miss them
- **Observed:** "Corpora now travel with the repo — the build can't miss them."
- **Why it works:** A prior build attempt missed the corpora. Instead of patching the build to fetch them, Fable 5 moved the corpora into the repo so the build *structurally can't* miss them — the fix makes the failure mode impossible, not just unlikely. This is the structural root-cause fix: change the structure so the bug can't recur, rather than adding a check for the symptom.
- **Maps to:** refine `diagnose-before-retry` — fix the structural cause, not the symptom.

### P-157 — Transparent about retry count ("third build attempt")
- **Observed:** recap says "the combined api+worker image is on its third build attempt".
- **Why it works:** Fable 5 is transparent that this is the third attempt, not hiding the retries. The user knows the deploy has been retried twice and can judge whether to keep going. Confirms `cost-transparency`.
- **Maps to:** confirmation of `cost-transparency` + `diagnose-before-retry`.

### P-158 — Kickoffs fire immediately on the success event
- **Observed:** "Standing by for the terminal state; kickoffs fire immediately on success."
- **Why it works:** The next action (training kickoffs) is chained to fire immediately when the monitor's success event fires — event-driven chaining, not poll-then-act. Confirms `event-driven-wait` + `auto-mode`.
- **Maps to:** confirmation of `event-driven-wait`.

### P-159 — Monitor named with ordinal across retries
- **Observed:** `Monitor(Third combined-image deployment terminal state)`.
- **Why it works:** The monitor's event name includes the ordinal ("Third") so multiple monitors for the same event across retries are distinguishable in the task list and logs. Confirms `event-driven-wait` with the retry-naming detail.
- **Maps to:** confirmation of `event-driven-wait`.

## Tick 38: 2026-07-02 15:13 (UTC-5) — steady-state wait (confirmations)

### P-160 — Fill-the-wait with a codebase analysis task
- **Observed:** `Background command "Find all call sites and attributes used" completed (exit code 0)` — a refactoring-analysis task ran in the background while the build churned.
- **Why it works:** Confirms `fill-the-wait` — the build wait is filled with an independent analysis task (call-site enumeration for a refactor), not idle.
- **Maps to:** confirmation of `fill-the-wait`.

### P-161 — Re-state the conditioned next action during a long wait
- **Observed:** "Still building — the monitor will fire on the terminal state and I'll run the kickoffs immediately."
- **Why it works:** During a long wait, re-states the conditioned next action so the user knows the plan hasn't stalled. Confirms P-033/P-158.
- **Maps to:** confirmation of `progress-board` / `event-driven-wait`.

## Tick 39: 2026-07-02 15:21 (UTC-5) — training running

### P-162 — Pre-commit the outcome report shape before the work finishes
- **Observed:** "I'll report the outcome per site — models, gates, deploys — when the worker finishes all four jobs."
- **Why it works:** Before the training finishes, Fable 5 commits to the report shape it will deliver: per-site, with three columns (models, gates, deploys). Pre-committing the output contract sets expectations and makes the eventual report checkable against it.
- **Maps to:** refine `readiness-report` — pre-commit the report shape.

### P-163 — Per-job progress narration during a batch
- **Observed:** "Research is training (200 pairs from the real arXiv corpus). Waiting for the remaining jobs."
- **Why it works:** During a batch of 4 training jobs, narrates per-job progress (which site is training now, with the corpus size) and notes it's waiting for the rest. Confirms `progress-board` at the per-job granularity.
- **Maps to:** confirmation of `progress-board`.

## Tick 41: 2026-07-02 15:37 (UTC-5) — review finding fixed structurally

### P-165 — Bounded LRU encoder cache to fix the per-request torch-loading DoS
- **Observed:** Diff adds `_ENCODER_CACHE` (dict) with `_ENCODER_CACHE_MAX`, a `_ENCODER_LOCK`, and LRU eviction (`_ENCODER_CACHE.pop(next(iter(_ENCODER_CACHE)))` when full) — `encoder.load_state_dict(...)`, `encoder.eval()`, then cache under lock.
- **Why it works:** This structurally fixes the review finding from P-143 ("per-request torch model loading behind an unauthenticated route — trivial DoS"). Instead of loading the model on every request, the encoder is loaded once and cached, with a bound (LRU eviction) so the cache can't grow unbounded, and a lock for thread safety. The DoS vector (per-request load) is removed by structure, not by a rate-limit check. Confirms the review → structural-fix loop.
- **Maps to:** confirmation of `diagnose-before-retry` (structural fix) + the review-findings-to-fix loop.

## Tick 44: 2026-07-02 16:01 (UTC-5) — fix + tracker update

### P-166 — Extract inline key construction into a named function
- **Observed:** `const key = entryKey(e)` replacing `const key = \`${e.ts}-${e.stage}\``.
- **Why it works:** Inline key construction is extracted into a named `entryKey(e)` function — a readability/maintainability refactor. Same class as P-013 (named constants). Small code-craft.
- **Maps to:** note (code-craft, like P-013).

### P-167 — ARIA live region for a dynamic feed
- **Observed:** `<ol className="bh-feed" aria-live="polite" aria-label="Race log feed">`.
- **Why it works:** A dynamic feed uses `aria-live="polite"` + `aria-label` so screen readers announce updates. Confirms `a11y-gate` with the feed-specific detail.
- **Maps to:** refine `a11y-gate` — dynamic feeds use aria-live.

### P-168 — Mark a review finding done in the tracker via a script
- **Observed:** `python -X utf8 - <<'EOF' import json; d = json.load(open('config/work_queue.json')); for t in d['tasks']: if t.get('id') == 'REV-909': t['status'] = 'done'; t['claimedBy'] = 'claude'; t['notes'] = '…'`.
- **Why it works:** A review finding (REV-909) is fixed and marked done in the work queue via a script: load the JSON, find by id, set status='done', claimedBy='claude', add notes. The fix is recorded in the tracker, not just in code. Confirms `follow-procedure` (tracker is the procedure).
- **Maps to:** refine `follow-procedure` — mark findings done in the tracker via a script.

### P-169 — Task notes record both the fix AND the remaining gap
- **Observed:** `t['notes'] = 'atomic temp+rename save; cross-process lock still ope…'`.
- **Why it works:** The notes capture what was done (atomic temp+rename save) AND what's still open (cross-process lock still open). A finding marked "done" with a remaining gap documented is honest — the fix landed, the limitation is recorded. Confirms `document-non-action`.
- **Maps to:** confirmation of `document-non-action`.

## Tick 45: 2026-07-02 16:09 (UTC-5) — monitor discipline

### P-170 — Monitor event covers both success AND failure outcomes
- **Observed:** `Monitor event: "Worker completes/fails a job or container restarts"`.
- **Why it works:** The monitor's event name covers three outcomes: worker completes a job, worker fails a job, or container restarts. A monitor that only watches for success misses the failure case — the wait hangs on a failure that the monitor never fires on. Naming both success and failure (plus the container-restart edge) ensures the monitor fires on the actual outcome whatever it is.
- **Maps to:** refine `event-driven-wait` — name monitor events to cover both success and failure.

### P-171 — Re-arm a new monitor immediately when the prior one ends
- **Observed:** `Monitor "Worker completes/fails a job or container restarts" stream ended` → immediately `Monitor(Deploy lands, then worker reaches a job outcome) started`.
- **Why it works:** When one monitor ends, Fable 5 re-arms a new one for the next expected event. The wait is chained — each monitor hands off to the next, so the gap between monitors is minimal.
- **Maps to:** refine `event-driven-wait` — chain monitors.

### P-172 — Monitor event names a compound/ordered condition
- **Observed:** `Monitor(Deploy lands, then worker reaches a job outcome)`.
- **Why it works:** The monitor's event is a compound, ordered condition: deploy lands AND THEN worker reaches a job outcome. The event name encodes the sequence, not just a single state.
- **Maps to:** refine `event-driven-wait` — monitor events can be compound/ordered.

## Tick 49: 2026-07-02 16:41 (UTC-5) — dry-run-by-default scripts

### P-173 — Package.json scripts paired with `:exec` variants; base = dry-run, `:exec` = execute
- **Observed:** Diff adds paired scripts: `deploy:railway` + `deploy:railway:exec`, `vercel:link-fleet` + `vercel:link-fleet:exec`, `vercel:env-fleet` + `vercel:env-fleet:exec`.
- **Why it works:** Each dangerous/deploy script has a dry-run form (the base name, the safe default) and an explicit `:exec` form (actually executes). The dry-run is the path of least resistance — you run `pnpm deploy:railway` to preview, and must explicitly opt into `pnpm deploy:railway:exec` to execute. This is a guard convention in the scripts themselves: the safe action is the default, the destructive action requires an explicit flag.
- **Maps to:** refine `respect-the-guard` — the `:exec` variant pattern.

## Tick 52: 2026-07-02 17:05 (UTC-5) — failure-state completeness

### P-174 — On exception, finish the run as "failed" AND mark the job failed
- **Observed:** `except Exception as exc: log.exception("job %s failed", job_id); if run is not None: run.finish("failed"); jobs.fail_job(job_id, workspace_id, str(exc))`.
- **Why it works:** On a job exception, Fable 5 finishes the telemetry run as "failed" AND marks the job row failed. Failure state is written to *every* tracker that owns a view of the job — the telemetry run and the job table — not just one. A failure that marks the job but leaves the telemetry run "running" produces a stuck run; a failure that finishes the run but leaves the job "in_progress" produces a stuck job. Both must be updated.
- **Maps to:** refine `background-failure-triage` — failure-state completeness.

### P-175 — Job outcome logged with the key facts
- **Observed:** `log.info("job %s done model=%s gates=%s", job_id, result.model_version, gates_passed)`.
- **Why it works:** The job-done log line includes the three facts that make the outcome interpretable: job_id, model_version, gates_passed. A log line with just "job done" is uninformative; with the model version and gate result, the log is auditable and the outcome is checkable from the log alone.
- **Maps to:** confirmation of `validate-gate` + `cost-transparency` (log outcomes with key facts).

### P-176 — New monitor armed for the next compound event
- **Observed:** `Monitor(Telemetry deploy lands; training progress/completion visible)`.
- **Why it works:** The previous monitor ended and a new one is armed for the next compound event (telemetry deploy lands AND training progress/completion visible). Confirms P-171 (chain monitors) + P-172 (compound events).
- **Maps to:** confirmation of `event-driven-wait`.

## Tick 55: 2026-07-02 17:30 (UTC-5) — input validation as a guard

### P-177 — Bounded input limits as a DoS guard
- **Observed:** `if not isinstance(inputs, list) or len(inputs) > EMBED_MAX_INPUTS: raise HTTPException(400, detail=f"inputs must be a list of at most {EMBED_MAX_INPUTS} texts")`, then `body["inputs"] = [str(t)[:EMBED_MAX_CHARS] for t in inputs]`.
- **Why it works:** Input validation with bounded limits (max inputs, max chars per input) is a DoS guard at the API boundary — it complements the encoder cache (P-165) by preventing huge batches from reaching it. The 400 error is clear about the limit. This is `respect-the-guard` at the input layer.
- **Maps to:** refine `respect-the-guard` — input limits as a guard.

### P-178 — Named constants for the limits
- **Observed:** `EMBED_MAX_INPUTS`, `EMBED_MAX_CHARS` — named constants, not magic numbers.
- **Why it works:** Limits are named constants so they're grep-able and tunable in one place. Confirms P-013 (named constants).
- **Maps to:** confirmation of P-013.

### P-179 — Truncate, don't reject, for length limits
- **Observed:** `[str(t)[:EMBED_MAX_CHARS] for t in inputs]` — truncates each input to max chars rather than rejecting.
- **Why it works:** For length limits on still-usable input, truncate rather than reject — the input is bounded and the request succeeds. Rejecting a 5001-char input is harsher than truncating to 5000. Softer validation that still bounds the resource.
- **Maps to:** note (validation policy).

### P-180 — Targeted test run for the changed packages
- **Observed:** `uv run --no-sync python -m pytest services/core-api/tests packages/agentkit/tests -q 2>&1 | Select-Object -Last 1`.
- **Why it works:** Confirms `affected-tests` (P-009) — only the touched package test dirs, `--no-sync`, `-q`, tailed to last 1 line.
- **Maps to:** confirmation of `affected-tests`.

## Tick 56: 2026-07-02 17:41 (UTC-5) — lead coordination + gate fails closed

### P-181 — Lane-based task delegation across agents
- **Observed:** "OpenCode — RAG-502 and RAG-505: bucket-1, scriptable, its lane exactly. Claude (this loop) — LOOP-001 plus continued shepherding of the training pipeline."
- **Why it works:** As lead, Fable 5 delegates tasks to specific agents based on their lane (OpenCode gets RAG scriptable tasks; Claude keeps the training loop). Confirms `lane-discipline` at the lead level.
- **Maps to:** confirmation of `lane-discipline`.

### P-182 — Deterministic until key, then judgment activates
- **Observed:** "they stay deterministic until you provide GLM_API_KEY, at which point the judgment layer (queue triage, source curation, operator digests) activates on the cadences in config/agent_teams.json."
- **Why it works:** Confirms `deterministic-core-llm-judgment` (P-070) — the teams stay deterministic until the key, then the judgment layer activates.
- **Maps to:** confirmation of `deterministic-core-llm-judgment`.

### P-183 — Parallel agent fixed the thin-corpus gate limit
- **Observed:** "REV-905 was fixed by Cursor in parallel while I was mid-review — the eval gate now fails closed on thin corpora with an explicit sufficientEvalPairs gate."
- **Why it works:** The thin-corpus gate limit Fable 5 flagged in P-146 was structurally fixed by Cursor in parallel — the gate now fails closed on thin corpora. The cross-agent review → fix loop closes the concern Fable 5 raised.
- **Maps to:** confirmation of `correct-assumptions` + the multi-agent review-fix loop.

### P-184 — Gate fails closed on thin corpora
- **Observed:** "the eval gate now fails closed on thin corpora with an explicit sufficientEvalPairs gate."
- **Why it works:** The thin-corpus gate now fails closed (rejects) rather than silently passing. This is the structural fix for P-146 — instead of "treat gates passed on thin corpora as unproven" (a caution), the gate itself fails closed (a structural enforcement). The caution became a gate.
- **Maps to:** refine `validate-gate` — the gate fails closed on thin corpora.

### P-185 — Scoreboard tracks findings across agents with ownership
- **Observed:** "REV-901 through REV-911 are all closed except REV-904 (Cursor's lane)."
- **Why it works:** A scoreboard of review findings with closure status + which agent's lane owns the open one. Confirms `progress-board` at the cross-agent finding level.
- **Maps to:** confirmation of `progress-board`.

### P-186 — Batch non-urgent deploys; don't kill a running job for them
- **Observed:** "The REV-907/911 code deploys to Railway batched with the next restart window — the research training job is mid-flight again and I won't kill it for a non-urgent hardening deploy."
- **Why it works:** A non-urgent hardening deploy is batched into the next restart window rather than killing a running training job. Killing a mid-flight training job for a non-urgent deploy wastes the training progress; batching waits for a natural restart window. The urgency of the deploy must exceed the cost of interrupting the running job.
- **Maps to:** refine `background-failure-triage` — don't kill a running job for a non-urgent deploy.

### P-187 — Hill-climb loop stays armed on the training monitor
- **Observed:** "The hill-climb loop stays armed on the training monitor; next event or heartbeat resumes it."
- **Why it works:** The loop is armed on the monitor — event-driven resumption. Confirms `event-driven-wait` + `auto-mode`.
- **Maps to:** confirmation of `event-driven-wait`.

### P-164 — State the corpus size and source so the gate result is interpretable
- **Observed:** "200 pairs from the real arXiv corpus".
- **Why it works:** The corpus size (200 pairs) and source (real arXiv corpus) are stated — directly addressing the thin-corpus gate-limit concern from P-146 (200 pairs is not thin). The gate result is only interpretable with the corpus size known. Fable 5 applying its own P-146 lesson.
- **Maps to:** refine `validate-gate` — state the corpus size/source with the gate result.

### P-188 - Loop iteration after a gap opens with a quick state check, THEN proceeds
- **Observed:** "Loop iteration after the overnight gap — quick state check, then DR-107: the 5-SME launch review via sub-agent." Fable 5 resumed a /loop after ~6h and the FIRST thing it did was a quick state check before moving to the task.
- **Why it works:** Recon isn't only for session start — any loop iteration that resumes after a meaningful gap (overnight, long wait) re-orients first. The world changed while you were away; acting on a stale mental model wastes a turn. The state check is cheap and bounds the blast radius of a stale assumption.
- **Maps to:** refine session-orient — apply the recon sequence on loop resumption after a gap, not only at session start.

### P-189 - /loop continuation prompt restates the goal in natural language
- **Observed:** "/loop continue the hill-climb toward the goal: build out the full org and all the associated sites, one task at a time." The continuation prompt isn't just "continue" — it carries the goal ("build out the full org...") and the cadence ("one task at a time").
- **Why it works:** A bare "continue" leaves the agent to infer what to continue toward. Restating the goal each iteration keeps the agent aimed at the outcome, not just the motion. "One task at a time" encodes the cadence (no batching creep). The goal-in-prompt survives context pressure better than a goal-in-prior-turn.
- **Maps to:** refine progress-board / hillclimb-loop — the continuation prompt restates the goal + cadence, not just "continue".

### P-190 - Background subagent completion reports elapsed time + autonomous push when classifier-approved
- **Observed:** "Agent 'DR-107 refinery launch review' finished · 21m 22s" then "Pushed to main, ran 2 shell commands". The backgrounded SME subagent completed with its elapsed time reported, AND it autonomously pushed to main + ran shell commands — all under the auto-mode classifier that approved its launch.
- **Why it works:** Two things in one. (1) Reporting the subagent's elapsed time on completion extends cost-transparency to the subagent lifecycle (not just the parent's turns). (2) The subagent has real write+push authority — the guardrail isn't deny-by-default, it's classifier-gated. The auto-mode classifier approved the agent at launch, so it can push to main without a second confirmation. This is the agent-guardrails design: permissive within the classifier's scope, bounded by the allowlist.
- **Maps to:** refine cost-transparency (report subagent elapsed time on completion) and gent-guardrails (classifier approval grants push authority — guardrails are classifier-gated, not deny-by-default).

### P-191 - Agent loop runs with Remote Control enabled — operator can monitor/intervene from mobile
- **Observed:** The status bar shows "Remote Control · /rc active · bluehenre · main" and "Continue coding in the Claude mobile app or https://claude.ai/code/session_...". Fable 5's /loop runs with Remote Control active, exposing the session via a shareable URL + the Claude mobile app.
- **Why it works:** A long-running autonomous loop (hill-climb, overnight) is more robust when the operator can check in / intervene from a phone without being at the terminal. /rc active turns the local session into a remotely observable one. This fits the fleet-ops model: the agent runs unattended, the operator supervises from anywhere. The loop doesn't need the operator present to keep working, but the operator is never blind.
- **Maps to:** no new skill — observation that the autonomous loop is remote-controllable. Reinforces the fleet-ops / unattended-agent pattern: run the loop with remote oversight, not local-only.

### P-192 - The iteration after a build commit verifies the thing is actually live on the real domain
- **Observed:** "Loop iteration — verify the ops console live, then a hardening note from the reviews." After writing apps/hq/app/ops/page.tsx and pushing to main, the NEXT loop iteration's first task was to verify the ops console is live on jcamd.com. "Ops console verified live on jcamd.com."
- **Why it works:** A push to main isn't proof the page renders on the real domain. The loop naturally sequences build → verify-live → harden, making the live verification the first act of the next iteration. This closes the gap between "committed" and "served" without a separate smoke step — the loop's cadence absorbs it.
- **Maps to:** refine post-deploy-smoke — verify live on the real domain as the first act of the iteration after a build commit, not a separate deferred smoke step.

### P-193 - Close review notes with structural fixes, not just acknowledgments
- **Observed:** "Closing the review's stats-query note with a micro-cache." The DR-107 SME review flagged a stats-query issue; Fable 5 didn't just track the note — it closed it with a micro-cache (a structural fix that addresses the root cause, not the symptom).
- **Why it works:** A review finding isn't "done" when it's noted; it's done when the structural fix lands. "Closing the note with a micro-cache" means the fix materialized in the same iteration. Tracking without fixing leaves the issue live. The micro-cache is the structural cause-fix (query was slow → cache the result), not a retry or a workaround.
- **Maps to:** refine close-the-loop and erify-subagent-output — review findings get structural fixes in-loop, not just tracking entries. A note is closed by the fix, not by the acknowledgment.

### P-194 - Every loop tick re-orients on last deploy state + queue actionability, not just after a gap
- **Observed:** "Loop tick — checking the last deploy and what remains actionable in the queue." This is a regular loop tick (not after a gap — the previous tick was 12:35pm, ~30m ago), and Fable 5 still opens by checking (1) the last deploy state and (2) what remains actionable in the queue before acting.
- **Why it works:** P-188 established recon on resumption after a gap. This extends it to EVERY tick: the loop re-orients on "did the last deploy land?" + "what's the next actionable task?" before doing anything. The deploy check catches a failed/rolled-back deploy before building on top of it; the queue check prevents working a stale task. Cheap, and it makes every iteration's first move evidence-based rather than habitual.
- **Maps to:** refine session-orient (P-188) — loop-tick recon isn't only for post-gap resumption; every tick checks last deploy state + queue actionability. Reinforces post-deploy-smoke (deploy state is part of recon, not a separate phase).

### P-195 - Experiment discard states the metric alongside the decision
- **Observed:** "AR-308: DISCARD (knn_full 0.8056)." The discard decision and the evidence metric are in one line — not just "AR-308 discarded" but "DISCARD (knn_full 0.8056)".
- **Why it works:** A discard without the metric is an unverifiable claim. Stating the metric (0.8056) with the decision makes the threshold auditable — anyone can see WHY it was discarded and compare against the champion. The decision and the evidence travel together.
- **Maps to:** refine alidate-gate — experiment discard/keep decisions state the metric with the decision, not just the verdict.

### P-196 - Set the baseline to the current champion before running the next experiment
- **Observed:** Before running AR-310: cp data/autoresearch/champion_train.py scripts/autoresearch_train.py && uv run --no-sync python scripts/autoresearch_run.py claude. Fable 5 copies the champion train script to the working script, then runs the next experiment.
- **Why it works:** Each experiment must start from the current champion, not a stale or arbitrary baseline. Copying champion_train.py → autoresearch_train.py ensures the next experiment's baseline is the best-known configuration. Without this, an experiment could "win" against a weak baseline and falsely become the champion. The champion-copy is the experiment-hygiene guard.
- **Maps to:** experiment-hygiene pattern (autoresearch delegate) — baseline = current champion, always. Refines the autoresearch loop's integrity.

### P-197 - Claim the next task in the queue before starting the work
- **Observed:** uv run --no-sync python scripts/pick_task.py claim AR-310 --agent claude — Fable 5 claims AR-310 via the queue before running the experiment.
- **Why it works:** Claiming before work prevents two agents from duplicating the same experiment. The claim is the lane-discipline guard: the task is in_progress for claude, so no other agent picks it. This is already in the fleet-team rules but observed here as an in-loop action.
- **Maps to:** lane-discipline (P-020) — claim before work, observed as an explicit in-loop shell command.

### P-198 - Background experiment failure is reported explicitly, not silently swallowed
- **Observed:** "Background command 'Run AR-306 experiment (autoresearch framework)' failed with exit code 1." The failed background experiment is surfaced with its name + exit code, and the loop continues to the next item (AR-308, AR-309).
- **Why it works:** A background failure doesn't abort the foreground lane (P-019), but it IS reported — name + exit code — so the failure is visible and can be triaged. Silently swallowing it would hide a systemic issue; aborting on it would stall the queue. Report + continue is the middle path.
- **Maps to:** ackground-failure-triage (P-019) — background failure is reported (name + exit code) and the lane continues; confirmed in the experiment context.

### P-199 - Phantom/stale baseline is confirmed with a null run before trusting experiment results
- **Observed:** "AR-310 done: baseline phantom confirmed" — commit message: "baseline 1.465 confirmed stale via null run (true baseline 1.411)". Fable 5 didn't accept the displayed champion metric; it ran a null/control run to establish the true baseline before concluding AR-310.
- **Why it works:** A champion file can drift from what the framework actually measures ("phantom baseline"). Comparing experiments against a phantom baseline produces false DISCARD/KEEP decisions. The null run is cheap evidence that re-anchors the baseline before the verdict. Diagnose the measurement, not just the experiment.
- **Maps to:** refine diagnose-before-retry + alidate-gate — when baseline looks suspect, confirm with a null/control run before accepting experiment outcomes.

### P-200 - Experiment close-out updates report + queue + TASKS.md + push in one chain
- **Observed:** Single close-out line chain: "rnd report resolution appended → done AR-310 → Wrote TASKS.md → 5475d22..bcf91ef main -> main". Four trackers updated in one pass; push reports the commit range.
- **Why it works:** Failure-state completeness (P-065) applied to success: the experiment report, work queue, human summary (TASKS.md), and git remote all reflect the same outcome. The commit range in the push line makes "what shipped" checkable without opening git log.
- **Maps to:** refine close-the-loop + ackground-failure-triage (failure-state completeness) — success close-out hits every tracker + names the SHA range.

### P-201 - Loop tick polls named blockers before picking work (Docker, domain, keys)
- **Observed:** "Loop tick — checking whether any gate cleared (Docker for RT-401, domain, keys) and taking the pulse." One compound shell: docker info && echo DOCKER UP || echo docker down; curl -s -o /dev/null -w "data.bhenre.com: %{http_code}" https://data.bhenre.com; python -c "print('GLM key:', bool(os.environ.get('GLM_API_KEY')))"; plus git log.
- **Why it works:** Extends P-194 (deploy + queue) with **blocker-aware** recon: each check maps to a known blocked task (RT-401 ↔ Docker, refinery ↔ domain, agent teams ↔ GLM key). The loop doesn't blindly pick the next queue item — it first asks whether any blocker cleared since last tick. Cheap compound command, parseable labels.
- **Maps to:** refine session-orient + ollow-procedure — loop-tick recon includes named blocker probes tied to work_queue blockers, not just generic git status.

### P-202 - Compound recon uses labeled echo/curl -w output for machine-readable pulse
- **Observed:** Recon chains semicolon-separated checks with explicit labels (DOCKER UP / docker down, data.bhenre.com: %{http_code}, GLM key: True/False) in one shell invocation (~39s).
- **Why it works:** Labels make the pulse scannable in terminal output and agent context without parsing raw exit codes. curl -w "%{http_code}" gives HTTP status without body noise. One round-trip beats three separate tool calls.
- **Maps to:** refine session-orient — compound blocker pulse with labeled outputs in a single shell command.

### P-203 - Read existing queue task shape and append location before adding new items
- **Observed:** Before appending a new BD task: "Let me look at how BD tasks are structured and the end of the task list where I'll append." Reads one file (work_queue.json or TASKS.md) to match conventions.
- **Why it works:** New queue entries inherit the same fields, IDs, and dependency style as neighbors. Appending at the documented end avoids merge conflicts and orphan tasks. Read-before-write on shared config beats guessing schema from memory.
- **Maps to:** refine match-conventions + metadata-align — before editing work_queue.json, read existing task rows and the append point.

### P-204 - Spin up a named git worktree before spec-scoped implementation
- **Observed:** Creating worktree(spec-0021-cert-driven-research) → branch worktree-spec-0021-cert-driven-research at .claude/worktrees/spec-0021-cert-driven-research. Main stays untouched while spec work begins.
- **Why it works:** Isolates a spec-sized change without stashing or polluting main. Worktree name mirrors spec ID so context survives session gaps. Enables parallel lanes (loop on main, feature in worktree) without branch checkout churn.
- **Maps to:** refine conservative-rename / lane-discipline — spec-bound work gets its own worktree + branch before first edit.

### P-205 - When gh blocks PR creation, confirm repo identity and offer link + auth unblock
- **Observed:** PR step failed (no gh auth, API route denied). Fable 5 did not assume the remote: asked whether jcdavis131/henington-homes is the intended GitHub home. Offered two paths: open the draft PR from the posted GitHub link, or run gh auth login --web -h github.com so the agent can create it.
- **Why it works:** Monorepo codename (bluehenre) often differs from GitHub repo slug (henington-homes). Confirming remote identity prevents PRs against the wrong repo. Dual unblock (manual link now vs auth for automation later) matches P-032 but in the PR gate context — the user can ship without blocking on CLI setup.
- **Maps to:** refine agent-guardrails + use-available-integrations — PR creation failure → confirm remote, post link, give exact auth command.

### P-206 - Spec close-out recap when automated PR step is deferred
- **Observed:** After Spec 0021 + BD-703 committed and pushed: ※ recap: Spec 0021 (cert-driven research loop, 90-day customer-driven policy) plus BD-703 task are committed and pushed. To open the draft PR, either click the GitHub link I posted or run gh auth login…
- **Why it works:** Push succeeded but PR automation failed — recap bridges the gap: names spec + policy headline, queue task ID, confirms push, states the one blocked next step with both unblock paths. Operator can act without re-reading the whole session.
- **Maps to:** refine recap-on-long-session + close-the-loop — success close-out recap when the final gate (PR) needs human or auth.

### P-207 - Live verification asserts build stamp and data cardinality, not just reachability
- **Observed:** After deploy monitor ended: live index reads "Built 2026-07-03 19:36 UTC from 6 catalog rows" with the measured dataset table beneath it — not merely "site returns 200."
- **Why it works:** Extends P-192 (verify on real domain): the proof includes **what** was built (UTC stamp), **how much** data (6 catalog rows), and **structure** (table present). A stale deploy or empty catalog can still return 200; content assertions catch that.
- **Maps to:** refine post-deploy-smoke — after push, read page text for build stamp + row count + expected UI structure.

### P-208 - Milestone close-out names the full pipeline loop in one sentence, then pushes
- **Observed:** Before push: "Auto-generation → structured wiki → labeled self-refinement (key-gated) is the full loop you asked for. Recording the milestone: Pushed to main."
- **Why it works:** The arrow-chain restates the deliverable as an end-to-end loop (not a file list), confirms it matches operator intent ("you asked for"), then records the milestone with a single push line. Close-out is narrative + artifact, not just git output.
- **Maps to:** refine close-the-loop + progress-board — milestone push preceded by one-sentence pipeline summary tied to original goal.

### P-209 - Platform wakeup banner timestamps loop resume after a gap
- **Observed:** Claude resuming /loop wakeup (Jul 3 3:08pm) before the operator's /loop continue… and the agent's gate check.
- **Why it works:** The banner gives a wall-clock anchor for "how long since last tick" without parsing git or queue state. Pairs with P-188 (recon after gap): the timestamp signals that recon is warranted even when the user immediately sends continue.
- **Maps to:** refine session-orient + progress-board — treat platform wakeup timestamps as loop-gap markers.

### P-210 - Self-update failure when binary in use is reported with fix, loop continues
- **Observed:** After productive work (Pushed to main, ran 2 shell commands): Auto-update failed: claude.exe in use (close other Claude Code sessions, including VS…). Update did not abort the hill-climb loop.
- **Why it works:** Environmental failures (IDE holding the binary) differ from task failures. Surfacing the error + exact remediation (close other Claude sessions) lets the operator fix it later without losing loop momentum. Work shipped; update is deferred, not silent.
- **Maps to:** refine silent-op-recovery + agent-guardrails — report self-update/env blockers with actionable fix; don't treat as task failure.

### P-211 - Partial-delivery task notes use HALF SHIPPED / REMAINING / Operator gate
- **Observed:** MON-001 claim update via inline Python: notes = METERING HALF SHIPPED: usage_events (mig 011), best-effort recording on search/embed/diagnose… REMAINING: Stripe metered subscription + webhook reconciliation — needs STRIPE_SECRET_KEY (Operator gate).
- **Why it works:** Extends P-169 (fix + remaining gap): a structured template for monetization work — what landed (migration + API hooks + read endpoints), what's deferred (Stripe), and who unblocks it (Operator gate). The next agent doesn't re-implement shipped pieces or miss the external dependency.
- **Maps to:** refine document-non-action + close-the-loop — in_progress notes with HALF SHIPPED / REMAINING / gate owner.

### P-212 - Usage metering is best-effort on success only; never fails the API request
- **Observed:** _record_usage called after successful search/embed/diagnose paths in core-api; task notes explicitly: "never fails requests, under-bills on error by design."
- **Why it works:** Billing instrumentation must not become an availability risk. Recording only after success + swallowing metering errors trades perfect billing accuracy for request reliability — under-billing on failure is the accepted bias. Matches enterprise API expectations: revenue tracking is secondary to serving the call.
- **Maps to:** refine respect-the-guard + policy-as-config — meter on success; metering errors must not surface as 5xx to tenants.

### P-213 - Loop status page: redeploy same URL each check-in; favicon as operator heartbeat
- **Observed:** "The deal going forward: at each loop check-in I redeploy this page with fresh state — same URL, same robot, new report. Keep the tab pinned; the 🤖 favicon is your loop's heartbeat."
- **Why it works:** A stable URL + redeploy-on-tick gives operators a zero-navigation pulse check. The favicon change signals fresh laps without opening devtools or reading terminal scrollback. Same artifact, new content — fits unattended /rc loops where the operator glances from a pinned tab.
- **Maps to:** refine progress-board + post-deploy-smoke — loop check-in includes redeploy of a human-facing status page at a fixed URL.

### P-214 - Loop feed baked at deploy time because static artifacts can't call the API
- **Observed:** "the feed is baked at deploy time since artifacts can't call the API — which conveniently means the robot only ever reports what actually happened."
- **Why it works:** Static deploy constraints (no client-side API on Vercel artifact) force honesty: the report reflects committed/deployed facts, not live polling or speculative state. The limitation becomes integrity — LOOPBOT can't hallucinate in-flight work. Pairs with P-207 (content assertions on live pages).
- **Maps to:** refine close-the-loop + validate-gate — status UI generated from build/deploy artifacts, not live API calls.

### P-215 - Deploy monitor named for the specific API surface under verification
- **Observed:** After MON-001 metering work: Monitor "Usage view live after grants" stream ended → then artifact publish. Monitor event names the endpoint family (usage view) and precondition (grants/migration landed).
- **Why it works:** Extends P-147/P-170: monitor labels tie wait events to a **feature gate** (usage readable after DB grants), not generic "deploy done." When the stream ends, the agent knows which verification succeeded before closing out.
- **Maps to:** refine event-driven-wait + post-deploy-smoke — name monitors after the API/view being proven live.

### P-216 - Loop status UI shipped first as Claude artifact, fleet link deferred
- **Observed:** Artifact(.../loopbot.html) published · https://claude.ai/code/artifact/df585a3c-… after usage monitor ended. Operator's hq cockpit link request still pending in the prompt.
- **Why it works:** Delivers LOOPBOT immediately on a shareable artifact URL while fleet integration (hq cockpit nav) waits for the next turn. Prototype-on-artifact → integrate-in-monorepo is a two-step ship: operator gets the heartbeat page now, wiring comes after.
- **Maps to:** refine close-the-loop + progress-board — ship loop status as artifact first; cockpit/deep-link integration as follow-up task.

### P-217 - Certification scorecard is honest eval; payment stays pending-gate until Stripe
- **Observed:** certify.py (Spec 0021 P4): "Payment is recorded as pending-gate until Stripe/Medusa attach (Operator gate) — the scorecard itself is honest and free of payment state." Submit returns "paymentStatus": "pending-gate" while worker grades the endpoint.
- **Why it works:** Separates **measurement** (did the customer's endpoint pass gates?) from **monetization** (did they pay?). The cert pipeline can ship and run without Stripe keys; payment state is explicit and deferred, not faked or omitted. Operators know what's blocked vs what's proven.
- **Maps to:** refine validate-gate + document-non-action — eval artifacts never conflate with payment state; label pending-gate until Operator attaches billing.

### P-218 - Customer endpoint cert uses the same metric code that grades internal models
- **Observed:** un_cert_job embeds via customer's POST {"texts": [...]} -> {"vectors": ...}, then etrieval_scores + ndcg_at_k + compute_gates — scorecard includes "metricParity": "same retrieval_scores + ndcg_at_k that grade our own models".
- **Why it works:** External cert is comparable to internal eval because it's the **same harness**, not a simplified proxy. Contract violations fail loudly (ectors missing or wrong length). Fixed catalog slice (MAX_PAIRS from largest public dataset) keeps runs reproducible. No-human-in-the-loop half of Spec 0021 is credible only with metric parity stated in the artifact.
- **Maps to:** refine validate-gate + follow-procedure — external certification reuses eval-harness gates; document parity in the scorecard.

### P-219 - Lap close-out separates shipped pipeline from external prerequisites
- **Observed:** After cert P4 work: "untouched at pending-gate. The pipeline is real; it just needs a real embedding endpoint on the other side and, eventually, your Stripe key."
- **Why it works:** Close-out doesn't oversell or undersell — code path exists (pipeline is real), payment stays pending-gate (P-217), and two explicit externals are named (customer endpoint to grade, Operator Stripe key). Operator knows exactly what's left without re-reading the diff.
- **Maps to:** refine close-the-loop + document-non-action — lap summary lists what's shipped vs what's gated/external.

### P-220 - LOOPBOT refresh is the lap close-out ritual
- **Observed:** "Refreshing LOOPBOT and closing the lap:" → shell command → Artifact(.../loopbot.html) published (same artifact URL, fresh content).
- **Why it works:** Extends P-213: each hill-climb lap ends with a LOOPBOT redeploy so the pinned-tab heartbeat reflects the lap just completed. Close-out = narrative + artifact refresh, not narrative alone.
- **Maps to:** refine progress-board + close-the-loop — end every autonomous lap with LOOPBOT refresh before sleeping.

### P-221 - Surgical multi-line Python patch via utf8 heredoc old-block replace
- **Observed:** python -X utf8 - <<'EOF' reads services/core-api/app/services/data.py, sets old = ''' pairs = [] … random.randint …''', replaces in file — same technique used earlier on main.py search metering.
- **Why it works:** Targets an exact logical block (pair-generation loop) without rewriting the whole module or relying on line-number edits. -X utf8 + encoding='utf-8' avoids Windows cp1252 corruption. Safer than sed for indented Python when the hunk spans many lines.
- **Maps to:** refine match-conventions — multi-line service edits via heredoc string-replace, not whole-file regenerate.

### P-222 - Replace random negatives with hard negatives when eval gates are trivially easy
- **Observed:** RAG-503 / Spec 0009: synth_pairs now mines negatives via token-Jaccard — "random negatives made the eval's ndcg gate trivially easy." Pairs carry "negativeMining": "hard-jaccard-v1". Commit: eat(pairs): RAG-503 — hard negative mining in the hill-climb pair builder.
- **Why it works:** Easy negatives inflate retrieval metrics without teaching discrimination. Hard negatives (most lexically similar non-positive chunk) stress the metric honestly. Deterministic token-Jaccard keeps runs reproducible without new dependencies. The mining version in pair metadata makes ablations traceable.
- **Maps to:** refine validate-gate + follow-procedure — when gates pass for the wrong reason, fix the data generator and label the mining strategy in artifacts.

### P-223 - Operator can force an immediate loop iteration; agent runs deploy check first
- **Observed:** User: un a loop now → Fable 5: "Running an iteration now — deploy check, then the next actionable item:" → shell command (in progress).
- **Why it works:** On-demand loop bypasses the sleep/wakeup cadence without re-arming /loop config. The agent still follows the standard tick sequence (deploy/gate check before queue pick) — forced iteration is faster scheduling, not a shortcut around recon.
- **Maps to:** refine progress-board + session-orient — honor "run loop now" with deploy check → next actionable item.

### P-224 - Commercial panel scorecard: N models, one slice, one metric code, provenance per row
- **Observed:** BD-702 shipped: eat(bd): BD-702 — commercial panel scorecard (5 models, one slice, one metric code). Scorecard at content/fleet/bd/scorecards/dumbmodel/ — five models, identical 32-pair slice, same script (aseline_retrieval_eval.py). Each exam row: model name, ndcg10, effectiveRank, provenance. Notes state comparative outcome honestly (bge leads ndcg; ours ties e5/gte with highest ER in that group).
- **Why it works:** Public baseline proof requires **comparability** — same slice, same metric code, provenance labeled per model (prod vs local). The narrative in notes interprets ties and tradeoffs without cherry-picking one number. Extends P-218 from single cert to multi-model commercial panel on dumbmodel.
- **Maps to:** refine validate-gate + close-the-loop — BD scorecards bundle panel results, provenance, and honest comparative notes in one artifact.

### P-225 - Ablation holds the encoder constant to isolate the variable under test
- **Observed:** RAG-502 ag_chunk_ablation.py: ablates chunk sizes (128/256/512) with **raw MiniLM held constant** — "the ablation isolates CHUNKING, so the encoder must be constant." Same prod metric code + hard-jaccard negatives per arm.
- **Why it works:** Varying two knobs at once makes results uninterpretable. Fixing the encoder while sweeping chunk strategy isolates chunking effects. Protocol is documented per arm (chunk → pairs → embed → nDCG + ER). Results land in data/eval/chunk_ablation_results.json + EVIDENCE §3.11.
- **Maps to:** refine validate-gate + follow-procedure — ablation scripts declare what's held constant and reuse prod metric code.

### P-226 - EVIDENCE verdict: scoped conclusion, protocol caveat, explicit no-change-without-retest
- **Observed:** EVIDENCE §3.11 verdict: smaller chunks win on this corpus **but** "part of the 128-token advantage is construction" (adjacent-chunk positives get easier as chunks shrink); 512 ER collapse is "protocol-independent and actionable"; "No default change without a query-grounded re-test."
- **Why it works:** Narrative claims without caveats oversell ablations. Naming the confound (positive construction) and separating actionable signal (512 rank collapse) from scoped wins keeps prod defaults honest. The retest gate prevents knee-jerk config changes from one slice.
- **Maps to:** refine validate-gate + document-non-action — EVIDENCE rows include scoped verdict, protocol caveat, and change gate.

### P-227 - Loop tick runs cadence-due org maintenance before picking queue work
- **Observed:** /loop continue tick: "refreshing the org's daily team reports (their cadence is due) and taking the pulse" → chore: daily org team runs — updates knowledge/teams/*.md, daily OKF reports, knowledge/log.md, datasets index.
- **Why it works:** Hill-climb loops aren't only feature tasks — Spec 0014 agentic org teams have a daily cadence. The loop checks what's **due by schedule** (team reports) alongside deploy/gate pulse. Org hygiene ships as deterministic chores without waiting for a explicit queue ID.
- **Maps to:** refine follow-procedure + progress-board — loop ticks include cadence-due org team report refresh.

### P-228 - Daily org run commit separates deterministic duties from Operator-gated layer
- **Observed:** Commit message: daily org team runs (deterministic duties; GLM layer awaits key) — team OKF reports and harvest listings land; GLM-powered layer explicitly deferred pending GLM_API_KEY.
- **Why it works:** Same HALF SHIPPED pattern (P-211) applied to org ops: what ran without keys is committed; what's blocked names the gate. Prevents assuming the full agent-team stack is live when only deterministic scripts ran.
- **Maps to:** refine document-non-action + lane-discipline — org-run commits label deterministic vs key-gated portions.

### P-229 - LOOPBOT day-arc feed narrates shipped themes, not just task IDs
- **Observed:** Lap close-out lists the full day's arc in prose: "5-model panel scorecard… hard-negative mining… chunk-ablation finding… certification queue's honest-failure proof… verified metering… daily team runs that turned the evidence ledger into a dataset."
- **Why it works:** Extends P-220/P-213: LOOPBOT content reads as a **story of what moved**, linking tasks into one operator-visible arc. Task IDs live in git/queue; the feed answers "what did the org accomplish today?"
- **Maps to:** refine progress-board + recap-on-long-session — LOOPBOT lap entries summarize thematic progress across multiple queue items.

### P-230 - When queue drains to Operator gates, loop enters watch mode with explicit waiting-on-you card
- **Observed:** "Status pills read the truth: queue drained to your gates, loop in watch mode. The 'waiting on you' card is unchanged — domain click, GLM key, Stripe key, Docker restart — and everything else the org could do alone today, it did."
- **Why it works:** Autonomous loop knows when to stop picking work: only Operator-gated items remain. Watch mode + unchanged waiting card prevents fake progress. Naming all four gates (domain, GLM, Stripe, Docker) matches P-201 blocker polling. Operator message follows: ttach data.bhenre.com and set the GLM key.
- **Maps to:** refine agent-guardrails + close-the-loop — drain queue to gates → watch mode → list Operator actions explicitly.

### P-231 - Watch-mode loop ticks compress to pulse-only recon (no queue work)
- **Observed:** After P-230 watch mode: user sends /loop continue → Loop tick — pulse: → 1 shell command, ~31s, no push. Operator message (ttach data.bhenre.com and set the GLM key) still pending. HEAD unchanged at prior commit.
- **Why it works:** When the queue is drained to Operator gates, continuing the loop doesn't mean forcing fake tasks — a cheap pulse (blocker check, LOOPBOT refresh prep) keeps the cadence alive without churn. Distinguishes **watch-mode pulse** from **work-mode lap** (push + multi-shell).
- **Maps to:** refine progress-board + session-orient — in watch mode, loop ticks are pulse-only until a gate clears or Operator acts.

### P-232 - Domain-attach gate: recommended API path, manual dashboard fallback, hold option
- **Observed:** Operator asked to attach data.bhenre.com. Fable 5 presents four options: (1) **Recommended** — agent runs one API call + fleet registry swap from efinery-zeta.vercel.app to data.bhenre.com; (2) operator adds domain in Vercel dashboard, agent swaps registry when done; (3) different subdomain; (4) hold — stays on vercel.app alias. Notes "DNS is already on Vercel so it's instant and reversible."
- **Why it works:** Extends P-032/P-205 dual-unblock to domain ops: programmatic path is default, manual path for operators who prefer dashboard, hold preserves current state explicitly. Naming the registry consequence (leet.json swap everywhere) makes the attach more than a Vercel click — it's fleet-wide.
- **Maps to:** refine agent-guardrails + use-available-integrations — Operator gates get numbered options with Recommended, manual fallback, and hold.

### P-233 - Operator can request a structured unblock Q&A instead of one gate at a time
- **Observed:** After watch-mode pulse, user: sk me a series of questions to help unblock you → Fable 5 enters extended thinking ("Puzzling…") to prepare questions. Prior single-gate menu (domain attach P-232) superseded by batch-unblock request.
- **Why it works:** When multiple Operator gates stack (domain, GLM, Stripe, Docker — P-230), a question series clears them in one session instead of leaving menus unanswered. Operator explicitly opts into being polled; agent drives the sequence.
- **Maps to:** refine agent-guardrails + progress-board — honor "ask me questions to unblock" with a structured gate-clearing interview.

### P-234 - When Operator intent is already explicit, skip the Q&A and execute immediately
- **Observed:** User asked sk me a series of questions to help unblock you but had already said ttach data.bhenre.com. Fable 5: "Clear answers — executing immediately. Domain first (now explicitly approved):" → push without running the question series.
- **Why it works:** P-233's interview mode is optional — if prior messages already answer a gate, don't stall on formal Q&A. "Executing immediately" respects operator time and clears the gate that was blocking watch mode.
- **Maps to:** refine agent-guardrails + correct-assumptions — batch-unblock request + explicit prior approval → act, don't re-prompt.

### P-235 - Cleared Operator gate recorded in commit message, fleet registry, and spec notes
- **Observed:** eat(refinery): G1 cleared — data.bhenre.com live (Operator-approved attach) — leet.json domain → data.bhenre.com, notes: G1 cleared 2026-07-03: data.bhenre.com attached (Operator-approved); spec 0018 updated.
- **Why it works:** Gate clearance is traceable at three layers: git history (which gate, who approved), fleet registry (live domain), spec (design doc aligned). Next pulse can drop G1 from the waiting-on-you card without archaeology.
- **Maps to:** refine metadata-align + close-the-loop — Operator gate clears update fleet.json + commit message names gate ID + approval.

### P-236 - After a gate clears, loop tick polls specifically for keys landing
- **Observed:** Post-G1 (data.bhenre.com live): /loop continue → Loop tick — checking whether any keys landed: → 1 shell command (~36s). Prior pulse was generic (P-231); this tick names **keys** because domain gate cleared and GLM/Stripe remain.
- **Why it works:** Blocker recon adapts to what's left on the waiting-on-you card (P-230). After one Operator action, the next tick doesn't repeat full deploy check — it probes the remaining gates (env keys) so watch mode exits as soon as the operator sets them.
- **Maps to:** refine session-orient + P-201 — loop pulse narrows to uncleared gates after partial unblock.

### P-237 - Operator directs terminal agent to offload one-off execution tasks to Cursor
- **Observed:** User (queued): "Make sure you pass one-off smaller tasks and execution tasks for my cursor agent to help pick up and offload some of your work as needed." Fable 5 context on autoresearch operating-loop spec; simultaneously writing ~/.claude/scripts/open-pr.sh (in progress).
- **Why it works:** Fleet has lanes (Cursor = execution/sites/scripts, Claude = research/train). When the terminal agent hits execution-shaped or parallelizable work, queue it for Cursor instead of serializing everything in one session. Explicit operator instruction prevents lane hoarding and uses the shared work queue as the handoff surface.
- **Maps to:** refine lane-discipline + progress-board — terminal agent enqueues SITE-/INF-/cursor-lane one-offs for Cursor rather than doing all execution inline.

### P-238 - Worktree autoresearch arm seeds champion state from main before run
- **Observed:** AR-311 queued; from worktree: "checking whether I can run a hill-climb arm… delegate protocol and what state autoresearch_run.py needs" → mkdir -p data && cp -r …/bluehenre/data/autoresearch data/ → inspect champion_train.py.
- **Why it works:** Worktrees don't inherit uncommitted or gitignored run state. Copying data/autoresearch/ from main ensures the experiment starts from the current champion/baseline (extends P-196 champion-copy). Checking delegate protocol + run script prerequisites before launch avoids false DISCARD from empty/wrong cwd.
- **Maps to:** refine lane-discipline + diagnose-before-retry — worktree experiments seed autoresearch state from main and verify protocol before utoresearch_run.py.

### P-239 - Champion state sync from worktree avoids clobbering a mid-run main daemon
- **Observed:** After AR-311 KEEP in worktree: champion/best.json/last_run live in worktree's untracked data/autoresearch/. Close-out gives exact sync command to main but notes "I didn't touch the main checkout's copy to avoid clobbering a mid-run daemon." Winning script also committed as scripts/autoresearch_train.py in PR #1.
- **Why it works:** Blind copying champion state across checkouts can corrupt an active autoresearch daemon on main. Deferring sync + naming the three files (est.json, champion_train.py, last_run.json) lets the operator merge when safe. Committed train script is the durable artifact; untracked run state is ephemeral until synced.
- **Maps to:** refine lane-discipline + close-the-loop — worktree experiment close-out documents sync command and daemon-safe deferral.

### P-240 - Experiment KEEP does not imply BD promotion when eval gate still fails
- **Observed:** AR-311 result: "first cert-driven champion KEEP (robust 1.411→1.4216, knn_t8 +0.014), stale baseline retired per AR-310; **gate still fails so no BD promotion, calibration ruling needed**."
- **Why it works:** Separates **training win** (KEEP, metric delta) from **promotion eligibility** (gate pass). Reporting both prevents false "we shipped a champion to production" narratives when calibration/gate work remains. Extends P-199 (baseline honesty) to promotion honesty.
- **Maps to:** refine validate-gate + close-the-loop — KEEP close-out states gate status and whether BD promotion happened.

### P-241 - Research task opened from a real failing gate, not queue filler
- **Observed:** "AR-311 opened from a real failing gate" — experiment spawned because certification/gate actually failed, not because the queue needed an ID.
- **Why it works:** Cert-driven research loop (Spec 0021) ties new AR-* work to measured failures. The queue item is downstream of evidence, which keeps autoresearch aimed at real regressions.
- **Maps to:** refine follow-procedure + validate-gate — AR tasks originate from failing gates, not speculative backlog.

### P-242 - Silent path-depth misconfig emptied registry and 404'd routes — fix, rebuild, re-verify all routes
- **Observed:** Simulation Lab build: pps/sites/* three levels deep caused registry to "silently empty" and detail pages 404. Fixed → rebuilt → "all seven routes return 200 with live data."
- **Why it works:** Fleet SDK path assumptions fail quietly (empty registry, not a loud error). Close-out names the failure mode and proof (seven 200s with live data), not just "fixed routing." Extends P-192/P-207 live verification to multi-route sweep.
- **Maps to:** refine diagnose-before-retry + post-deploy-smoke — after site registry fixes, verify every route returns 200 with data.

### P-243 - Parallel feature work ships on its own branch to keep unrelated PR clean
- **Observed:** Simulation Lab close-out: "this is on its own branch, so PR #1 (spec 0021) stays clean" — draft **PR #2** opened for Spec 0013 / signals.bhenre.com while cert-driven research remains in PR #1.
- **Why it works:** Stacking unrelated features in one PR blocks review and merge. Branch-per-initiative lets Operator merge cert research independently of site fleet work. Names both PR numbers in close-out for traceability.
- **Maps to:** refine logical-commit-split + lane-discipline — one spec/site per branch/PR when another PR is in flight.

### P-244 - Ship UI structure for a gated feature; leave paywall integration as Cursor-queued task
- **Observed:** "MON-007 (Stripe paywall on reports) remains Cursor's queued task — the feed is structured for it (first report free fits the free-preview model)." Simulation Lab report feed shipped; Stripe paywall explicitly deferred to Cursor lane.
- **Why it works:** Extends P-237 offload: Fable 5 builds the honest fixture-pass feed + free-preview shape now; monetization wiring stays on the execution agent's queue. Close-out names the follow-on task ID so Cursor can claim MON-007 without re-discovery.
- **Maps to:** refine lane-discipline + progress-board — ship structural UI; enqueue/defer payment integration to Cursor with task ID named.

### P-245 - Local stack up triggers migration as the blocker-clearing step
- **Observed:** "Local stack is up — running the migration to fully clear the local blocker:" → one shell: docker ps --format … | head -3 then 
ode scripts/db-migrate.mjs | tail -3.
- **Why it works:** BLK-DOCKER unblock isn't done when containers start — schema must match code (especially after MON-001 mig 011, cert migrations, etc.). Confirming container names/status then running migrate is the minimal proof that local API/worker can proceed. Labeled compound command matches P-202.
- **Maps to:** refine follow-procedure + session-orient — when Docker gate clears, next action is docker ps + db migrate before picking RT-/local tasks.

### P-246 - Blocker cleared → immediately start the task that was waiting on it
- **Observed:** After P-245 migrate: recap states "RT-401 real-text bake-off is running now" — the task that was blocked on Docker (P-201 RT-401 ↔ Docker) starts as soon as local stack + migration complete. One shell still running (~9m).
- **Why it works:** Clearing a blocker without starting the unblocked work wastes the window. The agent chains docker+migrate → kick off RT-401 in the same lap rather than waiting for the next loop wakeup.
- **Maps to:** refine follow-procedure + event-driven-wait — gate clear immediately triggers the dependent long-running job.

### P-247 - Long-session recap names live state, in-flight job, and explicit EVIDENCE next step
- **Observed:** ※ recap: … all sites and the Data Refinery are live, with data.bhenre.com attached. The RT-401 real-text bake-off is running now, and next I record its verdict in EVIDENCE.
- **Why it works:** Extends P-031/P-206: recap isn't just "what shipped" — it states **what's running** (background bake-off) and **what happens when it finishes** (EVIDENCE row). Operator knows not to interrupt and where the result will land.
- **Maps to:** refine recap-on-long-session + close-the-loop — recap includes in-flight jobs + named artifact destination.

### P-248 - Long-running eval monitor names a quantitative progress threshold
- **Observed:** Monitor "RT-401 method results accumulate to 4" stream ended — monitor event tracks **count of method results** (4), not just "job done."
- **Why it works:** Extends P-170/P-172: bake-offs with multiple methods need mid-flight milestones. Naming the threshold (4 results) makes partial progress visible before the full RT-401 verdict lands in EVIDENCE (P-247).
- **Maps to:** refine event-driven-wait — long eval jobs use accumulation-threshold monitor names.

### P-249 - Monitor stream end ≠ job done: check processes, note buffering, re-arm
- **Observed:** After RT-401 monitor ended: "Still running (8 python processes; stdout block-buffered). Re-arming the completion monitor."
- **Why it works:** Stream end can fire on intermediate state or logging lag. Checking live process count prevents premature EVIDENCE write or queue close-out. Re-arming the **completion** monitor (not the accumulation one) chains waits correctly (P-171). Block-buffered stdout explains silent terminal — diagnostic note, not panic.
- **Maps to:** refine event-driven-wait + diagnose-before-retry — on monitor end, verify processes; re-arm if job still live.

### P-250 - Completion monitor for buffered jobs watches rows + write marker or crash
- **Observed:** Re-armed: Monitor(RT-401 true completion (rows + write marker or crash)) — timeout 3500s, classifier-approved. Prior note: stdout block-buffered (P-249).
- **Why it works:** Block-buffered Python won't flush progress to terminal — completion must be detected via **artifact signals** (result rows accumulated, explicit write marker file) or **crash**. Naming both success criteria and failure in the monitor event (P-170) avoids hanging on silent stdout. Long timeout (3500s) matches bake-off runtime class.
- **Maps to:** refine event-driven-wait + background-failure-triage — buffered long jobs: monitor on file/row markers + crash, not terminal output.

### P-251 - Fill-the-wait: ship parallel queue work while long-running monitor stays armed
- **Observed:** RT-401 completion monitor still running → Fable 5 pushed 777edc0 MON-005/008 monetization stack (~3m 26s, +110-line HF publish script among 39 files) without disarming the bake-off monitor.
- **Why it works:** Extends P-019 (background lane): a 3500s monitor means the foreground would idle for an hour+. Parallel shipping on entitlements/refinery/commerce uses wall time productively. Monitor count stays at 1 — no duplicate waiters on RT-401.
- **Maps to:** refine fill-the-wait + event-driven-wait — while a long eval monitor runs, pick independent queue items (different lane, no shared state conflict).

### P-252 - External publish scripts exit non-zero with explanation; never fake success
- **Observed:** publish_model_hf.py (MON-008): "Gate: requires HF_TOKEN (Operator). Without it this script explains and exits 2 — it never fakes a publish." Only gate-passing models publishable; model card carries measured numbers.
- **Why it works:** Publish operations are narrative-sensitive — a silent no-op or fake success would claim models shipped to HF when they didn't. Exit 2 + explanation matches P-212 (never fail the request) inverted for **batch/operator scripts**: fail loud, not quiet. Open-core flywheel tied to measured provenance on the card.
- **Maps to:** refine respect-the-guard + validate-gate — external publish CLI requires token; explain and exit 2; no fake publish.

### P-253 - Monitor event + row count interpreted against expected job phases; hold for write marker
- **Observed:** RT-401 completion monitor event fired at **5 rows** — Fable 5: "the SOTA panel phase adds entries beyond the 4 methods. Holding until the write marker confirms completion." Monitor stays armed.
- **Why it works:** Extends P-249/P-250: row count alone isn't completion when the protocol has **phases** (4 methods → SOTA panel adds more). Domain context prevents premature EVIDENCE close-out. Write marker remains the authoritative done signal for block-buffered jobs.
- **Maps to:** refine event-driven-wait + validate-gate — interpret monitor events with phase awareness; don't complete on partial row counts.

### P-254 - Primary completion monitor chains to a simpler terminal monitor
- **Observed:** RT-401 true completion (rows + write marker or crash) stream ended → re-armed Monitor(RT-401 final rows or process exit) (3000s, classifier-approved). Prior monitor was stricter (P-250); fallback monitor covers **final row flush** or **process exit** when the first wait ends ambiguously.
- **Why it works:** Extends P-171 monitor chaining: when the authoritative monitor fires without a write marker (P-253 hold), downgrade to a simpler terminal condition rather than declaring done or hanging forever. Process exit catches crash/completion; final rows catches last SOTA panel entries.
- **Maps to:** refine event-driven-wait — chain strict completion monitor → simpler final-rows-or-exit monitor.

### P-255 - Long eval close-out: monitor end → verdict in → EVIDENCE + queue + push
- **Observed:** Final monitor ended → "RT-401 complete — the full real-text verdict is in. Writing EVIDENCE and closing:" → 974970f esearch: RT-401 real-text bake-off — barlow wins, all trained beat zero-shot SOTA (EVIDENCE 3.12) — updates EVIDENCE.md, work_queue, methods.jsonl, TASKS.md (~1m).
- **Why it works:** Closes the arc from P-246/P-247: the job that started when Docker cleared finishes with **verdict → EVIDENCE section → queue status → push** in one lap. Commit message carries task ID, headline result, and EVIDENCE anchor (§3.12). Operator's pending "run loopbot with RT-401 results" can now consume this artifact.
- **Maps to:** refine close-the-loop + validate-gate — eval monitor completion triggers EVIDENCE write + queue close-out + push in one chain.

### P-256 - Bake-off winner chains to prod deploy monitor (gates + charter verification)
- **Observed:** After RT-401 barlow win: Monitor "Barlow retrain through gates and charter" ended → "Gates passed — verifying the charter deploy and the new model's measured numbers" → c35344 RT-403 barlow serving in prod (ER 28.06 record, gated, slice-caveat recorded).
- **Why it works:** Research verdict (P-255) isn't the end — the winning recipe gets a **named deploy monitor** covering eval gates AND charter (org deploy rules). Close-out verifies measured numbers on the serving model, not just training metrics. Slice-caveat in commit preserves RT-401 protocol honesty (P-226) at promotion time.
- **Maps to:** refine validate-gate + post-deploy-smoke — bake-off winner → retrain monitor (gates + charter) → prod verify with caveats recorded.

### P-257 - Post-deploy proof: same-slice commercial panel on hard negatives with prod model
- **Observed:** After RT-403 barlow prod deploy: 6d7205 — same-slice commercial panel on hard negatives; "deployed barlow model leads the entire panel." Updates EVIDENCE.md, aseline_results.json, esearch_prod_pairs_hard.json, research site ProductionCaseStudy.tsx.
- **Why it works:** Extends P-256/P-224: prod promotion isn't closed until the **serving model** is re-measured on the same honest slice (hard negatives, P-222) against the commercial panel. BD/research UI gets updated numbers from prod, not training-run artifacts. Closes the RT-401→RT-403 narrative with extrinsic proof.
- **Maps to:** refine validate-gate + post-deploy-smoke — after charter deploy, run same-slice panel on hard negatives and record in EVIDENCE + public case study.

### P-258 - LOOPBOT refresh is heredoc string-replace on baked HTML (timestamp + pills)
- **Observed:** Operator un loopbot with the RT-401 results → Fable 5 edits loopbot.html via python -X utf8 heredoc: replaces check-in timestamp (2026-07-04 ~00:05 → ~06:30 UTC) and status pill content before republish.
- **Why it works:** Extends P-220/P-214: LOOPBOT updates are **surgical replaces** on the baked artifact, not a full regenerate. Timestamp bump signals a new lap to the pinned-tab heartbeat (P-213). RT-401/barlow results land as pill/feed text replaces, keeping the same artifact URL.
- **Maps to:** refine progress-board + close-the-loop — honor "run loopbot with X results" via timestamp + content replaces on loopbot.html, then publish.

### P-259 - Operator-owed LOOPBOT runs before gate pulse in the loop tick
- **Observed:** Loop tick — LOOPBOT owes the Operator this lap, then the gate pulse: → artifact republished (~54s). Honors queued un loopbot with the RT-401 results before resuming blocker recon.
- **Why it works:** Watch-mode pulses (P-231) defer to **explicit operator debt** — if the operator asked for LOOPBOT with specific results (P-258), that ships first in the tick, then gate pulse resumes. Prevents the loop from skipping a human-facing deliverable while doing recon.
- **Maps to:** refine progress-board + close-the-loop — loop tick order: operator-owed LOOPBOT → gate pulse → queue work.

### P-260 - Post-long-sleep recap: fleet milestone + Operator keys as revenue unlock list
- **Observed:** After ~5h loop sleep: ※ recap: … all seven sites are live and the new Barlow model now serves production, beating every commercial baseline on the hard slice. Next action: your keys (GLM, Stripe, HF) unlock the remaining revenue streams.
- **Why it works:** Extends P-230/P-247: after extended idle, recap states **measurable fleet milestone** (7 sites, prod model, panel win on hard slice) then narrows **next action** to named Operator keys tied to **revenue streams** — not generic "waiting on you." Operator knows what each key unlocks without re-reading EVIDENCE.
- **Maps to:** refine recap-on-long-session + progress-board — long-sleep recap = milestone headline + keys-to-revenue mapping.

### P-261 - Named subagent sweep: queue-reality consistency before schema/infra fixes
- **Observed:** Background agent Queue-reality consistency sweep finished · 2m 56s while foreground edits  15_dataset_entitlements.py migration via heredoc.
- **Why it works:** Before Alembic/schema work, a dedicated subagent reconciles work_queue.json / TASKS.md with what's actually shipped vs gated — prevents claiming done tasks as blocked or vice versa. Elapsed time reported (P-190). Runs parallel to unrelated migration edit (P-251 fill-the-wait pattern for subagents).
- **Maps to:** refine metadata-align + sme-fanout — queue-reality consistency as a named background subagent before infra migrations.

### P-262 - Entitlements endpoint verified with honest empty list for unentitled workspace
- **Observed:** After migration heal monitor: "entitlements endpoint answers with an honest empty list for an unentitled workspace — table live, chain linear, prod migrations green again."
- **Why it works:** New monetization tables can silently 500 or return fake defaults. Verifying **unentitled → empty list** proves the endpoint is live and truthful (P-212/P-252 honesty family). "Chain linear" + "prod migrations green" closes the Alembic blocker class.
- **Maps to:** refine post-deploy-smoke + validate-gate — entitlements: verify empty response for unentitled tenant, not just HTTP 200.

### P-263 - Loop cycle close-out: parallel silent-break sweep → fix → verify → slate next task
- **Observed:** "The v2 loop's first cycle closed cleanly: found silently-broken things in parallel, fixed them, verified the fixes, slated the next batch. Next tick executes RT-402 from the slate."
- **Why it works:** Names the loop iteration shape: discover (queue-reality + migration monitor, P-261) → fix → verify (entitlements smoke) → **explicit next ID** (RT-402). Operator and next wakeup know exactly what's queued without re-scanning the board.
- **Maps to:** refine progress-board + close-the-loop — cycle close-out slates the next task ID for the following tick.

### P-264 - Slated queue task prep delegated to named subagent (task ID + model in label)
- **Observed:** P-263 slated RT-402 → background agent RT-402 script prep (sonnet) finished · 5m 34s. Parent: "Waiting for 1 background agent to finish" → then foreground continues. Second agent verifying smoke-run JSONL output.
- **Why it works:** Heavy script prep runs in a model-tagged subagent while parent holds the lane. Agent name carries **queue ID + role + model** so completion maps back to the slate without reading the full transcript. Elapsed time + token cost visible (P-190).
- **Maps to:** refine lane-discipline + sme-fanout — execute slated research tasks via named background subagents; parent waits then verifies output.

### P-265 - Subagent script delivery: smoke row fast, default path untouched, then detached full run
- **Observed:** RT-402 subagent close-out: "Sonnet delivered to spec (smoke row in 32s, default path untouched). Reviewing the diff footprint, committing, launching the full run detached:" → push → Monitor(RT-402 full run completion or crash) (3500s).
- **Why it works:** Three gates before the long job: (1) smoke produces one valid row quickly, (2) existing code paths unchanged, (3) diff footprint reviewed. Only then commit + **detached** full run + monitor (P-250). Prevents a 3500s bake on a broken script.
- **Maps to:** refine validate-gate + sme-fanout — subagent script handoff requires smoke row + default-path unchanged before detached full run.

### P-266 - Saturated bake-off verdict: no method winner, ceiling stated, harder protocol queued
- **Observed:** RT-402 close-out: esearch-corpus bake-off saturated the instrument (EVIDENCE 3.13) — in-domain all methods 0.926–0.935 (ceiling ≈0.935); "No method verdict is claimable from the in-domain slice." OOD AG News barlow direction matches RT-401; follow-up **RT-404** queued for harder protocol.
- **Why it works:** Extends P-226 (scoped verdict + no default change): when the eval **instrument** saturates, EVIDENCE says so explicitly — names ceiling, refuses a winner, cites OOD as supplementary only, queues protocol fix. Prevents false "RT-402 picked X" narratives.
- **Maps to:** refine validate-gate + document-non-action — saturated bake-off → EVIDENCE states ceiling + no verdict + follow-up task ID.

### P-267 - Product-site UX study as a named background subagent
- **Observed:** After RT-402 close-out: Agent "UX study: product sites" finished · 3m 43s while a second agent greps slasso pages for CTA links (4m+). Foreground runs shell command (~11s).
- **Why it works:** Fleet site quality work fans out to UX-named subagents (product sites scope) parallel to narrow audits (slasso CTAs). Keeps research lane (RT-402) separate from site UX without blocking the parent loop. Elapsed time on completion (P-190).
- **Maps to:** refine sme-fanout + use-design-system — product-site UX review as a labeled background subagent between research laps.

### P-268 - UX audit: apply one-line wiring fixes inline; file the rest as consolidated tasks
- **Observed:** UX subagent close-out: "All six home. Integrating — first the three one-line wiring fixes (cheaper to fix than to file), then the consolidated task list" → c856fc4 15 tasks filed, 3 wiring fixes applied inline from ~40 findings (~8m 45s).
- **Why it works:** Triage rule: fixes cheaper than queue overhead ship immediately; only non-trivial findings become tasks. ~40 findings → 15 tasks avoids queue spam while preserving traceability. Extends P-237 (Cursor offload) — filed tasks can land on Cursor lane.
- **Maps to:** refine lane-discipline + progress-board — UX audit: inline trivial fixes; consolidate remainder into numbered queue tasks.

### P-269 - UX fix: confirm backend already enriches data before wiring display + outbound link
- **Observed:** UX-103: "The hit list already renders payload.text — the backend enrichment completes snippets automatically. Adding the outbound link and shipping:" → 58f4e47 UX-101 + UX-103 (SSR-true stats, judgeable search hits).
- **Why it works:** Before UI work, verify the API already supplies the field (search.py enrichment). Fix is **display + link wiring**, not re-fetch or duplicate snippet logic. Avoids frontend/backend duplication and ships faster from UX audit findings (P-268).
- **Maps to:** refine match-conventions + correct-assumptions — UX hit fixes: read backend payload first, then wire UI.

### P-270 - Duplicate subagent completion echo: acknowledge integrated, don't re-commit
- **Observed:** UX-110 agent finished · 11m 45s → second completion echo → "already integrated, committed, and its flagged /org title fixed in the same commit." Parent does not re-apply work.
- **Why it works:** Background agents can double-fire completion events. Idempotent close-out: check git/integrate state before acting on echo. Prevents duplicate commits or conflicting edits from the same subagent handoff.
- **Maps to:** refine background-failure-triage + lane-discipline — dedupe subagent completion echoes against already-integrated commits.

### P-271 - UX subagent close-out slates wire/integration task for next tick
- **Observed:** After UX-110 (79c45d2 hq/observatory polish): "The pending wakeup stands; **WIRE-203** next tick."
- **Why it works:** Extends P-263: UX polish subagent completes → parent names the **next wiring task ID** (WIRE-203) for the following tick, separating UI polish from cross-site wiring work. Loop continuity without re-scanning queue.
- **Maps to:** refine progress-board — subagent UX close-out slates WIRE-* follow-up for next tick.

### P-272 - Data retention design stated as invariants before implementation
- **Observed:** WIRE-203 v2 tick: design narrated before shell — "archive-then-purge in one transaction (rows older than 45 days aggregate into usage_daily and are deleted atomically — idempotent, no double-count, and the 31-day tenant view always reads raw)."
- **Why it works:** Usage/billing retention is easy to get wrong (double-count, partial purge, stale tenant view). Stating **transaction boundary**, **idempotency**, **aggregation target**, and **read path** before coding makes review and rollback obvious. Extends P-211 monetization half-shipped discipline to ops wiring.
- **Maps to:** refine follow-procedure + policy-as-config — retention jobs: document invariants (atomic, idempotent, read path) before first migration/script edit.

### P-273 - Loop continuation names protocol v2 (SENSE/EXECUTE/CLOSE) + parallel small-model delegate
- **Observed:** /loop continue the hill-climb: execute the UX/WIRE study slate one task at a time — protocol v2 (SENSE/EXECUTE/CLOSE, delegate to small models in parallel) → v2 tick executes WIRE-203 with design-first retention (P-272) → 740f9e pushed (~2m).
- **Why it works:** Extends P-189 (goal in continuation prompt): names **which slate** (UX/WIRE study), **cadence** (one task), **protocol phase model** (SENSE/EXECUTE/CLOSE), and **delegation policy** (small models in parallel). The loop agent knows to sense before execute and close after, not just pick the next queue ID.
- **Maps to:** refine progress-board + sme-fanout — v2 loop prompt carries slate + SENSE/EXECUTE/CLOSE + parallel delegate policy.

### P-274 - Post-deploy harvest monitor verifies catalog counts + legible sample before task done
- **Observed:** UX-111 close-out: Monitor "Harvest the python-docs sample post-deploy" ended → push 934045 UX-111 verified — catalog at 7 datasets/167 chunks with legible sample live. Queue notes: python-docs-tutorial harvested live; wiki auto-rebuilt via harvest hook.
- **Why it works:** Seeding a sample dataset isn't done at commit — harvest must run post-deploy and produce **measurable catalog state** (7/167) plus a **legible sample** on the live refinery. Monitor names the harvest target (python-docs) and phase (post-deploy). Extends P-207 content assertions to data-refinery catalog.
- **Maps to:** refine post-deploy-smoke + event-driven-wait — catalog seed tasks use post-deploy harvest monitors with count + sample legibility checks.

### P-275 - Operator gate: review all open PRs for cleanliness before continuing the loop
- **Observed:** User: eview all open PR and make sure everything is clean before continuing → Fable 5 runs shell command to audit open PRs (~11s, in progress) before resuming UX/WIRE slate.
- **Why it works:** With multiple in-flight PRs (P-243: #1 spec 0021, #2 simulation lab), continuing feature work on a dirty PR stack creates merge/review debt. Explicit PR hygiene gate pauses the loop until open branches are reconciled — complements branch-per-initiative with a **continue only when clean** checkpoint.
- **Maps to:** refine monorepo-review-loop + agent-guardrails — honor operator PR-clean gate before next loop tick.

### P-276 - Open-PR hygiene audit ends with merge-to-main before slate continues
- **Observed:** Operator PR-clean gate (P-275): 11 shell commands (~4m 12s) →  9c5af9 Merge pull request #2 from jcdavis131/worktree-simulation-lab-buildout on main. Simulation Lab (Spec 0013) PR cleared from the stack.
- **Why it works:** The audit isn't read-only — it **closes** open work (merge #2) so main reflects shipped state before the next UX/WIRE tick. Prevents parallel PR drift while the loop continues on main.
- **Maps to:** refine monorepo-review-loop + close-the-loop — PR hygiene pass merges reconcilable PRs, then loop resumes on updated main.

### P-277 - Operator vision directive → canonical docs + flywheel ledger + queue tasks
- **Observed:** Operator asked: business objective, each site's unique contribution, cross-site support, closed-loop self-maintaining ecosystem with passive purchasable goods/services →  2cc53a ision: canonical business objective + flywheel ledger encoded (Operator directive) — updates docs/SITE_ARCHITECTURE.md, specs/0019-corporate-topology.md, work_queue.json (~1m 45s).
- **Why it works:** Strategic reframes don't stay in chat — they land in **architecture doc + spec + queue** so every agent/session inherits the same business objective. "Operator directive" in commit message marks normative source. Refinement work is metadata-align, not random copy edits.
- **Maps to:** refine metadata-align + progress-board — Operator vision questions → encode in SITE_ARCHITECTURE + spec + queue follow-ups.

### P-278 - Vision queue spawns flywheel tasks; metadata insertion verified with typecheck+build gate
- **Observed:** After P-277 vision encode: df9d3f3 **FLY-001** — wiki as demand engine (generateMetadata on /wiki/[slug], sitemap with live routes, mig 018 descriptions). Stray-quote fix: 8b15b25 names cause (FLY-001 metadata insertion) and proof (	ypecheck+build green) (~6m total).
- **Why it works:** Operator vision → queue task (FLY-001) → concrete SEO/demand wiring on refinery, not generic copy. Surgical fix commit ties regression to the feature and confirms build gate before close-out — extends P-192/P-207 to **build green** as deploy readiness for site metadata work.
- **Maps to:** refine metadata-align + validate-gate — flywheel tasks from vision; fix commits name parent task + typecheck/build proof.

### P-279 - Queue wiring change gated by import smoke + pytest in one compound shell
- **Observed:** Mid-lap compound check: inline Python ll queue modules import clean (jobs, harvest, certify, queueing) && uv run pytest services/core-api/tests -q | tail -1 (~28s+).
- **Why it works:** Queue/harvest/certify modules share import paths — a syntax error in one breaks others silently until runtime. Named import smoke (import clean) plus pytest summary in one round-trip catches wiring regressions before push. Cheap gate for WIRE/queue edits.
- **Maps to:** refine validate-gate + smoke-import — queue subsystem edits: compound import smoke + pytest tail before commit.

### P-280 - Vercel routes-manifest failure surfaces output-dir + turbo outputs checklist
- **Observed:** Deploy failed: 
ow-next-routes-manifest — Vercel suggests (1) misconfigured Output Directory vs Next.js config, (2) add .next/** to turbo.json task outputs, (3) build command did not complete — check build logs.
- **Why it works:** Extends P-123 post-deploy smoke inverted — deploy failure gets **structured diagnosis** from platform error text, not generic "deploy failed." Monorepo sites often fail when turbo outputs omit .next/** or root dir wrong. Actionable before retry.
- **Maps to:** refine diagnose-before-retry + use-available-integrations — Vercel routes-manifest errors → check output directory, turbo outputs, build logs.

### P-281 - /btw side channel unavailable under Remote Control
- **Observed:** During /rc active session: /btw isn't available over Remote Control.
- **Why it works:** P-151 documented /btw for non-interrupting side questions locally; under Remote Control that channel is blocked. Operator on mobile must use the main prompt or interrupt — worth knowing when supervising unattended loops remotely.
- **Maps to:** note — platform constraint when /rc active (contrast P-191 Remote Control + P-151 /btw).

### P-282 - Post-fix deploy monitor names the corrective change (not generic rebuild)
- **Observed:** After Vercel routes-manifest failure (P-280): Monitor "Hub rebuild with corrected filter" stream ended → shell verify (~26s). Monitor label encodes **what was fixed** (filter correction), not just "deploy lands."
- **Why it works:** Extends P-215: when retrying a failed deploy, the monitor event distinguishes fix attempt from first deploy — operator/agent knows this wait is for the **corrected** build. Reduces confusion when multiple deploy retries chain.
- **Maps to:** refine event-driven-wait + post-deploy-smoke — failed deploy retry gets a monitor named for the fix applied.

### P-283 - Public repo baseline: LICENSE + CONTRIBUTING + SECURITY + templates + README vision
- **Observed:** 76e40af chore(public): professional baseline for the public repo — README reframed ("self-sustaining intelligence engine"), LICENSE, CONTRIBUTING.md, SECURITY.md, GitHub issue/PR templates; removed stale dashboard.html; moved reports under docs. (~5m, 4 shells + retry).
- **Why it works:** Extends P-277 vision encode to **public-facing repo hygiene** — open-source/professional baseline matches flywheel narrative before external eyes land on GitHub. Not just README copy; legal + contribution + security surfaces ship together.
- **Maps to:** refine metadata-align + close-the-loop — public repo push bundles LICENSE/CONTRIBUTING/SECURITY/templates with vision-aligned README.

### P-284 - Retry metadata field when first write silently didn't take
- **Observed:** After public baseline push: "one retry on the description field that didn't take" — second shell command without re-running the whole baseline.
- **Why it works:** Platform/metadata writes (GitHub About/description, Vercel env — P-150) can fail silently. Named retry on the **specific field** avoids a full re-baseline. Cheap second pass vs declaring done with wrong public metadata.
- **Maps to:** refine diagnose-before-retry + metadata-align — when a description/metadata field doesn't stick, retry that field only.
