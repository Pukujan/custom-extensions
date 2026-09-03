param(
    [Parameter(Mandatory=$true)][string]$StateDir
)
. (Join-Path $PSScriptRoot 'common.ps1')
Assert-YflAdministrator

$config = Get-Content (Join-Path (Get-YflInstallDir) 'config.json') -Raw | ConvertFrom-Json
$gate = Join-Path (Get-YflInstallDir) 'runtime\challenge_gate.py'
$token = Join-Path $StateDir 'maintenance-token.json'
$prefix = @()
if ($config.pythonPrefix) { $prefix = @($config.pythonPrefix) }
$args = $prefix + @($gate, '--state-dir', $StateDir, 'token-valid', '--token', $token)
& ([string]$config.pythonExe) @args *> $null
if ($LASTEXITCODE -ne 0) { throw 'No valid signed maintenance token. Complete the five-problem flow first.' }

Unregister-ScheduledTask -TaskName 'YouTubeFocusLockPolicyWatchdog' -Confirm:$false -ErrorAction SilentlyContinue
Stop-YflUiProcess
Remove-Item (Get-YflStartupFile) -Force -ErrorAction SilentlyContinue
Remove-YflPolicies
Remove-Item $token -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $StateDir 'extension-id') -Force -ErrorAction SilentlyContinue

$install = Get-YflInstallDir
$quoted = '"' + $install.Replace('"','') + '"'
Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'timeout /t 2 /nobreak >nul & rmdir /s /q ' + $quoted) -WindowStyle Hidden
Write-Host 'YouTube Focus Lock enforcement removed. Restart Brave to finish cleanup.'
