# YouTube Focus Lock

Brave/macOS focus extension that blocks YouTube except **11:00 AM–12:00 PM America/New_York**.

This project deliberately uses a staged rollout so an untested build is never made difficult to remove:

**unpacked development → 60-minute burn-in → soft policy lock → verify in Brave → arm watchdog**

Locked-mode maintenance uses five randomized original Python Medium/Hard algorithm problems. Passing all five produces a signed 10-minute maintenance token.

## Development

```bash
npm test
python3 macos/challenge_gate.py self-test
bash macos/install-dev.sh
```

Then load this directory from `brave://extensions` using **Load unpacked**.

## Before locked mode

Read:
- `docs/PDD.md`
- `docs/SDD.md`
- `docs/VALIDATION.md`

For a personal macOS machine, the reliable force-install path is an **unlisted Chrome Web Store publication**. Once you have the extension ID and the 60-minute burn-in is complete:

```bash
bash macos/prepare-lock.sh <32-character-extension-id>
```

Verify `brave://policy` and the extension popup. Only then:

```bash
bash macos/arm.sh
```

## Maintenance/uninstall after arming

```bash
python3 "/Library/Application Support/YouTubeFocusLock/challenge_gate.py" start
```

Solve the five generated `solution.py` files and run the check command it prints. After all five pass, run the printed privileged `unlock` command. The signed maintenance token lasts 10 minutes, during which:

```bash
sudo "/Library/Application Support/YouTubeFocusLock/uninstall-locked.sh"
```

## Important limitation

This is strong **friction**, not an absolute security boundary. If your everyday macOS account remains an administrator, you retain the technical ability to use `sudo`/root access to dismantle local enforcement deliberately. The project does not hide or disable those administration paths.
