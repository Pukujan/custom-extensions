param()
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
. (Join-Path $root 'windows\common.ps1')

if ($env:OS -ne 'Windows_NT') { throw 'Windows pre-arm acceptance must run on Windows.' }
Set-Location $root
$python = Get-YflPython
Assert-YflPythonVersion $python
[void](Get-YflBrave)

function Invoke-YflPy([string[]]$Arguments) {
    $all = @($python.Prefix) + $Arguments
    & $python.Exe @all
    if ($LASTEXITCODE -ne 0) { throw ('Python command failed: ' + ($Arguments -join ' ')) }
}

function Get-PolicySnapshot {
    $key = 'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave'
    if (-not (Test-Path -LiteralPath $key)) { return '<absent>' }
    return (Get-ItemProperty -LiteralPath $key | Out-String).Trim()
}

Write-Host '=== Windows deterministic pre-arm acceptance ==='
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Node tests failed' }
Invoke-YflPy @('runtime/problem_bank.py')
Invoke-YflPy @('runtime/challenge_gate.py', 'self-test')
Invoke-YflPy @('runtime/challenge_ui.py', 'self-test')
Push-Location runtime
try { Invoke-YflPy @('-m', 'unittest', '-v', 'test_challenge_system.py') } finally { Pop-Location }
Invoke-YflPy @('tests/prearm_source_check.py')

node --check runtime/challenge_ui.js
if ($LASTEXITCODE -ne 0) { throw 'challenge_ui.js syntax failed' }
node --check src/status.js
if ($LASTEXITCODE -ne 0) { throw 'status.js syntax failed' }
node --check tests/e2e/judge-ui.spec.mjs
if ($LASTEXITCODE -ne 0) { throw 'judge-ui Playwright syntax failed' }
node --check tests/e2e/brave-popup.spec.mjs
if ($LASTEXITCODE -ne 0) { throw 'brave-popup Playwright syntax failed' }

# Parse every Windows PowerShell adapter before executing the dev installer.
Get-ChildItem (Join-Path $root 'windows\*.ps1') | ForEach-Object {
    [void][scriptblock]::Create((Get-Content $_.FullName -Raw))
}

# Playwright starts an isolated preview judge and drives the actual installed Brave executable.
npx playwright test tests/e2e/judge-ui.spec.mjs tests/e2e/brave-popup.spec.mjs
if ($LASTEXITCODE -ne 0) { throw 'Windows Playwright acceptance failed' }

# Verify the actual Windows dev installer starts the persistent preview without touching policy.
$before = Get-PolicySnapshot
& (Join-Path $root 'windows\stop-preview.ps1')
& (Join-Path $root 'windows\install-dev.ps1')
if (-not (Test-YflHealth)) { throw 'windows/install-dev.ps1 did not leave the local judge healthy' }
$after = Get-PolicySnapshot
if ($before -ne $after) { throw 'Burn-in installer changed Brave machine policy. This is forbidden before soft lock.' }
if (-not (Test-Path (Get-YflStartupFile))) { throw 'Windows preview startup entry was not created.' }

Write-Host ''
Write-Host 'WINDOWS DETERMINISTIC PRE-ARM: PASS'
Write-Host 'The preview judge is intentionally left running for the vision/computer-use rubric in docs/LOCAL-AGENT-VALIDATION.md.'
Write-Host 'Do NOT run windows/prepare-lock.ps1 or windows/arm.ps1 until the real-UI rubric also passes.'
