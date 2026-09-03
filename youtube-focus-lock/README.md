# YouTube Focus Lock v2

A Brave + macOS focus blocker that allows YouTube only **11:00 AM–12:00 PM America/New_York** and uses a five-problem Python challenge for locked-mode maintenance/uninstall.

## What changed in v2
- The coding judge is testable **during the removable 60-minute burn-in**.
- The popup shows judge health and **Test coding challenge** before lock mode.
- Challenge pool is **120 original objective problems** (24 algorithm families × 5 variants).
- Each challenge contains 5 different families: **3 Medium + 2 Hard**.
- Editor autosaves to disk and survives tab/window/Brave/judge-process restarts for a fixed 60-minute session.
- Compile/run results distinguish syntax errors, runtime exceptions, timeout, wrong answer, and PASS.
- Syntax/runtime failures get diagnostic hints; wrong answers get progressive conceptual hints.
- Preview and locked challenge sessions are separate; preview can never disable/uninstall the blocker.

## Burn-in / preview setup

```bash
npm test
python3 macos/problem_bank.py
python3 macos/challenge_gate.py self-test
python3 macos/challenge_ui.py self-test
(cd macos && python3 -m unittest -v test_challenge_system.py)
bash macos/install-dev.sh
```

Then load this directory from `brave://extensions` using **Load unpacked**. The preview judge starts automatically as a removable user LaunchAgent at:

`http://127.0.0.1:43871/`

Open the extension popup and choose **Test coding challenge**. This works during burn-in and cannot change the blocker.

To stop only the preview service:

```bash
bash macos/stop-preview.sh
```

## Locking later
Locked Brave force-install on a personal Mac should use an **unlisted Chrome Web Store** version. After a clean 60-minute burn-in and after exercising the preview judge:

```bash
bash macos/prepare-lock.sh <32-character-extension-id>
```

Verify `brave://policy`, restart Brave, verify the popup says the browser lock policy is VERIFIED, and retest blocking. Only then:

```bash
bash macos/arm.sh
```

Arming replaces the preview judge with a fresh **locked** challenge namespace. Passing all five current saved solutions can grant a signed 10-minute maintenance window or allow the supported permanent uninstall path, after an independent privileged re-check.

## Important limitation
This is designed as strong productive friction, not an absolute security boundary. If your everyday macOS account remains an administrator, you retain the technical ability to deliberately dismantle local enforcement using root-level administration.

## Validation source of truth

The checked-out repository source at a specific commit is canonical. CI packages the source after deterministic checks. Do not use a binary ZIP checked into Git as the authoritative candidate. Cross-platform agents may run Stage A in `docs/LOCAL-AGENT-VALIDATION.md`; final pre-arm PASS still requires Stage B on the actual macOS/Brave machine.
