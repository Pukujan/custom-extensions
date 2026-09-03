param(
    [Parameter(Mandatory=$true)][ValidateSet('maintenance','uninstall')][string]$Action,
    [Parameter(Mandatory=$true)][string]$Challenge,
    [Parameter(Mandatory=$true)][string]$StateDir
)
. (Join-Path $PSScriptRoot 'common.ps1')
Assert-YflAdministrator

$configPath = Join-Path (Get-YflInstallDir) 'config.json'
if (-not (Test-Path $configPath)) { throw 'Installed configuration is missing.' }
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$gate = Join-Path (Get-YflInstallDir) 'runtime\challenge_gate.py'
$prefix = @()
if ($config.pythonPrefix) { $prefix = @($config.pythonPrefix) }
$args = $prefix + @($gate, '--state-dir', $StateDir, 'unlock', $Challenge, '--user', [string]$config.user, '--platform', 'windows')
& ([string]$config.pythonExe) @args
if ($LASTEXITCODE -ne 0) { throw 'Five-problem verification proof was rejected. No policy change was made.' }

if ($Action -eq 'uninstall') {
    & (Join-Path (Get-YflInstallDir) 'windows\uninstall-locked.ps1') -StateDir $StateDir
    exit $LASTEXITCODE
}

& (Join-Path (Get-YflInstallDir) 'windows\policy-watchdog.ps1')
Write-Host 'Maintenance window opened for 10 minutes. The watchdog will restore policy after the signed token expires.'
