param()
. (Join-Path $PSScriptRoot 'common.ps1')
Assert-YflAdministrator

$root = Get-YflRoot
$state = Get-YflStateDir
$extensionFile = Join-Path $state 'extension-id'
if (-not (Test-Path $extensionFile)) { throw 'No prepared extension ID. Run windows\prepare-lock.ps1 first.' }
$extensionId = (Get-Content $extensionFile -Raw).Trim()
if ($extensionId -notmatch '^[a-p]{32}$') { throw 'Prepared extension ID is invalid.' }
$python = Get-YflPython
Assert-YflPythonVersion $python

Write-Host 'ARMING CHECK'
Write-Host 'Before continuing, verify ALL of these:'
Write-Host '  [1] 60-minute burn-in completed.'
Write-Host '  [2] Coding challenge preview was exercised during this burn-in.'
Write-Host '  [3] brave://policy shows ExtensionInstallForcelist.'
Write-Host '  [4] Extension popup says Browser lock policy: VERIFIED.'
Write-Host '  [5] YouTube blocks outside 11:00 AM-12:00 PM America/New_York.'
Write-Host '  [6] windows\rollback-policy.ps1 worked during soft-lock testing.'
$confirm = Read-Host 'Type exactly: ARM YOUTUBE FOCUS LOCK'
if ($confirm -ne 'ARM YOUTUBE FOCUS LOCK') { Write-Host 'Not armed.'; exit 1 }

$install = Get-YflInstallDir
$runtimeInstall = Join-Path $install 'runtime'
$windowsInstall = Join-Path $install 'windows'
New-Item -ItemType Directory -Path $runtimeInstall -Force | Out-Null
New-Item -ItemType Directory -Path $windowsInstall -Force | Out-Null
Copy-Item -Path (Join-Path $root 'runtime\*') -Destination $runtimeInstall -Recurse -Force
Copy-Item -Path (Join-Path $root 'windows\*') -Destination $windowsInstall -Recurse -Force

$secretPath = Join-Path $install 'maintenance-secret'
if (-not (Test-Path $secretPath)) {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $hex = -join ($bytes | ForEach-Object { $_.ToString('x2') })
    Set-Content -Path $secretPath -Value $hex -Encoding Ascii
    & icacls.exe $secretPath /inheritance:r /grant:r '*S-1-5-18:F' '*S-1-5-32-544:F' | Out-Null
}

$config = [ordered]@{
    schema = 1
    extensionId = $extensionId
    stateDir = $state
    user = $env:USERNAME
    pythonExe = $python.Exe
    pythonPrefix = @($python.Prefix)
}
$config | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $install 'config.json') -Encoding UTF8

$watchdog = Join-Path $windowsInstall 'policy-watchdog.ps1'
$taskCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $watchdog + '"'
& schtasks.exe /Create /TN 'YouTubeFocusLockPolicyWatchdog' /SC MINUTE /MO 1 /TR $taskCommand /RU SYSTEM /RL HIGHEST /F | Out-Null

# Replace the easy preview startup entry with the installed locked-mode runtime.
$startup = Get-YflStartupFile
$prefix = if ($python.Prefix.Count -gt 0) { ($python.Prefix -join ' ') + ' ' } else { '' }
$line = '@echo off' + "`r`n" + 'start "" /min "' + $python.Exe + '" ' + $prefix + '"' + (Join-Path $runtimeInstall 'challenge_ui.py') + '" serve --mode locked --port 43871 --state-dir "' + $state + '"' + "`r`n"
Set-Content -Path $startup -Value $line -Encoding Ascii
Start-YflUi -RuntimeDir $runtimeInstall -Mode 'locked' -StateDir $state -Python $python

& (Join-Path $windowsInstall 'policy-watchdog.ps1')
& schtasks.exe /Run /TN 'YouTubeFocusLockPolicyWatchdog' | Out-Null
Set-Content -Path (Join-Path $state 'armed-at') -Value (Get-YflNow) -Encoding Ascii

Write-Host ''
Write-Host 'Windows locked mode armed.'
Write-Host 'The SYSTEM watchdog reapplies Brave policy every minute unless a valid signed 10-minute maintenance token exists.'
Write-Host 'Use the extension popup -> Disable / uninstall... -> solve the fresh five-problem challenge for the supported maintenance path.'
Write-Host 'This is strong friction, not an absolute boundary against a deliberate local Administrator bypass.'
