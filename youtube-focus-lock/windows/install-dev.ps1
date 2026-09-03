param()
. (Join-Path $PSScriptRoot 'common.ps1')

$root = Get-YflRoot
$runtime = Join-Path $root 'runtime'
$state = Get-YflStateDir
$python = Get-YflPython
Assert-YflPythonVersion $python
$brave = Get-YflBrave

New-Item -ItemType Directory -Path $state -Force | Out-Null
$burnin = Join-Path $state 'burnin-started-at'
if (-not (Test-Path $burnin)) {
    Set-Content -Path $burnin -Value (Get-YflNow) -Encoding Ascii
}

$startup = Get-YflStartupFile
$prefix = if ($python.Prefix.Count -gt 0) { ($python.Prefix -join ' ') + ' ' } else { '' }
$line = '@echo off' + "`r`n" +
    'start "" /min "' + $python.Exe + '" ' + $prefix + '"' + (Join-Path $runtime 'challenge_ui.py') + '" serve --mode preview --port 43871 --state-dir "' + $state + '"' + "`r`n"
Set-Content -Path $startup -Value $line -Encoding Ascii

Start-YflUi -RuntimeDir $runtime -Mode 'preview' -StateDir $state -Python $python

Write-Host ''
Write-Host 'Burn-in/dev mode is ready on Windows.'
Write-Host ''
Write-Host 'Coding challenge preview: http://127.0.0.1:43871/'
Write-Host 'The preview uses the same 120-problem runtime as locked mode.'
Write-Host 'Preview challenges can never disable or uninstall the blocker.'
Write-Host ''
Write-Host 'Brave extension setup:'
Write-Host '  1. Enable Developer mode at brave://extensions'
Write-Host '  2. Load unpacked and select:'
Write-Host ('     ' + $root)
Write-Host '  3. The popup should show Coding judge: READY and Test coding challenge.'
Write-Host ''
Write-Host 'Nothing anti-removal is installed during burn-in.'
Write-Host ('Stop only the preview service with: powershell -ExecutionPolicy Bypass -File "' + (Join-Path $root 'windows\stop-preview.ps1') + '"')

Start-Process -FilePath $brave -ArgumentList 'brave://extensions'
