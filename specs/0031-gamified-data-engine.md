# Spec 0031 — The gamified data engine: HITL games feeding the omni-model

**Status:** Active (Operator vision, 2026-07-04 night)
**Refines:** 0029 (Arena — the pattern proven) · 0023 (MTNN) · 0016 (superseded by this) · 0013 (simulation wall HOLDS)
**Owner:** Claude (mechanics + data plumbing) · Operator (prize/IP/investment gates)

## 1. Thesis

Every fleet surface becomes a game whose fun IS high-value labeling:
hard negatives, graph edges, orchestration rankings, temporal signals —
the four data classes money can't easily buy, feeding the MTNN's future
task heads. Arena (0029) proved the pattern in one night; this spec
scales it.

## 2. The games (phased by buildability × data value)

| Phase | Game | Surface | Harvests | Status |
|---|---|---|---|---|
| **P0** | **Beat the Baseline** — craft a query that SHOULD retrieve the anchor but doesn't (live nDCG drop = score) | dumbmodel | hard pos/neg triplets → AR queue | GAME-001, buildable now |
| P0 | **Metagame profile** — your cumulative impact on the model (triplets, edges, attributed eval deltas) | hq (public read-only page) + per-game | retention engine | GAME-002 |
| P1 | **Semantic Six Degrees** — bridge two papers via intermediate concepts | arxiviq | cross-domain graph edges | GAME-003 spec |
| P1 | **RAG Gauntlet** — bounty board: beat the hidden-set score with your loadout | slasso | orchestration telemetry + rankings | GAME-004 spec; bounty $ = Operator |
| P2 | **Oracle's Garden** — plant paper-credit predictions; harvest on outcomes | signals | temporal context pairs | GAME-005; **prizes = Operator legal gate**; simulation wall absolute |
| P3 | **The Hidden Layer** — location-aware mobile PWA skinning all mechanics (storybook aesthetic, INSPIRED-BY only — no Ghibli/Pokémon IP) | new consumer node (SENTINEL) | everything, ambiently | SENT-001; Operator investment gate |

## 3. Data plumbing (all games, one rule)

Game events ride /v1/exhaust (consented, pseudonymous userRef — the
Arena convention). Structured labels use payload.label:
`{"kind":"triplet","anchor":...,"positive":...,"hardNegative":...}` /
`{"kind":"edge",...}` / `{"kind":"ranking",...}` / `{"kind":"temporal",...}`.
A nightly drafter (extends radar_to_hypotheses pattern) rolls harvested
labels into training-ready datasets in the refinery — with provenance
cards like everything else.

## 4. MTNN heads: mechanics first, heads when fed

New loss heads (graph/margin-rank/temporal) are written ONLY when their
game has accumulated a threshold dataset (e.g. 500 verified triplets)
— no speculative training code. Contrastive head exists; Beat the
Baseline feeds it first. Every new head enters via the harness + gates.

## 5. Honesty & safety rails

Scores shown are real evals (a poison query's nDCG drop is measured
live, never simulated). Leaderboards show pseudonyms only. Signals
stays simulation-only regardless of prize decisions. No dark-pattern
compulsion loops: daily mechanics are check-in rewards, not streak
punishment.
