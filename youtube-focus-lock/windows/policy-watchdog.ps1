param()
. (Join-Path $PSScriptRoot 'common.ps1')

$configPath = Join-Path (Get-YflInstallDir) 'config.json'
if (-not (Test-Path $configPath)) { throw 'YouTube Focus Lock config.json is missing.' }
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$gate = Join-Path (Get-YflInstallDir) 'runtime\challenge_gate.py'
$token = Join-Path ([string]$config.stateDir) 'maintenance-token.json'
$prefix = @()
if ($config.pythonPrefix) { $prefix = @($config.pythonPrefix) }
$args = $prefix + @($gate, '--state-dir', [string]$config.stateDir, 'token-valid', '--token', $token)
& ([string]$config.pythonExe) @args *> $null
$valid = ($LASTEXITCODE -eq 0)

if ($valid) {
    Remove-YflPolicies
} else {
    Set-YflPolicies -ExtensionId ([string]$config.extensionId)
}
