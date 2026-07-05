# Spec 0033 — The Overworld: slasso's living world game

**Status:** Active (Operator vision, 2026-07-05)
**Refines:** 0031 (trio; Verdict becomes the in-world courthouse) · 0030 (the harness showcase) · 0032
**Owner:** Claude (world engine V0, roleplay harness) · Operator (LLM key, image-gen key, art sign-off)

## 1. The game

A retro top-down tile world (Game-Boy-INSPIRED original art — 4-tone
palette, never borrowed IP) at slasso.com that **simulates the real
Blue Hen universe**: districts are the business units; the worldbook is
the living wiki; the timeline is the operations ledger; world events
are REAL events (a deploy, a gate failure, a harvest) rendered as
happenings. The player walks, reads, plays, and — with the roleplay
engine — talks to grounded NPCs.

## 2. Phases

**V0 (buildable now):**
- Canvas tile engine: walkable player, collision, original tileset
  (procedural/hand-coded tiles, 4-tone), mobile d-pad + keyboard.
- The map: six districts (Storefront plaza, DumbModel arcade, Research
  library, Refinery works, Signals garden, the Courthouse) + HQ tower.
- Real-event happenings: poll the public event surfaces (GitHub commits
  feed; catalog stats deltas; wiki page count) -> signs/NPC bubbles
  ("A new dataset arrived at the Refinery today — 7 now on record").
  Honest: no event feed reachable -> quiet world, never fake events.
- Worldbook terminals: interact -> real wiki pages render in a dialog
  (via /v1/wiki, public).
- Arcade cabinets: Beat the Baseline / Rank Arena / The Verdict as
  in-world buildings that link out (later: embed).
- State: localStorage (position, flags); exhaust event on session
  (source validation, event "overworld-visit", player human|agent).

**V1 (LLM-key-gated): the roleplay engine — an agentic harness, not a
prompt.** Each NPC turn: the model REASONS then CALLS TOOLS —
`search(corpus)` (/v1/search), `worldbook(slug)` (/v1/wiki),
`timeline(n)` (/v1/ledger via BFF), `state(get/set)` (session store) —
then speaks, with tool-call citations shown in the dialog (the honesty
UI: you can see WHY the NPC said it). Built on agentkit; the SAME
harness ships in bluehen-stack (Spec 0030) — the game is the demo.
Rule-based narrator placeholder ships in V0 so the world isn't mute.

**V2 (gated):** image-gen vignettes (key), multiplayer presence,
SENT-001 location-layer convergence.

## 3. Rails

Original art only; simulation wall (signals garden shows fixture data
labeled as such); every rendered fact traces to a real API response;
player provenance labels per Spec 0031 §7; no dark patterns.

## 4. Queue

WORLD-001 V0 engine+map (claude, sonnet-delegable in 2 parts: engine /
content) · WORLD-002 roleplay harness (blocked: LLM key) · WORLD-003
image vignettes (blocked: key) · Verdict stays live standalone until
embedded.
