# Test Design Document — YouTube Focus Lock 0.3

## Purpose

The supported desktop platforms are **Windows 10/11** and **macOS**. A change is not release-ready if the shared challenge runtime passes on one supported OS but fails on the other.

The repository source at a Git commit is canonical. CI packages that exact commit only after both OS jobs pass.

## Test layers

### T0 — static/provenance

Runs on Windows and macOS.

- Manifest parses and contains valid loopback host match patterns.
- Required runtime, Windows adapter, macOS adapter, PDD/SDD/TDD/validation, and Playwright files exist.
- No checked-in ZIP is treated as canonical.
- No `os.fork()` judge path.
- Shared runtime includes both Windows and POSIX maintenance paths.
- CI itself contains `windows-latest` and `macos-latest` gates.

Entry point: `python tests/prearm_source_check.py`.

### T1 — extension unit tests

Runs on Windows and macOS CI.

- 11:00 AM inclusive / 12:00 PM exclusive schedule boundaries.
- DST behavior in America/New_York.
- YouTube/Shorts/Music/`youtu.be`/nocookie URL classification.
- lookalike-domain rejection.
- burn-in timing and health failure behavior.

Entry point: `npm test`.

### T2 — shared Python runtime tests

Runs unchanged on Windows and macOS CI.

- exactly 120 selectable problem IDs;
- 24 algorithm families, 5 variants each;
- every generated case has an objective reference answer;
- challenge selection is 5 distinct families, 3 Medium + 2 Hard;
- syntax, runtime, timeout, wrong-answer, and pass classification;
- fresh subprocess execution instead of thread-unsafe fork;
- fixed 60-minute expiry;
- disk-backed code/progress persistence across server restart;
- exact-code hash invalidates PASS after edits;
- preview mode rejects maintenance/uninstall;
- Windows proof is short-lived and bound to the exact five saved files.

Entry points:

```text
python runtime/problem_bank.py
python runtime/challenge_gate.py self-test
python runtime/challenge_ui.py self-test
python runtime/test_challenge_system.py -v
```

### T3 — browser E2E

Runs on the target workstation because CI runners do not guarantee Brave is installed.

Playwright must launch the **actual Brave executable**, not bundled Chromium.

Required checks:

- extension service worker loads;
- popup reaches `Coding judge: READY`;
- `Test coding challenge` is enabled;
- clicking it opens `http://127.0.0.1:43871/`;
- editor renders five problems and 120-problem pool label;
- compile errors and hints render;
- autosave survives page close/reopen;
- preview UI exposes no maintenance/uninstall controls.

Entry point: `npm run test:playwright`.

### T4 — OS adapter pre-arm acceptance

#### Windows

`powershell -NoProfile -ExecutionPolicy Bypass -File tests/windows/prearm-acceptance.ps1`

Must verify:

- shared runtime tests pass on Windows Python;
- all PowerShell adapters parse;
- actual Brave Playwright tests pass;
- `windows/install-dev.ps1` starts the persistent preview service;
- startup entry is created;
- preview health reports `platform=windows`, `mode=preview`, bank size 120;
- burn-in installer does not change Brave machine policy.

#### macOS

`bash tests/macos/prearm-acceptance.sh`

Must verify equivalent runtime, Brave, LaunchAgent, health, restart, and no-policy-mutation behavior.

### T5 — vision/computer-use acceptance

Mandatory on the actual target OS after T4. Use real clicks and typing; do not infer behavior from source.

Capture evidence for:

1. popup READY;
2. challenge opened by clicking the popup button;
3. compile error + hint;
4. persisted code after full Brave quit/reopen;
5. preview service stopped -> popup unavailable/button disabled;
6. preview service restarted -> popup READY/button enabled;
7. offline local judge operation;
8. preview remains removable and does not apply lock policy.

Any clipped controls, inaccessible editor, invisible timer, ambiguous preview/locked state, or failed persistence is a release blocker.

### T6 — soft-lock validation

Only after T0–T5 pass on the target OS.

- complete 60-minute burn-in;
- preview judge has been exercised during that burn-in;
- apply OS-specific soft policy;
- restart Brave;
- verify `brave://policy`;
- verify popup reports `Browser lock policy: VERIFIED`;
- verify rollback works;
- do **not** arm if rollback or policy verification fails.

### T7 — armed-mode validation

Performed only after a validated soft-lock stage.

- fresh locked challenge namespace (preview progress cannot unlock it);
- 5/5 required;
- exact code changes invalidate PASS;
- final second verification occurs before policy change;
- 10-minute signed maintenance window;
- watchdog restores policy after token expiration;
- permanent uninstall requires valid challenge/token path;
- admin/root deliberate bypass remains documented as out of scope.

## Platform security differences

Candidate Python is never intentionally executed with an elevated administrator token.

On macOS the root verifier can spawn the worker after dropping UID/GID to the normal user.

On Windows the normal-user runtime performs a fresh second five-problem verification immediately before UAC and writes a short-lived HMAC/hash-bound proof. The elevated helper verifies that proof and current code hashes, then signs the maintenance token. This is an impulse-friction mechanism, not a boundary against a determined local Administrator.

## Release rule

A commit may be packaged only after **Windows CI + macOS CI** pass. A machine may be armed only after T0–T6 pass on that machine's operating system. The final local report must end with exactly `PRE-ARM ACCEPTANCE: PASS`; otherwise arming is forbidden.
