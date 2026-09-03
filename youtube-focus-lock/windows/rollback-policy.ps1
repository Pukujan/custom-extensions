param()
. (Join-Path $PSScriptRoot 'common.ps1')
Assert-YflAdministrator
Remove-YflPolicies
Remove-Item (Join-Path (Get-YflStateDir) 'extension-id') -Force -ErrorAction SilentlyContinue
Write-Host 'Windows soft-lock Brave policies removed. No persistent watchdog changes were made.'
