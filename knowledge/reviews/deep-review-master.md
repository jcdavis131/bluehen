# Fleet Deep Review — Master Synthesis

> Meta-report synthesizing the 5 SME lane reviews into one ranked, actionable artifact.
> Reviewed 2026-07-02 by a 5-SME fan-out (Cursor orchestrating; per `sme-fanout`).
> Each lane wrote a detailed report under `knowledge/reviews/deep-review-<lane>.md`;
> each was spot-checked for contract conformance + substance (per `verify-subagent-output`)
> before synthesis. All 5 passed verification.

## Top 3 actions across all lanes

1. **🔴 Enroll `eval-harness` in the uv workspace + declare `core-api`'s dep on it** — _shared-packages_. A clean `uv sync` does not install `eval_harness` (`ModuleNotFoundError` on import); `core-api` imports it at `eval.py:47` without declaring the dep. The deploy-gate package (spec 0008) is the single most load-bearing piece of the ML release flow and the most fragile wiring in the repo — it survives only on `sys.path` hacks and Dockerfile copies. Fix: add `packages/eval-harness` to root `pyproject.toml` members + `services/core-api/pyproject.toml` deps, re-run `uv sync --all-packages`, delete the `sys.path.insert` hacks in `scripts/tenant_baseline.py:24` and `scripts/engine_proof.py:27`.

2. **🔴 Restore `governance.get_trace` with RLS** — _backend services_. `GET /v1/trace/{trace_id}` is a live 500 on every call: `main.py:77-79` calls `governance.get_trace` but `governance.py` has no such function (dead body at `:142-163` with no `def` line). The dead body opens `db_session()` with no `workspace_id`, so a naive `def get_trace(trace_id):` restore re-opens the SEC-003 cross-tenant RLS bypass. Fix: `def get_trace(trace_id, workspace_id)` filtering `TraceSpan.workspace_id == workspace_id`; pass `tenant.workspace_id` from `main.py:77-79`; delete the dead block.

3. **🟡→🔴 Wire sites through `synth-core` (or formally accept the bypass in an ADR)** — _cross-lane (public-sites + research-sites + shared-packages)_. The `AGENTS.md` rule "sites → core-api only via `@synthaembed/synth-core`" is unenforced and unenforced-against: `ui-fleet/site-api.ts` uses raw `fetch` with no trace spans; hub home/try + control home do raw `fetch`; training-console bypasses the BFF entirely with a client-exposed `NEXT_PUBLIC_TELEMETRY_KEY`. Result: the trace store (the Operations Ledger) is blind to **all** site→core-api traffic — the largest traffic source. Pick one: (a) route `site-api.ts` through `synthFromEnv("site:<id>")` so every call carries trace headers (~40-line change, closes the gap), or (b) write an ADR recording that site route handlers intentionally use raw `fetch` and update `AGENTS.md` rule 1. Recommendation: (a).

## Cross-lane findings (themes that span 2+ lanes)

- **Synth-core bypass is fleet-wide** (public-sites 🟡, research-sites 🟡, shared-packages 🟡). Three lanes independently found sites skipping `synth-core` → no trace spans on any site request. This is the single biggest observability gap and it's one pattern, not three. Unified fix is action #3 above.
- **Eval gates are advisory, not binding — twice over** (backend 🟡 + shared-packages 🟡). The worker auto-deploys on charter alone (`worker/main.py:122-130` logs `"charter-approved (gates pending)"` and deploys anyway); AND the `mrlWithinTolerance` gate is a hardcoded `True` stub (`gates.py:13`). So spec 0008's deploy gate is doubly weak: the gate logic has a free pass AND the worker doesn't require gates to pass. A model with broken Matryoshka truncation that failed nDCG can still ship if its charter is broad. Fix: make `gates_passed` binding in the worker auto-deploy path AND implement the MRL gate.
- **Dependency-hygiene violations cluster in backend services** (backend 🟡 ×3). Trainer keeps `torch/transformers/modal` as core deps (inflates every `uv sync --all-packages`); `core-api` imports `asn-engine` + `eval-harness` without declaring them; `services/worker` has no `pyproject.toml` and `sys.path.insert`s into core-api. The `dependency-hygiene` skill is codified but not applied to the backend. Fix: move trainer heavy deps to `[project.optional-dependencies].model`; declare the missing core-api deps; give worker a minimal pyproject and make it a workspace member.
- **Status / metadata / registry drift** (agent-org 🟡, research-sites 🟡, public-sites 🟡). `finance-lab` + `training-console` marked `status: "active"` with no domain/Vercel; spec 0007 site table lists 6 sites but fleet.json has 8 (missing training-console); `platform.repo` points at legacy `henington-homes`; several home pages (hub, dumbmodel, finance-lab) missing `metadata` exports. Low-severity individually but collectively they make the registry-as-source-of-trust goal leaky.
- **Dead code across the fleet** (public-sites 🟡, shared-packages 🟡, research-sites 🔴-adjacent). `dumbmodel/api/compare` + `components/site.tsx` + legacy CSS block; `control/api/hill-climb`; `FleetNavMobile.tsx` (not in barrel, no importers); `cli/parse-args.ts`; and the 🔴-adjacent `RunDetail.tsx` (fully built, never mounted — see action below). Maintenance noise that confuses contributors and inflates bundles.

## Conflicts / contradictions between lanes

None directly contradicting. The synth-core bypass appeared in 3 lanes with different framings (hub/control raw fetch / training-console BFF bypass / ui-fleet site-api raw fetch) — unified into action #3 rather than reported 3×. No lane contradicted another's evidence.

## Per-lane summary

| Lane | Verdict | Top finding | Top recommendation | Full report |
|---|---|---|---|---|
| Public sites (hub, control, dumbmodel) | 🟢 Strong — real, complete, design-system-adherent; minor drift | 🟡 hub home/try + control home bypass `synth-core` (raw `fetch`, no trace spans) | Restore tracing via `synthFromEnv("hub")`; add `metadata` to home pages; delete 4 dead-code items | `deep-review-sites-public.md` |
| Research sites (research-rag, benchmark-lab, finance-lab, training-console) | 🟢 Mostly strong; Phase B guardrail + Spec 0015 consent gates held | 🔴 training-console `/runs/[id]` 404 — `RunDetail.tsx` fully built but never mounted | Add `app/runs/[id]/page.tsx` (one file, ~10 lines); move training-console telemetry behind a BFF before any public deploy | `deep-review-sites-research.md` |
| Backend services (core-api, commerce, worker/trainer) | 🟡 Mixed — migrations/RLS + commerce are solid; trainer + governance + worker deploy-gate are not | 🔴 `governance.get_trace` missing → `GET /v1/trace/{id}` 500s (dead body encodes SEC-003 bypass); trainer tests red (3 fail / 8 error) | Restore `get_trace` with RLS; reconcile trainer tests with skeleton; make eval gates binding for worker auto-deploy; confine corpus paths (SEC-005) | `deep-review-services-backend.md` |
| Agent & org (synthorg, divisions, fleet registry) | 🟢 Architecture sound; guardrails are prose-only | 🟡 Subagents hardcode `anthropic/claude-sonnet-4.6` (bypass local-first cost strategy); no allowlists/loop-bounds/trace-id; `record_ledger` enum drift (4 vs 11 stages) | Per-subagent model resolver + tool allowlists; align `record_ledger` enum with `org-divisions.json`; wire Eve session→trace-id | `deep-review-agent-org.md` |
| Shared packages (fleet, ui-fleet, synth-core, eval-harness, runboard, datalab, omni-sim, asn-engine, cli) | 🟢 Packages mostly healthy; the deploy-gate package is the hole | 🔴 `eval-harness` not in uv workspace + `core-api` undeclared dep → `ModuleNotFoundError` on clean sync | Enroll `eval-harness` in workspace + declare the dep; implement the MRL gate (currently hardcoded `True`); add `eval-harness/tests/` | `deep-review-shared-packages.md` |

## Verification (per `verify-subagent-output`)

| Lane report | Contract (5 sections) | Substance (≥1 evidence-backed claim/section) | File:line anchors | Result |
|---|---|---|---|---|
| `deep-review-sites-public.md` | ✅ all 5 | ✅ | ✅ extensive | PASS |
| `deep-review-sites-research.md` | ✅ all 5 | ✅ | ✅ extensive | PASS |
| `deep-review-services-backend.md` | ✅ all 5 | ✅ (test run + `hasattr` check cited) | ✅ extensive | PASS |
| `deep-review-agent-org.md` | ✅ all 5 | ✅ (grep cross-checks cited) | ✅ extensive | PASS |
| `deep-review-shared-packages.md` | ✅ all 5 | ✅ (smoke-import results cited) | ✅ extensive | PASS |

All 5 reports conform and are substantive. No send-back needed.

## Severity rollup

| Severity | Count | Examples |
|---|---|---|
| 🔴 | 4 | eval-harness workspace gap; `governance.get_trace` 500; trainer tests red; training-console `/runs/[id]` 404 |
| 🟡 | ~22 | synth-core bypass (fleet-wide); MRL gate stub; worker deploy-gating; SEC-005/008/009; subagent guardrails; status/metadata drift; dead code |
| 🟢 | many | migrations 001-006 RLS sequence; commerce provider-agnostic + fail-fast; no Postgres bypass from sites; fleet barrel; runboard/datalab/omni-sim/asn-engine hygiene; Phase B guardrail; Spec 0015 consent gates |

## Recommended fix order (dependency-aware)

1. **eval-harness workspace enrollment** (unblocks clean syncs; prerequisite for honest eval gates)
2. **Implement the MRL gate** (so the gate logic is real before making it binding)
3. **Make eval gates binding for worker auto-deploy** (so a real gate actually stops a bad deploy)
4. **Restore `governance.get_trace` with RLS** (live 500 + latent SEC-003)
5. **Add training-console `app/runs/[id]/page.tsx`** (cheapest high-impact fix; one file)
6. **Wire sites through `synth-core`** (closes the fleet-wide trace gap)
7. **Reconcile trainer tests with skeleton** (skip/xfail or implement)
8. **Agent guardrails: model resolver + allowlists + `record_ledger` enum** (makes the agent layer match the deterministic-core pattern it already claims)
9. **Backend dependency-hygiene + worker pyproject** (unblocks standalone deploys)
10. **Status/metadata/registry drift + dead-code sweep** (low-risk polish)
