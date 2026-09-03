param(
    [Parameter(Mandatory=$true)][string]$ExtensionId
)
. (Join-Path $PSScriptRoot 'common.ps1')

Assert-YflAdministrator
if ($ExtensionId -notmatch '^[a-p]{32}$') {
    throw 'Invalid Chromium extension ID. Expected 32 letters in the range a-p.'
}

$state = Get-YflStateDir
$burnin = Join-Path $state 'burnin-started-at'
$preview = Join-Path $state 'preview-judge-validation.json'
if (-not (Test-Path $burnin)) { throw 'Burn-in marker missing. Run windows\install-dev.ps1 first.' }
$started = [int64](Get-Content $burnin -Raw).Trim()
$now = Get-YflNow
if (($now - $started) -lt 3600) {
    throw ('Burn-in is not complete. {0}s remaining.' -f (3600 - ($now - $started)))
}
if (-not (Test-Path $preview)) {
    throw 'Coding-judge preview has not been exercised during this burn-in. Open Test coding challenge and press Compile & Run at least once.'
}
$previewData = Get-Content $preview -Raw | ConvertFrom-Json
if ([int64]$previewData.lastRunAt -lt $started) {
    throw 'The coding-judge validation marker predates this burn-in. Test it again before locking.'
}

Set-Content -Path (Join-Path $state 'extension-id') -Value $ExtensionId -Encoding Ascii
Set-YflPolicies -ExtensionId $ExtensionId

Write-Host ''
Write-Host 'Windows soft-lock policy written. Persistent enforcement is NOT armed yet.'
Write-Host 'Verify:'
Write-Host '  1. Fully quit/reopen Brave.'
Write-Host '  2. Reload brave://policy.'
Write-Host ('  3. ExtensionInstallForcelist contains ' + $ExtensionId + '.')
Write-Host '  4. Popup reports Browser lock policy: VERIFIED.'
Write-Host '  5. YouTube remains blocked outside the daily window.'
Write-Host 'If anything is wrong, run windows\rollback-policy.ps1. Do not arm.'
Start-Process -FilePath (Get-YflBrave) -ArgumentList 'brave://policy'
