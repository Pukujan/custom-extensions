# Validation Plan

Do **not** run `macos/arm.sh` until every pre-arm item passes.

## Automated
From the extension directory:

```bash
npm test
python3 macos/challenge_gate.py self-test
bash -n macos/*.sh
```

Current baseline: 16 Node tests plus the 8-problem challenge-bank self-test.

## Burn-in — 60 minutes
1. Run `macos/install-dev.sh`.
2. Load the extension unpacked in Brave.
3. Confirm the extension popup shows no health failure.
4. Browse/restart Brave normally during the hour.
5. If the extension records an enforcement failure, do not arm; fix the defect and restart burn-in.

## Schedule boundary checks
- 10:59 local schedule time: blocked.
- 11:00: allowed without reinstall/reload.
- 11:59: allowed.
- 12:00: an already-open YouTube tab redirects within approximately one second; a new navigation is blocked.

For development, changing `lib/config.mjs` to a nearby temporary window is acceptable, but restore 11:00–12:00 and rerun automated tests before publishing.

## URL checks
- `https://www.youtube.com/`
- `/watch`
- `/shorts`
- `music.youtube.com`
- `youtu.be`
- `youtube-nocookie.com/embed/...`
- a non-YouTube lookalike such as `youtube.com.example.org` must remain unblocked.

## Lifecycle checks
- Quit/reopen Brave.
- Mac sleep/wake.
- Disable network and reopen Brave; blocking outside the window must not depend on network access.
- Open a private window before locking; after soft lock, `IncognitoModeAvailability` should prevent private browsing.

## Soft-lock validation
After the extension is published unlisted in Chrome Web Store:
1. Run `macos/prepare-lock.sh <extension-id>`.
2. Restart Brave.
3. Open `brave://policy`, reload policies, and verify `ExtensionInstallForcelist` contains the extension ID.
4. Open the extension popup. It must report **Browser lock policy: VERIFIED** (`mayDisable == false`).
5. Test YouTube blocking again.
6. If anything is wrong, run `macos/rollback-policy.sh`. Do not arm.

## Coding-gate checks before arming
- `start` creates exactly 5 distinct problems.
- unsolved stubs fail.
- a correct solution passes local checking.
- privileged `unlock` refuses to run without root.
- privileged verifier executes candidate files under the target normal user's UID/GID.
- token changes invalidate HMAC validation.
- expired tokens are rejected.
- uninstall without a valid token is rejected.

## Post-arm smoke test
Immediately after `macos/arm.sh`:
- verify LaunchDaemon is loaded;
- wait >30 seconds, delete the user-level force-install policy, and confirm the watchdog restores it;
- verify Brave still reports the extension as non-disableable;
- do **not** test destructive uninstall until the coding-gate flow itself has been validated.
