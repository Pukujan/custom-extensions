# YouTube Focus Lock 0.3

A **Windows + macOS** Brave focus blocker that allows YouTube only **11:00 AM–12:00 PM America/New_York** and uses a five-problem Python challenge for locked-mode maintenance/uninstall.

## Core behavior

- coding judge is testable immediately during the removable 60-minute burn-in;
- popup shows judge health and **Test coding challenge**;
- shared `runtime/` contains **120 original objective problem IDs** (24 algorithm families × 5 variants);
- each challenge uses 5 distinct families: **3 Medium + 2 Hard**;
- autosave/progress survive tabs, windows, full Brave restart, and local-service restart for a fixed 60-minute session;
- compile/runtime/timeout/wrong-answer/PASS states plus diagnostic/progressive hints;
- preview and locked sessions are separate;
- Windows and macOS run the same Python judge/editor; only OS service/policy/elevation adapters differ.

## Windows burn-in / preview

From PowerShell:

```powershell
npm install
npm test
python runtime/challenge_gate.py self-test
python runtime/challenge_ui.py self-test
python runtime/test_challenge_system.py -v
powershell -ExecutionPolicy Bypass -File windows/install-dev.ps1
```

Load this `youtube-focus-lock` directory from `brave://extensions` with **Load unpacked**. The preview judge runs at `http://127.0.0.1:43871/` and remains removable.

Stop/restart preview:

```powershell
powershell -ExecutionPolicy Bypass -File windows/stop-preview.ps1
powershell -ExecutionPolicy Bypass -File windows/install-dev.ps1
```

Full Windows pre-arm acceptance:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/windows/prearm-acceptance.ps1
```

## macOS burn-in / preview

```bash
npm install
npm test
python3 runtime/challenge_gate.py self-test
python3 runtime/challenge_ui.py self-test
python3 runtime/test_challenge_system.py -v
bash macos/install-dev.sh
```

Full macOS pre-arm acceptance:

```bash
bash tests/macos/prearm-acceptance.sh
```

## Locking later

Do not lock until the target machine's deterministic + real-Brave/vision/computer-use acceptance ends in `PRE-ARM ACCEPTANCE: PASS`, the 60-minute burn-in completes, and the preview judge was exercised during that burn-in.

Windows soft lock (elevated PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File windows/prepare-lock.ps1 -ExtensionId <32-character-extension-id>
```

macOS soft lock:

```bash
bash macos/prepare-lock.sh <32-character-extension-id>
```

Verify `brave://policy`, popup **Browser lock policy: VERIFIED**, blocker behavior, and rollback before arming.

Windows arm (elevated PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File windows/arm.ps1
```

macOS arm:

```bash
bash macos/arm.sh
```

## Validation documents

- `docs/PDD.md` — product contract
- `docs/SDD.md` — architecture/security model
- `docs/TDD.md` — test design and release gates
- `docs/VALIDATION.md` — validation rounds
- `docs/LOCAL-AGENT-VALIDATION.md` — instructions for Luna/Codex with real Brave + vision/computer use

The Git commit is the source of truth. CI tests the shared runtime on **Windows and macOS** and packages that exact commit only if both jobs pass.

## Important limitation

This is strong productive friction, not an absolute security boundary. A determined local Windows Administrator or macOS root owner can deliberately dismantle local enforcement. Candidate Python is never intentionally executed under the elevated Administrator/root token.
