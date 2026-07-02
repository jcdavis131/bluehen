# Auto-revert autoresearch_train.py on DISCARD (Cursor afterShellExecution hook)
$ErrorActionPreference = "Stop"
$raw = [Console]::In.ReadToEnd()
if (-not $raw) { exit 0 }
try {
  $input = $raw | ConvertFrom-Json
} catch {
  exit 0
}
$cmd = [string]$input.command
$output = [string]$input.output
if ($cmd -notmatch "autoresearch_run") { exit 0 }
if ($output -notmatch ">>>\s*DISCARD") { exit 0 }
Set-Location $PSScriptRoot\..\..
uv run python scripts/autoresearch_revert.py --reason "cursor-hook-DISCARD"
exit 0
