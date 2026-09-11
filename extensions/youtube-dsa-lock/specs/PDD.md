# PDD — YouTube DSA Lock

## Goal
Create useful friction before YouTube use without requiring a native service.

## Core contract
- Brave/Chrome on macOS and Windows.
- YouTube is blocked by default.
- The extension popup expands into a Python coding UI.
- A session randomly selects 10 unique problems from a bank of at least 20.
- Sample tests are available through **Run samples**.
- **Submit** runs all bundled tests for that problem.
- A problem counts once after a successful submit.
- 10/10 unlocks YouTube for 60 minutes.
- Expiry re-blocks YouTube and resets the challenge session.
- Draft code and progress survive popup/browser reopening.
- No network connection is required after the extension is built.

## Non-goals for v1
- Preventing an administrator from uninstalling/disabling the extension.
- LeetCode/API integrations.
- Accounts, telemetry, cloud sync, or remote judging.
- Perfectly secret hidden tests; extension source is inspectable.

## Acceptance criteria
1. Fresh install blocks youtube.com, youtu.be, YouTube Music, Shorts, and YouTube embeds.
2. Popup always exposes the challenge button; it does not depend on OS policy state.
3. Python executes locally without a system Python installation.
4. Wrong code cannot increment progress.
5. Correct code increments exactly once.
6. 10 successful problems removes blocking immediately.
7. Blocking returns after 60 minutes or browser restart after expiry.
8. Same built extension works on current Brave/Chrome for macOS and Windows.
