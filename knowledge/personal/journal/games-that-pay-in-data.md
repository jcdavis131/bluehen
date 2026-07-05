---
title: "Games that pay in data"
tags: [journal, games, data-engine]
source: "specs/0031-gamified-data-engine.md"
added: 2026-07-05
format: okf/v0
---

The reframe that made the studio identity click: the hardest training
data to acquire — [[hard-negatives]], preference rankings, graph
edges — is exactly what people produce *for fun* when you shape the
task as a game.

So the fleet became an arcade. Beat the Baseline turns adversarial
hard-negative mining into a puzzle: craft a query that *means* the
anchor but breaks the retriever, scored live against production. The
Rank Arena predicts your taste before each pick and shows Shapley
values explaining itself afterward. The Verdict has you judge
retrieval pairs — and treats the times you *overrule the engine* as
the prized signal. The Overworld wraps it all in a walkable world
whose news board reports what the engine actually did today.

Then the closing move: an agent played the games through the same
public routes humans use, self-declared `player: "agent"`, and mined
a real hard-negative triplet on its first session. Provenance is
never mixed silently — agents are the volume floor, humans the
quality ceiling — and every pick, verdict, and poison query lands in
one labeled exhaust stream, waiting for the [[mtnn-omni-embedding]]
heads to be hungry enough to train.
