# bluehen-stack

The local AI stack behind Blue Hen RE, packaged for standalone install:
**BlueHen embedding serving (CPU)** + **eval harness** + **tuning loop** +
**skills library** + **free-LLM wiring** (GLM-class via Ollama/vLLM,
planned). Defined by `specs/0030-one-model-package.md` §3 (PKG-002).

## What installs

| Component | What it is | Status |
|---|---|---|
| Embedding server | CPU-class MiniLM-backbone encoder + serving path (Matryoshka truncate, int8 quantize) | extractable |
| Eval harness | Intrinsic + extrinsic gates (effective rank, nDCG@10, Matryoshka truncation tolerance) | extractable |
| Tuning loop | Fixed-budget experiment loop with KEEP/DISCARD auto-revert | curation-needed |
| Skills | Reusable agent skills (deploy checklist, eval gates, lifecycle, omni-market) | curation-needed |
| LLM wiring | Free/open-weight chat models (Ollama, vLLM, GLM-class) for the harness | planned |

See `manifest.json` for the full component map and honest per-component notes.

## Requirements

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) for dependency management
- ~2 GB disk (model weights + eval corpora + venvs)
- **No GPU required** — everything here runs CPU-only

## Token-economics contract

Summarized from `specs/0033-overworld.md` (normative for this harness and
for `bluehen-stack`):

1. **Cacheable static prefix** — system prompt + world/tool setup is one
   immutable prefix block (`cache_control: ephemeral` / `cachedContent` /
   vLLM-SGLang prefix caching). Dynamic turn content (state, RAG passages,
   user line) appends after the prefix, never interleaves.
2. **RAG-minimal context** — tools return only top-k relevant passages
   (small k, budgeted chars), never whole documents.
3. **BYOK, metered per run** — bring your own model key; every turn logs
   prompt/completion token counts from the provider's usage response —
   exact per-turn cost visible, no black box.
4. **Free & open source only by default** — GLM-class / open-weights via
   Ollama/vLLM are the default target; OSS libraries only in the harness.

## Status (honest)

**v1 = manifest + installer skeleton; extraction from the monorepo is in
progress.** The components run today *inside the monorepo* (see repo
root — `packages/asn-engine`, `packages/eval-harness`,
`scripts/autoresearch_*.py`, `config/omni-skills/`,
`apps/synthorg/agent/skills/`), verified by:

```bash
uv run --project packages/asn-engine python -m pytest packages/asn-engine   # 19 passed
packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py \
  --corpus data/corpora/research/corpus.jsonl --smoke                       # runs end-to-end
```

There is no standalone `bluehen-stack` install yet that runs outside this
repo — `install.sh`/`install.ps1` in this directory clone the monorepo and
run the same verified commands in place. Nothing in this package promises
functionality beyond what those commands demonstrate today.

## Install

```bash
./install.sh          # macOS/Linux/WSL
```
```powershell
.\install.ps1          # Windows
```

See `SKILLS.md` for the current skill index.
