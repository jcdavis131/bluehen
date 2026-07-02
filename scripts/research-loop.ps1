# Start unattended research loop (autoresearch + literature radar + realtext gate)
# Usage: .\scripts\research-loop.ps1
# Stop:  Get-Process | Where-Object { $_.CommandLine -match 'research_loop' } | Stop-Process

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path "data\autoresearch\champion_train.py")) {
    Write-Host "Initializing autoresearch champion..."
    uv run python scripts/research_loop.py --init
}

Write-Host "Starting research loop daemon (logs: data/autoresearch/loop.log)"
$logDir = "data\autoresearch"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Start-Process -WindowStyle Hidden -FilePath "uv" -ArgumentList @(
    "run", "python", "scripts/research_loop.py", "--daemon", "--sleep", "60"
) -RedirectStandardOutput "$logDir\loop-stdout.log" -RedirectStandardError "$logDir\loop-stderr.log" -WorkingDirectory (Get-Location)

Write-Host "Research loop running in background."
Write-Host "  tail: Get-Content data/autoresearch/loop.log -Wait"
Write-Host "  queue: data/autoresearch/queue.json"
Write-Host "  state: data/autoresearch/loop_state.json"
