# Fleet review - print URLs and start all active site dev servers (tmux-like single pane).
# Usage: .\scripts\fleet-review.ps1
#        .\scripts\fleet-review.ps1 -Build   # production build first (slower)
#        .\scripts\fleet-review.ps1 -Open    # open browser tabs

param(
    [switch]$Build,
    [switch]$Open,
    [switch]$Restart
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$Pnpm = "npx pnpm@9.12.0"

$Sites = @(
    @{ Id = "hub";           Name = "Platform Console";    Port = 3000; Url = "http://localhost:3000" }
    @{ Id = "dumbmodel";     Name = "Baseline Comparison";   Port = 3001; Url = "http://localhost:3001" }
    @{ Id = "control";       Name = "Operations Center";    Port = 3002; Url = "http://localhost:3002" }
    @{ Id = "benchmark-lab"; Name = "Validation Lab";      Port = 3003; Url = "http://localhost:3003" }
    @{ Id = "research-rag"; Name = "Applied Research";     Port = 3004; Url = "http://localhost:3004" }
)

Write-Host ""
Write-Host "Blue Hen RE - Fleet review" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""
foreach ($s in $Sites) {
    Write-Host ("  {0,-14} :{1}  {2}" -f $s.Id, $s.Port, $s.Url)
}
Write-Host ""
Write-Host "API (optional): http://localhost:8000  ->  npx pnpm@9.12.0 dev:api" -ForegroundColor DarkGray
Write-Host "Workspace env:  npx pnpm@9.12.0 bootstrap:orgs (if sites show offline)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Ctrl+C stops all dev servers." -ForegroundColor DarkGray
Write-Host ""

if ($Restart) {
    Write-Host "Stopping processes on ports 3000-3004..." -ForegroundColor Yellow
    3000..3004 | ForEach-Object {
        $port = $_
        $lines = netstat -ano | Select-String ":$port\s"
        foreach ($line in $lines) {
            if ($line -match '\s+(\d+)\s*$') {
                $procId = [int]$Matches[1]
                if ($procId -gt 0) {
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
    Start-Sleep -Seconds 2
}

$inUse = @()
foreach ($s in $Sites) {
    $conn = Get-NetTCPConnection -LocalPort $s.Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) { $inUse += $s.Id }
}
if ($inUse.Count -gt 0 -and -not $Restart) {
    Write-Host "Already running: $($inUse -join ', ') - use -Restart for a clean start" -ForegroundColor Yellow
    Write-Host ""
}

if ($Open) {
    foreach ($s in $Sites) {
        Start-Process $s.Url
    }
}

if ($Build) {
    Write-Host "Building active sites (concurrency=2)..." -ForegroundColor Yellow
    $env:NODE_OPTIONS = "--max-old-space-size=8192"
    Invoke-Expression "$Pnpm exec turbo run build --concurrency=2 --filter=@synthaembed/hub --filter=@synthaembed/dumbmodel --filter=@synthaembed/control --filter=@synthaembed/benchmark-lab --filter=@synthaembed/research-rag"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Build OK." -ForegroundColor Green
    Write-Host ""
}

Write-Host "Starting dev:fleet..." -ForegroundColor Yellow
Invoke-Expression "$Pnpm dev:fleet"
