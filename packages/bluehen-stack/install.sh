#!/usr/bin/env bash
# bluehen-stack installer — v1 SKELETON
#
# Honest status: this does NOT yet install a standalone package. It clones
# the monorepo (or uses the one you're already in), syncs the core Python
# workspace with uv, and runs the commands that are verified to work TODAY
# inside the monorepo. See ../../specs/0030-one-model-package.md §3 and
# README.md in this directory for the full contract.
#
# NEVER promise what doesn't run: every command below has been executed and
# confirmed working as of this v1 skeleton. Anything not runnable yet is
# printed under "PENDING EXTRACTION", not executed.

set -euo pipefail

REPO_URL="${BLUEHEN_REPO_URL:-https://github.com/jcdavis131/bluehenre.git}"
TARGET_DIR="${1:-bluehenre}"

echo "== bluehen-stack v1 installer =="
echo

# 1. Check python
if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
  echo "ERROR: python3.11+ not found on PATH. Install Python 3.11 or newer and re-run." >&2
  exit 1
fi
PY_BIN="$(command -v python3 || command -v python)"
PY_VER="$("$PY_BIN" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
echo "python: $PY_BIN ($PY_VER)"

# 2. Check uv
if ! command -v uv >/dev/null 2>&1; then
  echo "ERROR: uv not found on PATH. Install: https://docs.astral.sh/uv/getting-started/installation/" >&2
  exit 1
fi
echo "uv: $(uv --version)"
echo

# 3. Clone the monorepo (skip if already inside it, or target dir exists)
if [ -f "pyproject.toml" ] && grep -q "synthaembed-os" pyproject.toml 2>/dev/null; then
  echo "Already inside the bluehenre monorepo — skipping clone."
  TARGET_DIR="."
elif [ -d "$TARGET_DIR/.git" ]; then
  echo "Target dir '$TARGET_DIR' already exists — skipping clone."
else
  echo "Cloning $REPO_URL into $TARGET_DIR ..."
  git clone "$REPO_URL" "$TARGET_DIR"
fi

cd "$TARGET_DIR"

# 4. Sync the core Python workspace (asn-engine, eval-harness, core-api, etc.)
echo
echo "Syncing core workspace (uv sync) ..."
uv sync

echo
echo "== What works today (verified) =="
echo
echo "  # Eval harness / asn-engine unit tests (19 tests, ~3s):"
echo "  uv run --project packages/asn-engine python -m pytest packages/asn-engine -q"
echo
echo "  # Real-text method smoke run (in-domain corpus fine-tune + zero-shot panel):"
echo "  packages/asn-engine/.venv/Scripts/python.exe scripts/realtext_methods.py \\"
echo "    --corpus data/corpora/research/corpus.jsonl --smoke"
echo "  (on macOS/Linux, use packages/asn-engine/.venv/bin/python instead of Scripts/python.exe)"
echo
echo "== PENDING EXTRACTION (not yet a standalone install — see manifest.json) =="
echo "  - Standalone embedding server binary/container (today: packages/asn-engine +"
echo "    services/core-api/app/services/models_svc.py, running only inside this repo)"
echo "  - Packaged tuning loop CLI (today: scripts/autoresearch_*.py, coupled to"
echo "    config/work_queue.json / TASKS.md conventions)"
echo "  - Curated, repo-independent skills bundle (today: config/omni-skills/,"
echo "    apps/synthorg/agent/skills/ — see SKILLS.md)"
echo "  - Free-LLM (Ollama/vLLM/GLM-class) wiring — not implemented anywhere yet"
echo
echo "Done. See README.md for the token-economics contract and full status."
