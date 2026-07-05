# bluehen-stack installer — v1 SKELETON (Windows)
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

param(
    [string]$TargetDir = "bluehenre"
)

$ErrorActionPreference = "Stop"
$RepoUrl = if ($env:BLUEHEN_REPO_URL) { $env:BLUEHEN_REPO_URL } else { "https://github.com/jcdavis131/bluehenre.git" }

Write-Host "== bluehen-stack v1 installer =="
Write-Host ""

# 1. Check python
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
    Write-Error "python3.11+ not found on PATH. Install Python 3.11 or newer and re-run."
    exit 1
}
$pyVer = & python -c "import sys; print('%d.%d' % sys.version_info[:2])"
Write-Host "python: $($py.Source) ($pyVer)"

# 2. Check uv
$uv = Get-Command uv -ErrorAction SilentlyContinue
if (-not $uv) {
    Write-Error "uv not found on PATH. Install: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
}
Write-Host "uv: $(uv --version)"
Write-Host ""

# 3. Clone the monorepo (skip if already inside it, or target dir exists)
$inMonorepo = (Test-Path "pyproject.toml") -and (Select-String -Path "pyproject.toml" -Pattern "synthaembed-os" -Quiet -ErrorAction SilentlyContinue)
if ($inMonorepo) {
    Write-Host "Already inside the bluehenre monorepo — skipping clone."
    $TargetDir = "."
} elseif (Test-Path (Join-Path $TargetDir ".git")) {
    Write-Host "Target dir '$TargetDir' already exists — skipping clone."
} else {
    Write-Host "Cloning $RepoUrl into $TargetDir ..."
    git clone $RepoUrl $TargetDir
}

Set-Location $TargetDir

# 4. Sync the core Python workspace (asn-engine, eval-harness, core-api, etc.)
Write-Host ""
Write-Host "Syncing core workspace (uv sync) ..."
uv sync

Write-Host ""
Write-Host "== What works today (verified) =="
Write-Host ""
Write-Host "  # Eval harness / asn-engine unit tests (19 tests, ~3s):"
Write-Host "  uv run --project packages/asn-engine python -m pytest packages/asn-engine -q"
Write-Host ""
Write-Host "  # Real-text method smoke run (in-domain corpus fine-tune + zero-shot panel):"
Write-Host "  packages\asn-engine\.venv\Scripts\python.exe scripts\realtext_methods.py \`"
Write-Host "    --corpus data\corpora\research\corpus.jsonl --smoke"
Write-Host ""
Write-Host "== PENDING EXTRACTION (not yet a standalone install — see manifest.json) =="
Write-Host "  - Standalone embedding server binary/container (today: packages/asn-engine +"
Write-Host "    services/core-api/app/services/models_svc.py, running only inside this repo)"
Write-Host "  - Packaged tuning loop CLI (today: scripts/autoresearch_*.py, coupled to"
Write-Host "    config/work_queue.json / TASKS.md conventions)"
Write-Host "  - Curated, repo-independent skills bundle (today: config/omni-skills/,"
Write-Host "    apps/synthorg/agent/skills/ — see SKILLS.md)"
Write-Host "  - Free-LLM (Ollama/vLLM/GLM-class) wiring — not implemented anywhere yet"
Write-Host ""
Write-Host "Done. See README.md for the token-economics contract and full status."
