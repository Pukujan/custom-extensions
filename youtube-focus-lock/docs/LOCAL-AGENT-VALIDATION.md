# Local Agent Validation — Mandatory Before Arming

The repository source tree at the checked-out commit is the canonical candidate. Do **not** substitute a chat attachment, an older ZIP, or another branch. GitHub CI packages this exact source tree after deterministic checks.

## Safety rule

Validate the **removable preview build only**. Do not run `macos/prepare-lock.sh` and do not run `macos/arm.sh`. Any failed assertion, missing dependency, broken button, visual defect, persistence failure, or unexpected policy change is a release blocker.

## Stage A — portable source/provenance validation

This part may run on Windows, macOS, or Linux. From `youtube-focus-lock/`:

```bash
npm install
npm test
python macos/problem_bank.py
python tests/prearm_source_check.py
python -m py_compile macos/problem_bank.py macos/challenge_gate.py macos/challenge_ui.py macos/test_challenge_system.py tests/prearm_source_check.py
node --check macos/challenge_ui.js
node --check src/status.js
```

Use `python3` or `py -3` instead of `python` when appropriate for the host. `challenge_gate.py` and `challenge_ui.py` intentionally use Unix/macOS modules such as `pwd` and `resource`; **do not execute their self-tests on Windows**. Stage A proves portable source structure, JavaScript/manifest regressions, the 120-problem bank, and Python syntax. It can never issue final pre-arm PASS.

On a Unix/macOS host, also run the engine/integration layer:

```bash
python3 macos/challenge_gate.py self-test
python3 macos/challenge_ui.py self-test
(cd macos && python3 -m unittest -v test_challenge_system.py)
```

## Stage B — mandatory macOS + real Brave acceptance

This must run on the **actual Mac that will use Brave**. From `youtube-focus-lock/`:

```bash
npm install
bash tests/macos/prearm-acceptance.sh
```

The deterministic macOS script must exit 0. Then perform the real-UI/vision rubric below.

## Vision + computer-use pass

Use the actual Brave UI and real clicks/typing. Do not infer behavior from source. Inspect screenshots in `test-results/`.

1. Open `brave://extensions`; confirm **YouTube Focus Lock v0.2.x** is loaded unpacked and remains removable.
2. Open the extension popup and wait a few seconds. It must show **Coding judge: READY · preview · 120-problem pool**.
3. Click **Test coding challenge** with the mouse. It must open the localhost coding UI.
4. Enter invalid Python and click **Compile & Run**. Verify a compile error plus a useful hint.
5. Request Hint twice. Hints must progress without revealing hidden inputs or a complete answer.
6. Enter a unique marker, wait for **Saved on disk**, change tabs/windows, return, and confirm it remains.
7. Quit Brave fully, reopen it, reopen the challenge, and confirm the same unexpired five-problem set, marker, progress, and original countdown remain.
8. Run `bash macos/stop-preview.sh`; confirm the popup reports the judge unavailable/starting and disables the challenge button.
9. Run `bash macos/install-dev.sh`; without reloading the extension, confirm the popup recovers to READY and the button becomes clickable.
10. Disconnect networking and confirm the local judge and blocker still function outside the allowed window.
11. Confirm burn-in did **not** add `ExtensionInstallForcelist` or change `IncognitoModeAvailability`.

Capture/inspect screenshots for popup READY, challenge opened, compile error, persistence after Brave restart, preview stopped, and preview recovered. Fail for clipped/overlapped text, ambiguous controls, invisible timer, unclear editor affordance, or missing preview-mode warning.

## Required report

Return a table with: test ID, PASS/FAIL, observed result, screenshot/evidence path, and defect if any.

If the host is not macOS, Stage A may be reported as PASS, but the overall report must end with exactly:

`PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM`

and state that Stage B was not executable on the required platform.

Only after **Stage A + Stage B + the vision/computer-use rubric** pass on the target Mac may the final report end with:

`PRE-ARM ACCEPTANCE: PASS`

A PASS is required before any soft-lock or arming work.
