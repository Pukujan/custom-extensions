Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Get-YflRoot {
    return (Split-Path -Parent $PSScriptRoot)
}

function Get-YflStateDir {
    return (Join-Path $env:USERPROFILE '.youtube-focus-lock')
}

function Get-YflInstallDir {
    $base = if ($env:PROGRAMDATA) { $env:PROGRAMDATA } else { 'C:\ProgramData' }
    return (Join-Path $base 'YouTubeFocusLock')
}

function Get-YflStartupFile {
    return (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\YouTubeFocusLock.cmd')
}

function Get-YflPolicyRoot {
    return 'HKLM:\SOFTWARE\Policies\BraveSoftware\Brave'
}

function Get-YflNow {
    return [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
}

function Get-YflPython {
    $python = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($python) { return [pscustomobject]@{ Exe = $python.Source; Prefix = @() } }
    $py = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($py) { return [pscustomobject]@{ Exe = $py.Source; Prefix = @('-3') } }
    throw 'Python 3.9+ is required. Install Python and ensure python.exe or py.exe is on PATH.'
}

function Assert-YflPythonVersion($Python) {
    $args = @($Python.Prefix) + @('-c', 'import sys; raise SystemExit(0 if sys.version_info >= (3,9) else 1)')
    & $Python.Exe @args
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.9+ is required.' }
}

function Get-YflBrave {
    $candidates = New-Object System.Collections.Generic.List[string]
    if ($env:ProgramFiles) {
        $candidates.Add((Join-Path $env:ProgramFiles 'BraveSoftware\Brave-Browser\Application\brave.exe'))
    }
    $pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
    if ($pf86) {
        $candidates.Add((Join-Path $pf86 'BraveSoftware\Brave-Browser\Application\brave.exe'))
    }
    if ($env:LOCALAPPDATA) {
        $candidates.Add((Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\Application\brave.exe'))
    }
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) { return $candidate }
    }
    throw 'Brave Browser was not found in the normal Windows install locations.'
}

function Test-YflAdministrator {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Assert-YflAdministrator {
    if (-not (Test-YflAdministrator)) { throw 'Run this PowerShell script as Administrator.' }
}

function Set-YflPolicies([string]$ExtensionId) {
    $root = Get-YflPolicyRoot
    $force = Join-Path $root 'ExtensionInstallForcelist'
    New-Item -Path $root -Force | Out-Null
    New-Item -Path $force -Force | Out-Null
    New-ItemProperty -Path $force -Name '1' -Value ($ExtensionId + ';https://clients2.google.com/service/update2/crx') -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $root -Name 'IncognitoModeAvailability' -Value 1 -PropertyType DWord -Force | Out-Null
}

function Remove-YflPolicies {
    $root = Get-YflPolicyRoot
    if (Test-Path (Join-Path $root 'ExtensionInstallForcelist')) {
        Remove-Item -Path (Join-Path $root 'ExtensionInstallForcelist') -Recurse -Force
    }
    if (Test-Path $root) {
        Remove-ItemProperty -Path $root -Name 'IncognitoModeAvailability' -ErrorAction SilentlyContinue
    }
}

function Test-YflHealth {
    try {
        $r = Invoke-RestMethod -Uri 'http://127.0.0.1:43871/health' -Method Get -TimeoutSec 1
        return [bool]$r.ok
    } catch { return $false }
}

function Stop-YflUiProcess {
    $state = Get-YflStateDir
    foreach ($name in @('challenge-ui.pid', 'challenge-ui-launcher.pid')) {
        $pidFile = Join-Path $state $name
        if (Test-Path $pidFile) {
            $pidValue = (Get-Content $pidFile -Raw).Trim()
            if ($pidValue -match '^\d+$') { Stop-Process -Id ([int]$pidValue) -Force -ErrorAction SilentlyContinue }
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        }
    }
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -match 'challenge_ui\.py.+43871' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Quote-YflProcessArg([string]$Value) {
    # Windows PowerShell's Start-Process joins ArgumentList into one command line.
    # Quote path-like values so repositories/state directories with spaces work.
    if ($Value -match '[\s"]') {
        return '"' + ($Value -replace '(\\*)"', '$1$1\"') + '"'
    }
    return $Value
}

function Start-YflUi([string]$RuntimeDir, [string]$Mode, [string]$StateDir, $Python) {
    Stop-YflUiProcess
    $script = Join-Path $RuntimeDir 'challenge_ui.py'
    $rawArgs = @($Python.Prefix) + @($script, 'serve', '--mode', $Mode, '--port', '43871', '--state-dir', $StateDir)
    $args = @($rawArgs | ForEach-Object { Quote-YflProcessArg ([string]$_) })
    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
    $proc = Start-Process -FilePath $Python.Exe -ArgumentList $args -WindowStyle Hidden -PassThru
    Set-Content -Path (Join-Path $StateDir 'challenge-ui-launcher.pid') -Value $proc.Id -Encoding Ascii
    for ($i = 0; $i -lt 40; $i++) {
        if (Test-YflHealth) { return }
        if ($proc.HasExited) { throw ('Coding challenge process exited early with code ' + $proc.ExitCode + '.') }
        Start-Sleep -Milliseconds 500
    }
    throw 'Coding challenge service did not become healthy on http://127.0.0.1:43871/.'
}
