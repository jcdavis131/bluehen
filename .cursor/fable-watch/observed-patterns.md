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
