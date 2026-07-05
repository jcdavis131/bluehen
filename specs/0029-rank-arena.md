# Spec 0029 — Rank Arena: fantasy-everything, the game face of the Rank Engine

**Status:** Active (Operator flagship direction, 2026-07-04)
**Refines:** 0028 (Rank Engine) · 0016 (play→data, supersedes its game set) · 0025 (exhaust)
**Owner:** Claude (decks, integration) · sonnet-delegates (arena UI) · Operator (LLM/TTS keys for V2 voice)

## 1. The game

**Rank Anything. Fantasy Everything.** At dumbmodel.com/arena:
1. Pick a deck (Movies Night, Street Food, Gadgets, Fictional Villains,
   …: curated JSON decks, 16–24 items each, checked into content/).
2. **The Gauntlet**: rapid this-or-that pairwise picks (~12 rounds,
   smart pairing), each pick announced by the Commentator.
3. **The Reveal**: the Rank Engine returns *your* personalized ranking
   of the full deck (picks streamed as exhaust with a session userRef;
   /v1/rank with that userRef does the rest — real machinery, no
   pretend). Factor chips show WHY each item landed where it did.
4. Replay with another deck; rankings shift as your taste vector grows —
   the compounding is the game.

## 2. The Commentator (personalized agent, honest tiers)

- **V1 (ships now):** deterministic persona lines (dumbmodel's roast
  voice — roasts picks, never players) + **browser-native TTS**
  (speechSynthesis API: zero keys, user-toggled, respects
  prefers-reduced-motion/mute).
- **V2 (LLM-key-gated):** the Commentator becomes a real agent —
  personalized banter from the user's pick history via agentkit.
- **V3 (TTS-key-gated):** cloud voices, character voices per deck.

## 3. The flywheel (why this is strategic, not a toy)

Every pick = a consented exhaust event with userRef + itemText — the
exact interaction data RANK-003 (learned user tower) and RANK-004
(uplift eval) are blocked on. The game IS the data engine. Consent
copy: plain-language, session-scoped anonymous userRef, no accounts,
dumbmodel's existing discard-by-default rules for anything unchecked.

## 4. V1 scope

Deck JSONs (content/arena/decks/*.json) · arena route on dumbmodel ·
BFF: exhaust proxy (consented picks) + rank proxy (sandbox-tenant key
NO — dumbmodel's own workspace key, its site tenant) · commentator v1
lines + speechSynthesis · mobile-first (thumb-reach pick buttons).
Leagues/head-to-head/seasons/leaderboards: V2+ (needs sessions/accounts
— deliberately out until PMF signal).

## 5. Gates

Ship: a stranger completes deck→gauntlet→reveal on a phone in <3min;
every ranking is a real /v1/rank response; picks visible in exhaust
summary; no fabricated personalization (first-gauntlet reveal says
"built from your 12 picks just now").
