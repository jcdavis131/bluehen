# Spec 0016 — dumbmodel game layer: play → consented labeled training data

**Status:** Draft (awaiting Operator sign-off on game set + consent copy) · **Author:** Claude · 2026-07-02

## Answer to the question

Yes — with one discipline: games are selected by the **training-data format
they emit**, not by fun alone. dumbmodel.com is already the personality
venture with a working consent flywheel (`/check` → datalab inbox → OKF
dataset cards → R&D). The game layer is new UI on that existing pipeline.

## Games, ranked by downstream value

| Game | Player action | Data emitted | Feeds |
|---|---|---|---|
| **Passage Duel** | Query + two passages — "which answers it better?" | Relevance judgments + hard negatives | Eval sets (nDCG judgments, Spec 0008); hard-negative mining (RAG-503) |
| **Odd One Out** | Three snippets — spot the semantic outlier | (anchor, positive, negative) triplets | Contrastive ASN training pairs directly |
| **Same or Different** | Two sentences — same meaning? | Paraphrase pair labels | Training-pair generation |
| **Evidence Check** (phase 2) | Answer trivia, then rate the model's retrieved evidence | Live relevance feedback | Hill-climb feedback loop |

**Excluded:** reaction-time / tapping games — no value for embedding
training. Motion/engagement primitives may decorate, but produce no
stored data (no junk sources in the dataset library).

## Architecture (reuses existing plumbing)

1. **Item banks generated offline** from existing corpora (datalab
   chunks, e.g. arXiv) — games 1–3 need **no model inference at play
   time**, so they are NOT gated on REV-903.
2. Play events → site BFF → thin core-api endpoint `POST /v1/games/labels`
   (tenant-authed, request-shape validated, rate-limited) → append JSONL
   to `data/datalab/inbox/game-labels-<game>.jsonl`.
3. New sources in `config/datalab_sources.json` (`dumbmodel-game-labels-*`)
   → `datalab watch` materializes point-in-time datasets with OKF
   provenance cards, same as health-check submissions.

## Label quality (crowd labels are noisy)

- A label is **trusted** only at ≥3 independent annotations with ≥⅔
  agreement; raw events and derived trusted-labels are stored separately.
- Gold items (known answers) seeded into every session score annotator
  reliability; sessions below threshold are stored but excluded from
  trusted sets.
- Anonymous sessions (no accounts); per-session rate limits.

## Honest scoring (voice rule)

Player score = measured agreement with gold/consensus — never invented
points. Leaderboard extends the existing Hall of Cone vocabulary.
Consent is explicit opt-in per session (unchecked = play, nothing
stored); copy extends `/legal/privacy` and **requires Operator review**
(standing Spec 0015 condition).

## Sequencing & gates

- Phase 1: Passage Duel + Odd One Out (human-label-only, offline item
  banks). Phase 2: Same or Different. Phase 3: Evidence Check — **blocked
  on REV-903** (checkpoint cache + rate limiting) since it calls the
  model per interaction.
- Eval gate per game (SDD): approved consent copy · item-bank provenance
  card in `knowledge/datasets/` · agreement-gate unit tests · rate limit
  on the BFF route verified.

## Acceptance criteria

- [ ] Playing a game with consent ON appends valid JSONL to the inbox;
      OFF stores nothing (test both).
- [ ] `datalab watch` materializes a game-labels dataset with an OKF card.
- [ ] Trusted-label derivation enforces the k-of-n agreement gate (tests).
- [ ] Gold-item reliability scoring excludes low-agreement sessions.
- [ ] No fabricated numbers anywhere in game UI copy.
