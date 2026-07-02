# Self-continuing OpenCode loop for unattended coding tasks on Windows.
# Turn 1: opencode run with goal + protocol. Turn 2+: opencode run --continue.
# Stops on <<<TASK_COMPLETE>>> (optionally after -TestCmd passes), bails on <<<NEED_HUMAN>>>.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Goal,

    [string]$WorkDir = (Get-Location).Path,

    [int]$MaxIter = 20,

    [string]$TestCmd = "",

    [switch]$FixUntilGreen,

    [string]$Model = "",

    [int]$BackoffSec = 5,

    [switch]$SkipPermissions,

    [switch]$NoPure,

    [int]$BashTimeoutMs = 0,

    [ValidateSet("", "cursor", "claude", "opencode", "opencode-research")]
    [string]$Agent = "opencode",

    [string]$OpenCodeAgent = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($BashTimeoutMs -gt 0) {
    $env:OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS = "$BashTimeoutMs"
}

$CompleteToken = "<<<TASK_COMPLETE>>>"
$HumanToken = "<<<NEED_HUMAN>>>"

$Protocol = @"
UNATTENDED PROTOCOL (strict):
- Do not ask the user questions. If blocked, output $HumanToken with a short reason and stop.
- When the goal is fully done and verified, output $CompleteToken on its own line.
- Make verifiable progress each turn: run tests/builds yourself before claiming done.
- Prefer minimal, focused diffs. Do not refactor unrelated code.
- Do NOT run production deploy (vercel --prod, Railway, prod-deploy.mjs, Vercel API curl).
  Output $HumanToken if the goal requires Operator / INF-* tasks.
"@

function Write-Log([string]$Message) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$stamp] $Message"
}

function Get-SessionBootContext {
    param([string]$Cwd, [string]$AgentName)

    if ([string]::IsNullOrWhiteSpace($AgentName)) { return "" }

    $ctxArgs = @("run", "python", "scripts/build_sync.py", "context", "--agent", $AgentName)
    Push-Location $Cwd
    try {
        $out = & uv @ctxArgs 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Session boot context failed (exit $LASTEXITCODE); continuing without it."
            return ""
        }
        return $out.Trim()
    }
    catch {
        Write-Log "Session boot context error: $($_.Exception.Message)"
        return ""
    }
    finally {
        Pop-Location
    }
}

function Invoke-TestGate {
    param([string]$Command, [string]$Cwd)

    if ([string]::IsNullOrWhiteSpace($Command)) {
        return @{ Pass = $true; Output = "" }
    }

    Write-Log "Running test gate: $Command"
    Push-Location $Cwd
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "cmd.exe"
        $psi.Arguments = "/c $Command"
        $psi.WorkingDirectory = $Cwd
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true

        $proc = [System.Diagnostics.Process]::Start($psi)
        $stdout = $proc.StandardOutput.ReadToEnd()
        $stderr = $proc.StandardError.ReadToEnd()
        $proc.WaitForExit()

        $combined = ($stdout + "`n" + $stderr).Trim()
        return @{ Pass = ($proc.ExitCode -eq 0); Output = $combined; ExitCode = $proc.ExitCode }
    }
    finally {
        Pop-Location
    }
}

function Invoke-OpenCodeRun {
    param(
        [bool]$Continue,
        [string]$Prompt,
        [string]$Cwd,
        [string]$ModelName,
        [bool]$DangerouslySkipPermissions,
        [bool]$Pure,
        [string]$SubAgentName
    )

    $ocArgs = @("run")
    if ($Continue) { $ocArgs += "--continue" }
    if ($ModelName) { $ocArgs += @("-m", $ModelName) }
    if ($SubAgentName) { $ocArgs += @("-a", $SubAgentName) }
    if ($DangerouslySkipPermissions) { $ocArgs += "--dangerously-skip-permissions" }
    if ($Pure) { $ocArgs += "--pure" }
    $ocArgs += "--print-logs"
    $ocArgs += @("--dir", $Cwd, $Prompt)

    Write-Log ("opencode " + ($ocArgs -join " "))
    Push-Location $Cwd
    try {
        $output = & opencode @ocArgs 2>&1 | Out-String
        return @{ Ok = $true; Output = $output; ExitCode = $LASTEXITCODE }
    }
    catch {
        return @{ Ok = $false; Output = $_.Exception.Message; ExitCode = 1 }
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path $WorkDir)) {
    throw "WorkDir not found: $WorkDir"
}

if ($OpenCodeAgent -eq "research" -and $Agent -eq "opencode") {
    $Agent = "opencode-research"
}

$logDir = Join-Path $WorkDir ".opencode-loop"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$started = Get-Date -Format "yyyyMMdd-HHmmss"
$runLog = Join-Path $logDir "run-$started.log"

Write-Log "Goal: $Goal"
Write-Log "WorkDir: $WorkDir"
Write-Log "MaxIter: $MaxIter"
if ($Agent) { Write-Log "Boot agent: $Agent" }
if ($OpenCodeAgent) { Write-Log "OpenCode subagent: $OpenCodeAgent" }

$SessionBoot = Get-SessionBootContext -Cwd $WorkDir -AgentName $Agent
if ($FixUntilGreen -and -not $TestCmd) {
    throw "-FixUntilGreen requires -TestCmd"
}
if ($TestCmd) { Write-Log "TestCmd: $TestCmd" }
if ($BashTimeoutMs -gt 0) { Write-Log "BashTimeoutMs: $BashTimeoutMs" }

$lastTestFail = $false
$lastTestOutput = ""

for ($i = 1; $i -le $MaxIter; $i++) {
    Write-Log "Turn $i / $MaxIter"

    if ($i -eq 1) {
        $bootBlock = if ($SessionBoot) { "$SessionBoot`n`n" } else { "" }
        $prompt = "$bootBlock$Protocol`n`nGOAL:`n$Goal"
    }
    elseif ($FixUntilGreen -and $lastTestFail) {
        $prompt = @"
Continue working on the goal. The agent reported $CompleteToken but the test gate failed.

Test command: $TestCmd
Exit output:
$lastTestOutput

Fix the failures, re-run the test yourself, then output $CompleteToken only when it passes.
"@
    }
    else {
        $prompt = "Continue working on the goal. Make verifiable progress and output $CompleteToken when fully done."
    }

    $result = Invoke-OpenCodeRun -Continue:($i -gt 1) -Prompt $prompt -Cwd $WorkDir -ModelName $Model -DangerouslySkipPermissions:$SkipPermissions -Pure:(-not $NoPure) -SubAgentName $OpenCodeAgent
    $output = $result.Output
    $turnPath = Join-Path $logDir "turn-$i.txt"
    $output | Out-File -FilePath $turnPath -Encoding utf8
    Add-Content -Path $runLog -Value "=== turn $i exit=$($result.ExitCode) ok=$($result.Ok) ==="

    if (-not $result.Ok) {
        Write-Log "OpenCode error; backing off ${BackoffSec}s"
        Start-Sleep -Seconds $BackoffSec
        continue
    }

    if ($output -match [regex]::Escape($HumanToken)) {
        Write-Log "Agent requested human help; stopping."
        exit 2
    }

    if ($output -match [regex]::Escape($CompleteToken)) {
        if ($FixUntilGreen -or $TestCmd) {
            $test = Invoke-TestGate -Command $TestCmd -Cwd $WorkDir
            $testPath = Join-Path $logDir "test-after-turn-$i.txt"
            @(
                "command: $TestCmd"
                "exit: $($test.ExitCode)"
                "pass: $($test.Pass)"
                ""
                $test.Output
            ) | Out-File -FilePath $testPath -Encoding utf8

            if ($test.Pass) {
                Write-Log "Task complete and test gate passed."
                exit 0
            }

            Write-Log "Task complete token seen but test gate failed; continuing loop."
            $lastTestFail = $true
            $lastTestOutput = $test.Output
            continue
        }

        Write-Log "Task complete."
        exit 0
    }
}

Write-Log "Max iterations reached without completion."
exit 1
