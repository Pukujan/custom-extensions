# Validation Plan — YouTube Focus Lock v2

Do **not** arm persistent enforcement until every applicable pre-arm item passes.

## Automated CI / TDD
From `youtube-focus-lock/`:

```bash
npm test
python3 macos/problem_bank.py
python3 macos/challenge_gate.py self-test
python3 macos/challenge_ui.py self-test
(cd macos && python3 -m unittest -v test_challenge_system.py)
python3 -m py_compile macos/problem_bank.py macos/challenge_gate.py macos/challenge_ui.py macos/test_challenge_system.py
node --check macos/challenge_ui.js
node --check src/status.js
bash -n macos/*.sh
python3 -m json.tool manifest.json >/dev/null
```

Required automated assertions include:
- exactly 120 unique problem IDs;
- exactly 24 families × 5 variants;
- every generated objective test is accepted by its reference implementation;
- challenge selection always contains 5 distinct families, 3 Medium + 2 Hard;
- compile diagnostics include hints;
- preview state survives local-server restart;
- saved code survives server restart;
- preview HTTP action rejects uninstall/maintenance;
- changing saved code invalidates PASS;
- save/run activity does not extend the original 60-minute expiration.

## Burn-in validation — still removable
1. Run `bash macos/install-dev.sh`.
2. Load/reload the unpacked extension in Brave.
3. Confirm YouTube blocking works.
4. Open the extension popup and verify:
   - `Coding judge: READY`;
   - mode is `preview`;
   - pool is `120-problem pool`;
   - button says **Test coding challenge**.
5. Open the challenge and press Compile & Run at least once. `prepare-lock.sh` will later require this marker.
6. During the same 60-minute challenge:
   - type code and wait for autosave;
   - switch problems;
   - close the tab and reopen it;
   - quit/reopen Brave;
   - stop/restart the preview service (`stop-preview.sh`, then `install-dev.sh`);
   - verify the same problem set and saved code return while the fixed hour is unexpired.
7. Confirm reopening/restarting does not reset the challenge countdown.

## Judge diagnostic matrix
Exercise before lock:
- missing colon / bad indentation → **Compile error** with line and syntax hint;
- `NameError` or `IndexError` → **Runtime error** plus exception-specific hint;
- infinite/very slow loop → **Time limit exceeded** plus complexity hint;
- syntactically valid wrong return → **Wrong answer** plus conceptual hint;
- request Hint → progressive problem-family hint;
- correct solution → **PASS**;
- edit a passed solution → green PASS disappears until rerun succeeds.

## Blocker schedule checks
- 10:59 New York: blocked.
- 11:00: allowed.
- 11:59: allowed.
- 12:00: blocked; existing YouTube tab redirects promptly.
- YouTube, Shorts, Music, `youtu.be`, and `youtube-nocookie.com` embed paths are covered.
- lookalike domains remain unblocked.
- Brave restart and Mac sleep/wake do not permanently disable blocking.
- offline blocking still works.

## Soft-lock validation
Only after burn-in and preview validation:
1. Publish/use the unlisted Chrome Web Store build and obtain its extension ID.
2. Run `bash macos/prepare-lock.sh <extension-id>`.
3. Fully restart Brave.
4. Reload `brave://policy`.
5. Verify `ExtensionInstallForcelist` contains the expected ID.
6. Verify popup says browser lock policy **VERIFIED**.
7. Re-test YouTube blocking.
8. If anything fails, run `macos/rollback-policy.sh`; do not arm.

## Armed-mode validation
Immediately after `arm.sh`:
- popup judge health changes from `preview` to `locked`;
- locked challenge is a fresh set, not the preview set;
- challenge reports 120-problem pool and balanced difficulties;
- normal Brave disable/remove is unavailable;
- private browsing policy is active;
- watchdog restores policy after deliberate user-level policy deletion;
- a preview challenge cannot produce a maintenance token;
- a locked challenge with <5 PASS rejects actions;
- all five are independently re-run before token issuance;
- token modification invalidates it;
- expired token is rejected and watchdog restores policy;
- supported uninstall rejects missing/invalid token.

## Recovery validation
Before keeping armed mode long-term, document and test the intended administrative recovery path. The software must remain transparent about installed LaunchAgents/LaunchDaemons and files. It must never claim to defeat the Mac owner's administrator/root authority.

## Mandatory real-browser/macOS acceptance
The deterministic local suite is in `tests/macos/prearm-acceptance.sh`; the visual/computer-use rubric is `docs/LOCAL-AGENT-VALIDATION.md`.

Before arming, the actual Mac must pass both. In particular, a source-level or API-level health check is **not** sufficient: a real Brave popup must visibly report READY, the **Test coding challenge** button must be enabled, a real click must open the local judge, and screenshots must be reviewed.
