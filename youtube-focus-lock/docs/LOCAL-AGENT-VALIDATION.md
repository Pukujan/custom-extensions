# Local Agent Validation — Mandatory Before Arming

The repository source at the checked-out commit is canonical. Do **not** substitute a chat ZIP, older branch, or unrelated artifact. CI packages this exact source only after Windows and macOS jobs pass.

## Safety rule

Validate **removable preview mode only**. Do not run `windows/prepare-lock.ps1`, `windows/arm.ps1`, `macos/prepare-lock.sh`, or `macos/arm.sh` during pre-arm acceptance. Any failed assertion, broken button, visual defect, persistence failure, or unexpected policy change is a release blocker.

## Identify the target OS

The product supports **Windows 10/11 and macOS**. Run the deterministic suite for the host you are actually validating.

### Windows target

From `youtube-focus-lock/`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/windows/prearm-acceptance.ps1
```

This is an official full deterministic acceptance path, not a partial source check. It must run the shared Python runtime on Windows, Playwright against the actual Windows Brave executable, and the actual Windows burn-in helper.

### macOS target

From `youtube-focus-lock/`:

```bash
bash tests/macos/prearm-acceptance.sh
```

It must run the same shared runtime plus the actual macOS LaunchAgent/Brave path.

## Vision + computer-use pass — both platforms

After the deterministic script exits 0, use the **actual Brave UI**, real mouse/keyboard interaction, and screenshot/vision inspection. Do not infer success from source code or HTTP responses alone.

1. Open `brave://extensions`. Confirm **YouTube Focus Lock v0.3.x** is loaded unpacked and remains removable.
2. Open the extension popup and wait a few seconds. It must visibly show **Coding judge: READY · preview · 120-problem pool**.
3. Click **Test coding challenge** with the mouse. It must open `http://127.0.0.1:43871/`.
4. Confirm five problem buttons, the visible 60-minute countdown, editable Python area, Save, Compile & Run, and Hint.
5. Enter invalid Python and click **Compile & Run**. Verify Compile error, line information, and a useful diagnostic hint.
6. Request Hint twice. Hints must progress without revealing hidden test inputs or a complete solution.
7. Enter a unique marker, wait for **Saved on disk**, switch tabs/windows, return, and confirm it remains.
8. Fully quit Brave (not just close the challenge tab), reopen Brave, reopen the challenge, and confirm the same unexpired five-problem set, marker/code, pass state, and original expiry remain.
9. Stop the preview service using the platform command below. Confirm popup changes to unavailable/starting and **Test coding challenge** becomes disabled.
10. Restart the preview service using the platform command below. Without reloading the extension, confirm popup returns to READY and the button becomes clickable.
11. Disconnect networking and confirm the localhost judge still runs and YouTube blocking outside the access window does not depend on network access.
12. Confirm preview/burn-in did not apply anti-removal policy.

### Windows service commands

```powershell
powershell -ExecutionPolicy Bypass -File windows/stop-preview.ps1
powershell -ExecutionPolicy Bypass -File windows/install-dev.ps1
```

For policy evidence, compare `HKLM\SOFTWARE\Policies\BraveSoftware\Brave` before and after burn-in setup. The dev installer must not add/change the lock policies.

### macOS service commands

```bash
bash macos/stop-preview.sh
bash macos/install-dev.sh
```

Compare `ExtensionInstallForcelist` and `IncognitoModeAvailability` before/after burn-in setup.

## Required screenshots/evidence

Capture at minimum:

- popup READY;
- challenge opened from a real popup click;
- compile error + hint;
- persistence after full Brave restart;
- preview stopped / button disabled;
- preview restarted / button enabled.

Fail if controls are clipped/overlapped, the timer is not obvious, the editor is not clearly editable, preview/locked state is ambiguous, or the service cannot recover without reloading the extension.

## Required report

Return a table with: test ID, PASS/FAIL, observed result, evidence/screenshot path, defect if any.

A Windows machine may produce the final PASS when the **Windows deterministic suite + Windows real-UI rubric** pass. A Mac may do the same with the macOS suite/rubric. Do not require a Mac to validate a Windows installation or vice versa.

End with exactly one of:

`PRE-ARM ACCEPTANCE: PASS`

or

`PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM`

A PASS is required before any soft-lock or arming work on that machine.
