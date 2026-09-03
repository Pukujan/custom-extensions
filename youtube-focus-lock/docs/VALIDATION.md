# Validation Plan — YouTube Focus Lock 0.3

Do **not** arm persistent enforcement until every applicable pre-arm item passes on the target operating system.

## Round 1 — cross-platform CI

GitHub Actions must pass on both `windows-latest` and `macos-latest` for the same commit. Both run:

```text
npm test
python runtime/problem_bank.py
python runtime/challenge_gate.py self-test
python runtime/challenge_ui.py self-test
python runtime/test_challenge_system.py -v
python tests/prearm_source_check.py
python -m py_compile ...
node --check ...
```

Windows additionally parses every `.ps1`; macOS runs `bash -n` over shell adapters. Packaging is blocked until both jobs succeed.

## Round 2 — target-OS deterministic pre-arm

### Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/windows/prearm-acceptance.ps1
```

This must run the shared runtime and persistence tests under Windows Python, drive the actual installed Brave through Playwright, start the real Windows preview helper, verify localhost health, verify the user Startup entry, and prove the burn-in installer did not mutate machine policy.

### macOS

```bash
bash tests/macos/prearm-acceptance.sh
```

Equivalent requirements apply to real Brave and the user LaunchAgent.

## Round 3 — real UI / vision / computer use

After the deterministic suite, a local agent must use real clicks/typing on the same machine and inspect screenshots.

Required evidence on **either supported target OS**:

1. Brave extension is loaded unpacked and removable.
2. Popup visibly shows `Coding judge: READY · preview · 120-problem pool`.
3. **Test coding challenge** is enabled and a real click opens `http://127.0.0.1:43871/`.
4. Invalid Python produces Compile error + useful hint.
5. Hint requests progress without disclosing hidden input/full answer.
6. A unique saved marker survives tab/window changes.
7. Full Brave quit/reopen restores the same unexpired five-problem set, code, pass state, and original expiry.
8. Stopping the OS preview service makes popup show unavailable and disables the button.
9. Restarting the OS preview service restores READY without reloading the extension.
10. Disconnecting networking does not break local judge/blocking.
11. Burn-in did not apply force-install/private-window policy.

Fail for clipped controls, hidden timer, ambiguous preview/locked state, inaccessible editor, failed persistence, or any unexpected policy change.

## Round 4 — schedule/blocker validation

- 10:59 New York: blocked.
- 11:00: allowed.
- 11:59: allowed.
- 12:00: blocked and existing tab exits promptly.
- YouTube/Shorts/Music/`youtu.be`/nocookie covered.
- lookalike domains unblocked.
- offline blocking works.
- Brave restart does not permanently disable enforcement.

## Round 5 — soft lock

Only after Rounds 1–4 pass and the 60-minute burn-in completes.

### Windows

Run elevated:

```powershell
powershell -ExecutionPolicy Bypass -File windows/prepare-lock.ps1 -ExtensionId <id>
```

Then fully restart Brave, reload `brave://policy`, verify `ExtensionInstallForcelist`, verify popup browser lock **VERIFIED**, re-test blocker, and demonstrate `windows/rollback-policy.ps1`.

### macOS

```bash
bash macos/prepare-lock.sh <id>
```

Perform the equivalent `brave://policy`/popup/blocker/rollback checks.

Any failure means rollback and **DO NOT ARM**.

## Round 6 — armed mode

Only after validated soft lock.

- arming creates a fresh locked challenge namespace;
- normal browser disable/remove unavailable;
- private-window policy active;
- OS watchdog restores policy;
- preview session cannot unlock maintenance;
- <5 PASS rejects maintenance/uninstall;
- editing a passed solution invalidates PASS;
- final second 5/5 verification occurs before elevated policy change;
- candidate Python never runs under the Windows Administrator token or macOS root token;
- signed token lasts 10 minutes;
- modified/expired token rejected;
- watchdog restores policy after token expiry;
- supported uninstall requires valid token.

## Diagnostic matrix

- bad colon/indentation -> Compile error + line/source/hint;
- `NameError`, `IndexError`, etc. -> Runtime error + category-specific hint;
- runaway loop -> timeout + complexity hint;
- wrong objective output -> Wrong answer + conceptual hint;
- manual Hint -> progressive conceptual hints;
- correct hidden tests -> PASS;
- edit after PASS -> PASS clears immediately.

## Final gate

A target Windows machine may issue final pre-arm PASS after the Windows deterministic suite + real-UI rubric pass. A target Mac may issue final pre-arm PASS after the macOS deterministic suite + real-UI rubric pass. It is **not** valid to say Windows is only partially supported.

The final report must end with exactly one of:

`PRE-ARM ACCEPTANCE: PASS`

or

`PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM`
