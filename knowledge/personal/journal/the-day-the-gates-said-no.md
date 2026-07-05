---
title: "The day the gates said no (and that was the demo)"
tags: [journal, evaluation, honesty]
source: "EVIDENCE.md"
added: 2026-07-04
format: okf/v0
---

We built the Launchpad — upload documents, watch a model train, see
the verdict — and then tested it the only honest way: by letting it
fail. A 3-document corpus trained a model whose embedding space
collapsed (effective rank 2.72). A 30-document corpus trained
something plausible. The gates refused them both, named their reasons
(`rankAboveBaseline`, `mrlWithinTolerance`), and the deploy step never
fired.

That's EVIDENCE 3.18, and it's my favorite row in the ledger, because
refusal is the hardest thing to demo. Anyone can show a green
checkmark. Showing a system that declines to ship a weak model — with
the numbers, in front of the user, as designed — is the whole
evaluation-receipts thesis ([[contrastive-objectives]] has the
measured background) compressed into one screen.

Same day, the research told us "no" twice more: instruction prefixes
made retrieval worse in 8 of 8 configs (rejected before a single
marketing claim), and no training objective separated beyond seed
noise. The nulls went in the ledger next to the wins. The one genuine
surprise: Barlow Twins showed *negative forgetting* — training
in-domain improved out-of-domain accuracy, four for four. That row
may matter more than any product we shipped that day.
