# Validation Status — YouTube Focus Lock 0.3

The checked-out Git commit is canonical. CI and the target-OS local acceptance report are authoritative; no chat ZIP is a source of truth.

## Defects discovered and fixed

### Popup challenge button disabled

The extension health fetch needed valid loopback host permissions. The manifest now grants `http://127.0.0.1/*` and `http://localhost/*` while code still contacts only port 43871. Real-Brave Playwright tests cover READY state, enabled **Test coding challenge**, and the popup click into localhost.

### Threaded judge used `os.fork()`

Candidate evaluation now uses a fresh subprocess worker. There is one shared `runtime/` implementation. On macOS the privileged verifier can drop UID/GID before candidate import; on Windows candidate code is re-run under the normal user before UAC and the elevated helper validates a short-lived proof instead of executing candidate Python as Administrator.

### Windows was treated as partial support

Version 0.3 makes Windows 10/11 and macOS first-class targets. The bank/judge/UI live in shared `runtime/`; `windows/` and `macos/` contain only service/policy/elevation adapters. Windows has removable burn-in, soft lock, rollback, SYSTEM watchdog, maintenance, and uninstall paths plus a full Windows pre-arm acceptance script.

### Binary artifact was incorrectly canonical

Git source is canonical. CI packages the exact `youtube-focus-lock/` subtree only after both OS jobs pass.

## Cross-platform automated validation executed

GitHub Actions run **33712353542** executed the same source on both hosted OSes and completed successfully:

- `runtime (windows-latest)`: **PASS**
- `runtime (macos-latest)`: **PASS**
- exact-source package job: **PASS**

Both runtime jobs passed:

- extension Node tests;
- 120 problem IDs / 24-family objective-bank validation;
- balanced 5-problem selection rules;
- shared challenge-gate self-test;
- shared challenge-UI self-test;
- persistence/HTTP integration tests;
- Windows proof hash-binding/expiry regressions;
- source/provenance checks;
- Python compilation;
- JavaScript + manifest validation;
- platform-matching adapter syntax validation.

This proves that the shared challenge runtime and its automated integration suite execute on **both Windows and macOS**. It does not replace the real workstation test below.

## Real workstation acceptance still required

### Windows target

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/windows/prearm-acceptance.ps1
```

### macOS target

```bash
bash tests/macos/prearm-acceptance.sh
```

Then complete `docs/LOCAL-AGENT-VALIDATION.md` using actual Brave, real clicks/typing, screenshots/vision, full Brave restart, service stop/restart, offline operation, and no-policy-mutation evidence.

A Windows workstation may issue the final PASS after its Windows deterministic suite + Windows real-UI rubric pass. A Mac may do the same with its macOS suite/rubric. Neither platform depends on the other platform's local desktop test.

## Locking rule

Do not run any `prepare-lock` or `arm` script until the target machine itself ends its report with exactly:

`PRE-ARM ACCEPTANCE: PASS`

Anything else means:

`PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM`
