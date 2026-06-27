# Specs

Spec-driven development. Code follows specs; specs follow `PLAN.md`.

- Specs are numbered `NNNN-short-name.md` and written from `0000-template.md`.
- A spec is **Draft → Ready → Implemented → Superseded**. Implementation starts only at
  **Ready** (acceptance criteria reviewed and signed off).
- Shipped specs are immutable. Changes get a new spec that supersedes the old one.
- ML specs MUST include an **evaluation gate**: a named metric and a threshold CI enforces.

| # | Title | Status |
|---|---|---|
| 0001 | Platform overview & boundaries | Draft |
| 0002 | Mini-organization model (tenancy & isolation) | Draft |
| 0003 | ASN embedding engine | Draft |
| 0004 | Core API | Draft |
| 0005 | Auto-research Conductor | Draft |
