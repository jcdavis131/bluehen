# Documentation index

## B.U.I.L.D. layout

| Layer | Path | Role |
|---|---|---|
| **Wiki** | [`wiki/`](./wiki/) | Indexed docs, goals, triage rules |
| **Raw** | [`raw/`](./raw/) | Unformatted dumps (sync via `pnpm build:*`) |
| **ADR** | [`adr/`](./adr/) | Architecture decisions |
| **Sources** | [`sources/`](./sources/) | Legacy Google Doc exports |

Start with [`wiki/BUILD.md`](./wiki/BUILD.md) and [`wiki/GOALS.md`](./wiki/GOALS.md).

Read in this order for a new session:

1. [`../AGENTS.md`](../AGENTS.md) — pair-programming rules for Cursor / Eve
2. [`../HANDOFF.md`](../HANDOFF.md) — paste-ready context, fleet table, run commands
3. [`../EVIDENCE.md`](../EVIDENCE.md) — measured results ledger
4. [`../PLAN.md`](../PLAN.md) — architecture + phased roadmap
5. [`../WHITEPAPER.md`](../WHITEPAPER.md) — ASN method (scientific center)
6. [`../SCIENCE_REVIEW.md`](../SCIENCE_REVIEW.md) — normative integrity audit
7. [`../specs/README.md`](../specs/README.md) — spec status matrix
8. [`adr/README.md`](./adr/README.md) — architecture decision records

## Architecture

- [`SOURCE_MAP.md`](./SOURCE_MAP.md) — Google Docs ↔ repo files ↔ specs
- [`sources/`](./sources/) — archived markdown exports (sync when docs change)

## Operations & hosting

- [`../infra/railway.md`](../infra/railway.md) — Railway deploy runbook (core-api + worker)
- [`adr/002-core-api-hosting.md`](./adr/002-core-api-hosting.md) — production host decision (Accepted)
- [`adr/003-unified-org-cli.md`](./adr/003-unified-org-cli.md) — org-scoped `synth` CLI (Accepted)
- [`EXECUTIVE_ROADMAP.md`](./EXECUTIVE_ROADMAP.md) — Phase A priorities and critical path

## Key source files

| Export | Topic |
|---|---|
| `01-asn-educational-module.md` | ASN popular module (SHY, spectral surgery) |
| `02-synthaembed-enterprise-platform.md` | Eve synthetic org, zELO, Modal, Vercel stack |
| `03-asn-scientific-novelty-review.md` | Literature review backing `SCIENCE_REVIEW.md` |
| `04-embedding-co-briefing.md` | MTNN executive briefing |
| `05-mtnn-system-design.md` | Full MTNN system design (Phase B/C reference) |
| `06-asn-enterprise-integration-manual.md` | ASN deployment + ER monitoring |
| `07-embedding-co-lifecycle-narrative.md` | Four-org lifecycle + gap loop |
| `archive-plan-pre-fleet.md` | Old plan export — superseded |
