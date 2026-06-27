# Skill: The Model Lifecycle

Load this when planning or sequencing work. The mini-org advances a model through four
stages, each owned by one subagent, each traced through the unified layer:

1. **Collect** (`data_harvester`): ingest -> LMAR chunk -> synthesize pairs.
2. **Train / validate** (`training_orchestrator`): compose ASN recipe -> launch on Modal -> poll.
3. **Applied test** (`qa_benchmark`): run rotating-slice eval -> check gates -> promote/reject.
4. **Real-world use** (`field_operator`): deploy (Matryoshka + quant) -> serve -> monitor drift.

Drift at stage 4 reopens stage 1. Each transition writes to the ledger. Budget is checked
before any stage that spends compute; production deploy needs Operator approval.
