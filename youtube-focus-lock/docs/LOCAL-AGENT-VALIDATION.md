# Local macOS Agent Validation — Mandatory Before Arming

> **Canonical candidate for this validation round:** `youtube-focus-lock/artifacts/YouTube-Focus-Lock-v2.1-PreArm.zip`
>
> Expected SHA-256: `4204a7b01cf838089b0bac9d8dcfc91f350e731c0d39b15c65a901cc6b5e2770`

The tracked source tree on this branch predates the v2.1 candidate. **Do not validate or arm from that older source tree.** For this round, the checked-in ZIP above is the exact candidate artifact and is the source of truth.

## Safety rule

Validate the **removable preview build only**. Do not run `prepare-lock.sh` and do not run `arm.sh`. Any failed assertion, missing dependency, broken button, visual defect, persistence failure, or policy change is a release blocker.

## Deterministic pass

From the repository root, run:

```bash
bash youtube-focus-lock/tests/macos/prearm-acceptance.sh
```

The wrapper verifies the candidate artifact SHA-256, extracts it into a clean temporary directory, installs test dependencies there, and runs the candidate's own macOS/Playwright pre-arm suite.

## Vision + computer-use pass

After the deterministic suite completes, use the actual Brave UI and inspect the screenshots in the extracted candidate's `test-results/` directory. Use real clicks/typing rather than inferring behavior from source.

Required real-UI checks:

1. Open `brave://extensions`; confirm **YouTube Focus Lock v0.2.x** is loaded unpacked and remains removable.
2. Open the extension popup and wait a few seconds. It must show **Coding judge: READY · preview · 120-problem pool**.
3. Click **Test coding challenge** with the mouse. It must open the localhost coding UI.
4. Enter invalid Python and click **Compile & Run**. Verify a compile error plus a useful hint.
5. Request Hint twice. Hints should progress without revealing hidden inputs or a complete answer.
6. Enter a unique marker, wait for **Saved on disk**, change tabs/windows, return, and confirm it remains.
7. Quit Brave fully, reopen it, reopen the challenge, and confirm the same unexpired five-problem set, marker, progress, and original countdown remain.
8. Run the candidate's `bash macos/stop-preview.sh`; confirm the popup reports the judge unavailable/starting and disables the challenge button.
9. Run the candidate's `bash macos/install-dev.sh`; without reloading the extension, confirm the popup recovers to READY and the button becomes clickable.
10. Disconnect networking and confirm the local judge and blocker still function outside the allowed window.
11. Confirm burn-in did **not** add `ExtensionInstallForcelist` or change `IncognitoModeAvailability`.

Capture/inspect screenshots for popup READY, challenge opened, compile error, persistence after Brave restart, preview stopped, and preview recovered. Fail if text is clipped/overlapped, controls are ambiguous, the timer is not visible, the editor is not clearly editable, or preview mode does not clearly state that it cannot disable/uninstall.

## Required report

Return a table with: test ID, PASS/FAIL, observed result, screenshot/evidence path, and defect if any.

End with exactly one of:

`PRE-ARM ACCEPTANCE: PASS`

or

`PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM`

A PASS is required before any soft-lock or arming work.