# YouTube Focus Lock

Brave/macOS focus extension that blocks YouTube except **11:00 AM–12:00 PM America/New_York**.

The rollout is deliberately staged so an untested build is never made difficult to remove:

**unpacked development → 60-minute burn-in → soft policy lock → verify in Brave → arm watchdog**

## Locked-mode maintenance

After arming, the extension popup shows **Disable / uninstall…**. It opens a local-only coding judge at `http://127.0.0.1:43871/`.

The maintenance challenge:
- selects 5 randomized original Python Medium/Hard algorithm problems;
- provides a browser code editor with Save and Run buttons;
- autosaves code to disk;
- reports Python syntax/compile errors separately from hidden-test failures;
- saves which exact solutions passed;
- survives tab changes, window changes, Brave quit/reopen, and local UI process restarts;
- expires exactly 60 minutes after the challenge starts (activity does not extend it);
- invalidates a problem's PASS state if its saved code changes;
- independently re-runs all 5 solutions under the privileged verifier before maintenance/uninstall.

Passing all five can open a signed **10-minute maintenance window**. While that signed token is valid, the policy watchdog keeps running but temporarily relaxes the Brave force-install/private-window policies. When the token expires, the watchdog restores them. Permanent uninstall also requires all five solutions to pass the privileged re-check.

## Development / burn-in

```bash
npm test
python3 macos/challenge_gate.py self-test
python3 macos/challenge_ui.py self-test
bash macos/install-dev.sh
```

Then load this directory from `brave://extensions` using **Load unpacked**. Burn-in mode remains normally removable.

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

After arming, use the extension popup's **Disable / uninstall…** button for the supported maintenance path.

## Important limitation

This is strong **friction**, not an absolute security boundary. If your everyday macOS account remains an administrator, you retain the technical ability to use root-level macOS controls to deliberately dismantle local enforcement. The project does not hide or disable those administration paths.
