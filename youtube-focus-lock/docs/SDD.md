# Software Design Document — YouTube Focus Lock 0.3

## 1. Architecture

The application is split into three layers:

1. **Brave extension** — identical on Windows and macOS.
2. **Shared runtime (`runtime/`)** — identical Python problem bank, judge, persistence server, and browser UI on both supported OSes.
3. **Platform adapters (`windows/`, `macos/`)** — startup/service management, elevation, Brave policy storage, watchdog, rollback, and uninstall.

No problem-selection or judging logic belongs in a platform adapter.

## 2. Brave extension

- `src/service-worker.js`: timezone-aware DNR enforcement, alarms, fail-closed fallback.
- `src/content-guard.js`: second enforcement path for already-open YouTube documents.
- `status.html` / `src/status.js`: block state, burn-in status, browser-policy verification, localhost judge health, test/maintenance button.
- Loopback host permissions are `http://127.0.0.1/*` and `http://localhost/*`; the popup itself connects only to port 43871.

## 3. Shared runtime

### `runtime/problem_bank.py`

Defines 24 algorithm families × 5 variants = 120 selectable problem IDs. Each spec contains difficulty/title/function/prompt/hints/reference implementation and deterministic randomized case generation from `(problem_id, seed)`. Selection chooses five distinct families with exactly three Medium and two Hard problems.

### `runtime/challenge_gate.py`

Cross-platform responsibilities:

- challenge creation;
- Python compile diagnostics;
- candidate execution in a fresh subprocess;
- compile/runtime/timeout/wrong/pass classification;
- hints;
- token signing/validation;
- Windows pre-UAC proof creation/validation;
- POSIX UID/GID drop for privileged macOS re-verification.

On all OSes the parent uses an external timeout. On POSIX, `resource`/`signal` limits add CPU/address-space/file-size constraints. On Windows, `CREATE_NO_WINDOW` is used for worker processes and the external timeout remains the hard runaway guard.

### `runtime/challenge_ui.py`

Localhost-only threaded HTTP server:

- binds `127.0.0.1:43871`;
- random per-session API token;
- same-origin POST validation;
- CSP, X-Frame-Options DENY, no-store;
- preview/locked namespaces;
- disk-backed code/progress;
- platform-specific elevated action dispatch only after 5/5.

Static assets are `runtime/challenge_ui.html`, `.css`, and `.js`.

The server accepts `--state-dir`, enabling deterministic isolated tests on both Windows and macOS.

## 4. State model

User state is `~/.youtube-focus-lock` (`%USERPROFILE%\.youtube-focus-lock` on Windows).

Per challenge:

- `challenge.json`: schema, ID, mode, creation/expiry, selected IDs/seeds/directories;
- `progress.json`: API token, selected index, saved/pass hashes, attempts, hint level, last result;
- five `solution.py` files.

Mode pointers are `active-challenge-preview.json` and `active-challenge-locked.json`.

PASS requires `passed == true` and `passedHash == SHA256(current solution.py)`. Editing code clears it. Session expiry is immutable.

## 5. Windows adapter

### Burn-in

`windows/install-dev.ps1` discovers Python 3.9+ and Brave, starts the shared runtime in preview mode, creates an easy-to-remove user Startup entry, and opens `brave://extensions`. It does not write machine policy.

### Soft lock

`windows/prepare-lock.ps1` requires Administrator authorization, 60 elapsed burn-in minutes, and a preview run marker from the current burn-in. It writes Brave policy under:

`HKLM\SOFTWARE\Policies\BraveSoftware\Brave`

`ExtensionInstallForcelist` is a numbered string-list subkey and `IncognitoModeAvailability` is a DWORD.

### Armed mode

`windows/arm.ps1` copies runtime/adapter files to `%ProgramData%\YouTubeFocusLock`, creates a root maintenance secret restricted to SYSTEM/Administrators, replaces the preview Startup entry with locked mode, and creates `YouTubeFocusLockPolicyWatchdog` as a SYSTEM Scheduled Task every minute.

### Windows final verification

Candidate Python is **not** executed after UAC elevation. When 5/5 is complete, the normal-user runtime immediately re-runs all five in fresh worker subprocesses and creates `maintenance-proof.json`, valid for at most two minutes and HMAC/hash-bound to the exact five solution files. `windows/maintenance.ps1` is then elevated. The elevated `unlock --platform windows` validates the proof and hashes and signs the 10-minute machine maintenance token.

Because the owner retains Administrator rights, this is productive friction rather than an adversarial security boundary.

### Watchdog

`windows/policy-watchdog.ps1` runs as SYSTEM. A valid signed maintenance token temporarily removes force-install/incognito policy; otherwise it restores them. It uses the exact Python interpreter captured during arming to validate the HMAC token.

## 6. macOS adapter

### Burn-in

`macos/install-dev.sh` creates a removable user LaunchAgent that runs `runtime/challenge_ui.py --mode preview`.

### Soft lock

`macos/prepare-lock.sh` checks burn-in + preview marker, then writes Brave preference policy. The watchdog is not installed yet.

### Armed mode

`macos/arm.sh` installs the shared runtime under `/Library/Application Support/YouTubeFocusLock/runtime`, platform scripts under `/Library/Application Support/YouTubeFocusLock/macos`, a user locked-mode LaunchAgent, and a root LaunchDaemon watchdog.

### macOS final verification

The root verifier re-runs every solution in a fresh child process configured to drop supplementary groups/GID/UID to the normal user before importing candidate code, then signs the token.

## 7. Diagnostics

Compile errors include line/offset/source text and heuristic syntax hints. Runtime exceptions map common categories to practical hints. Timeouts suggest complexity directions. Wrong answers reveal no hidden inputs and escalate conceptual hints on repeated attempts.

## 8. Browser E2E

`playwright.config.mjs` starts the shared preview server through a cross-platform Node launcher. `tests/e2e/brave-popup.spec.mjs` selects the real Brave executable on Windows or macOS, derives the unpacked extension ID from its service worker, confirms the popup reaches READY, and clicks **Test coding challenge** into localhost.

## 9. CI

GitHub Actions uses a Windows/macOS matrix. Both OSes run the same shared runtime self-tests, integration/persistence suite, source checks, JavaScript checks, and manifest checks. Platform-script syntax is validated on the matching runner. Packaging occurs only after both jobs pass.

## 10. Threat model

Designed against casual/impulsive browser disable/remove, private-window bypass, stale PASS reuse, simple maintenance-token editing, preview-progress reuse, and service-worker suspension.

Not designed to defeat a deliberate Administrator/root owner who edits registry/preferences, scheduled tasks/LaunchDaemons, source files, browser installation, or OS recovery state.
