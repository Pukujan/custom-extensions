# Software Design Document — YouTube Focus Lock

## Components

### Brave extension (Manifest V3)
- `src/service-worker.js`: owns dynamic Declarative Net Request rules and alarms.
- `src/content-guard.js`: second enforcement path for already-open YouTube documents; checks once per second and redirects after the access window closes.
- `blocked.html`: local block page with countdown to the next access boundary.
- `status.html`: shows current block state, burn-in status, and whether Brave reports that the extension may be disabled.
- `lib/schedule.mjs`: pure timezone-aware schedule logic.
- `lib/urls.mjs`: YouTube domain classification and DNR rule generation.
- `lib/burnin.mjs`: pure burn-in eligibility logic.

The service worker is fail-closed: if enforcement throws, it attempts to install blocking rules and redirect open YouTube tabs before recording a health failure.

### macOS soft-lock stage
`macos/prepare-lock.sh` writes Brave policy values using the documented macOS Brave preference domain. It does **not** install persistent enforcement. The operator must verify `brave://policy` and the extension popup before arming.

### macOS persistent policy watchdog
`macos/arm.sh` installs a transparent root-owned LaunchDaemon. Every 30 seconds it reapplies:
- the extension force-install policy;
- private-window disable policy.

The daemon is intentionally visible and documented. A user with administrator/root access can unload it deliberately.

### Distribution constraint
For a personal macOS device, the locked deployment should use an **unlisted Chrome Web Store version** of the extension. Chromium documents that self-hosted extensions on macOS require an enterprise-managed environment for force installation. Development and burn-in use Brave's unpacked-extension flow.

### Coding challenge gate
`macos/challenge_gate.py` contains an original problem bank (not scraped/copied LeetCode prompts). Each challenge randomly selects 5 of 8 problem types and generates randomized hidden cases from per-problem seeds.

Workflow:
1. Normal user runs `challenge_gate.py start`.
2. Five directories containing prompts and `solution.py` stubs are created.
3. Normal user can run `check` for feedback.
4. Final `unlock` is run with `sudo`.
5. The privileged verifier forks a child for each problem, clears supplementary groups, drops UID/GID to the target normal user, then imports and tests the solution.
6. If every problem passes, root signs a 10-minute token with HMAC-SHA256 using a root-owned 256-bit secret.
7. `uninstall-locked.sh` validates signature and expiry before removing the LaunchDaemon and Brave policies.

The resource limits around candidate Python protect mainly against accidental runaway code; they are not presented as a sandbox for hostile programs.

## Security model
Protected against casual/impulsive actions:
- Remove/Disable in Brave after policy verification.
- Private-window bypass.
- Simple deletion of the maintenance token or forging its JSON contents.
- Accidental extension service-worker suspension (content script + alarm/DNR defense in depth).

Not protected against a determined administrator:
- `sudo` removal/modification of the LaunchDaemon, root-owned helper, or policy preferences.
- Booting/reinstalling macOS or modifying the browser installation/profile offline.
- Reading source code and intentionally engineering a bypass.

This limitation is intrinsic to keeping the everyday account as a macOS administrator.
