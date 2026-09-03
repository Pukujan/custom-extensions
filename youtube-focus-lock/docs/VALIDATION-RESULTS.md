# Validation Status — YouTube Focus Lock 0.3

This file records the validation boundary, not a promise that a particular workstation has passed. The checked-out Git commit is canonical; GitHub Actions and the target-OS local acceptance report are the authoritative evidence.

## Defects discovered in earlier rounds

### Popup challenge button disabled

The popup health request needed valid loopback host permissions. Chromium extension match patterns do not put a port in `host_permissions`. The manifest now grants `http://127.0.0.1/*` and `http://localhost/*`; code still contacts only port 43871. Source/unit and real-Brave Playwright regressions cover the button.

### Threaded judge used `os.fork()`

Candidate evaluation was moved to a fresh subprocess worker. The shared runtime has no `os.fork()` path. macOS can drop UID/GID in the worker; Windows uses a normal-user subprocess plus a short-lived proof before UAC.

### Windows was treated as partial support

This violated the product requirement. Version 0.3 moved the bank/judge/UI into shared `runtime/`, added Windows burn-in/soft-lock/arm/watchdog/maintenance/uninstall adapters, added Windows real-Brave Playwright acceptance, and changed CI to a Windows + macOS matrix. Windows and macOS are now first-class supported targets.

### Binary artifact was incorrectly made canonical

The source Git commit is now canonical. CI creates the downloadable ZIP from that exact commit only after both platform jobs pass. No checked-in ZIP is an authority.

## Automated requirements

A release candidate must pass the same shared-runtime suite on both Windows and macOS:

- extension Node tests;
- 120 problem IDs / 24 families objective-bank validation;
- balanced 5-problem selection (3 Medium + 2 Hard, distinct families);
- shared challenge-gate self-test;
- shared challenge-UI self-test;
- persistence/HTTP integration tests;
- Windows proof/hash-binding/expiry tests;
- source/provenance checks;
- Python/JavaScript/manifest validation;
- matching platform-adapter syntax checks.

Packaging is downstream of both OS jobs, so a failure on either OS blocks the artifact.

## Real workstation requirements

CI is necessary but insufficient because hosted runners do not certify the user's installed Brave, startup integration, or real desktop interactions.

On a Windows target run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/windows/prearm-acceptance.ps1
```

On a macOS target run:

```bash
bash tests/macos/prearm-acceptance.sh
```

Then complete `docs/LOCAL-AGENT-VALIDATION.md` using the actual Brave UI, real clicks/typing, screenshots/vision, full Brave restart, service stop/restart, offline behavior, and no-policy-mutation checks.

A **Windows** workstation may produce `PRE-ARM ACCEPTANCE: PASS` from the Windows suite + Windows real-UI rubric. A **Mac** may do the same with the macOS suite + macOS real-UI rubric. Neither platform is subordinate to the other.

## Locking rule

Do not execute any `prepare-lock` or `arm` script until the target machine itself ends its pre-arm report with exactly:

`PRE-ARM ACCEPTANCE: PASS`

Anything else means:

`PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM`
