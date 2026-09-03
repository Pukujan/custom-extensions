# Software Design Document — YouTube Focus Lock v2

## 1. Components

### Brave extension
- `src/service-worker.js` — timezone-aware Declarative Net Request enforcement, alarms, fail-closed fallback.
- `src/content-guard.js` — second enforcement path for already-open YouTube pages.
- `status.html` / `src/status.js` — blocker state, burn-in state, policy-verification state, localhost judge health, and challenge button.
- The extension is allowed to contact only loopback HTTP (`http://127.0.0.1/*` / `http://localhost/*`) in addition to YouTube hosts. Chrome host-permission match patterns do not encode the port; the popup itself still connects only to port 43871.

### Problem bank
`macos/problem_bank.py` defines:
- 24 algorithm families;
- 5 variants per family = 120 unique problem IDs;
- difficulty, title, function signature, prompt, conceptual hints, and reference implementation;
- deterministic randomized test generation from `(problem_id, seed)`;
- balanced challenge selection: 3 Medium + 2 Hard, all distinct families.

### Challenge gate
`macos/challenge_gate.py` owns:
- challenge directory creation;
- syntax compilation diagnostics;
- fresh subprocess candidate execution with CPU/memory/file-size limits;
- outcome taxonomy: compile/runtime/timeout/wrong/pass;
- runtime and conceptual hint selection;
- privileged independent 5/5 re-verification;
- HMAC-SHA256 maintenance-token signing/verification.

Candidate code is never intentionally executed as root. The privileged verifier starts a fresh worker process; that worker clears supplementary groups and drops to the target user's UID/GID before loading candidate code. This avoids forking from the multithreaded HTTP server.

### Local challenge UI
`macos/challenge_ui.py` is a localhost-only HTTP server. Static assets are `challenge_ui.html`, `.css`, and `.js`.

Server properties:
- binds only to `127.0.0.1`;
- per-session random API token embedded into the served page;
- same-origin POST checks;
- CSP, `X-Frame-Options: DENY`, no-store caching;
- disk-backed state;
- separate `preview` and `locked` modes.

### macOS burn-in LaunchAgent
`macos/install-dev.sh` installs a **user-level**, removable LaunchAgent using the user's discovered Python 3.9+ interpreter:

`challenge_ui.py serve --mode preview --port 43871`

This makes the coding UI testable immediately during burn-in. `stop-preview.sh` removes only this preview service.

### Soft lock
`prepare-lock.sh` verifies:
- 60 minutes elapsed;
- the preview judge was run during the current burn-in;
- extension ID format.

It then writes Brave policies but does not install the persistent watchdog.

### Armed mode
`arm.sh`:
- installs root-owned enforcement/helper files under `/Library/Application Support/YouTubeFocusLock`;
- installs the root LaunchDaemon policy watchdog;
- replaces the preview LaunchAgent with `challenge_ui.py serve --mode locked`;
- captures the actual Python interpreter path instead of assuming `/usr/bin/python3`.

### Policy watchdog
Every 30 seconds:
- if no valid signed maintenance token exists, re-apply Brave force-install and private-window policies;
- if a valid token exists, temporarily remove those two policies;
- after expiry, restore them automatically.

## 2. Session state

Per challenge:
- `challenge.json`: ID, mode, createdAt, expiresAt, five selected problem IDs/seeds/directories.
- `progress.json`: UI token, selected index, per-problem saved hash, pass hash, attempts, hint level, last result.
- `solution.py` per problem.

Pointers are mode-specific:
- `active-challenge-preview.json`
- `active-challenge-locked.json`

Therefore preview work cannot be reused as a locked unlock session.

## 3. Exact-code pass binding
A problem is considered passed only when:

`passed == true && passedHash == SHA256(current solution.py)`

Any subsequent save with a different hash clears the pass state. The privileged unlock verifier ignores the UI's pass flag and re-runs the current files.

## 4. Judge diagnostics

### Compile
Parent process calls Python `compile()` first and returns line, column, source line, message, and a heuristic syntax hint.

### Runtime
Candidate exceptions are returned only by category/message. The UI maps common exceptions (`NameError`, `TypeError`, `IndexError`, etc.) to practical diagnostic hints.

### Timeout
Candidate process is resource-limited and externally time-bounded. Timeout hints point toward complexity classes/techniques rather than giving an answer.

### Wrong answer
Hidden inputs are not shown. The hint escalates from the problem family's first conceptual hint to its second after repeated attempts.

## 5. Problem-bank model
The bank intentionally favors breadth over cosmetic duplication. A challenge cannot select two variants from the same family. Families span:
- prefix sums, sliding windows, sweep lines, counting/sorting, intervals;
- graphs, union-find, topological sorting;
- dynamic programming, LIS, heaps, monotonic stacks;
- BFS with expanded state, binary-search-on-answer, weighted scheduling;
- string DP/windowing, matrix DFS/Dijkstra, palindrome DP, subsequence counting.

## 6. Security / threat model
Designed to resist casual/impulsive bypass:
- ordinary browser Remove/Disable after policy verification;
- private-window bypass;
- simple token-file editing;
- service-worker suspension;
- preview-session reuse for locked maintenance;
- stale PASS after editing code.

Not an absolute defense against a determined administrator who deliberately uses `sudo`, modifies source/policies, boots another environment, or reverse engineers the local judge. This limitation follows directly from retaining administrator control of the Mac.
