# Validation Results — v2.1 pre-arm baseline

This records what has actually been executed against this package. It deliberately separates tests that passed in the build environment from tests that still require the target Mac/Brave installation.

## Defects found by validation and fixed

### Popup challenge button stayed disabled
Root cause: the popup calls `fetch("http://127.0.0.1:43871/health")`, but the prior manifest used a port-bearing host-permission pattern. Chrome extension host permissions use URL match patterns whose host portion does not include a port. v2.1 uses the valid narrow permissions `http://127.0.0.1/*` and `http://localhost/*` and has regression tests for this condition.

### Threaded HTTP judge used `os.fork()`
Root cause: candidate evaluation forked from a multithreaded HTTP process. Python 3.13 warns that this can deadlock. v2.1 executes each candidate through a fresh subprocess worker; privileged verification drops UID/GID in that fresh worker before importing candidate code. A regression test asserts that `os.fork(` is absent from the judge implementation.

## Round A — blocker/manifest regression
- Node tests: **18/18 PASS**.
- Includes schedule boundaries, DST fall-back, URL scope, burn-in eligibility, localhost popup permission, and invalid port-bearing permission rejection.

## Round B — problem-bank integrity
- Bank: **120 problem IDs**.
- Structure: **24 algorithm families × 5 randomized wording/constraint variants**.
- Reference solvers execute against generated objective cases across the full bank: **PASS**.
- Challenge selection across deterministic seeds: **5 distinct families, exactly 3 Medium + 2 Hard**: **PASS**.

Important: this is 120 selectable problem IDs but 24 underlying algorithm families. It should not be represented as 120 unrelated algorithms.

## Round C — judge engine
- Challenge-engine self-test: **PASS**.
- Known-correct candidate accepted through fresh subprocess evaluator: **PASS**.
- Known-wrong candidate classified as wrong answer: **PASS**.
- Syntax diagnostics/hints: **PASS**.
- Runtime hint mapping: **PASS**.
- Thread-unsafe `os.fork()` regression: **PASS**.

## Round D — persistence / HTTP integration
Python integration suite: **6/6 PASS**.
- preview server exposes the objective challenge;
- compile errors return a hint;
- code survives local-server restart;
- same unexpired challenge resumes after restart;
- preview mode rejects maintenance/uninstall;
- changing saved code invalidates PASS;
- save/run activity does not extend fixed expiration;
- judge implementation uses the subprocess worker path.

## Round E — static validation
- Python compilation: **PASS**.
- challenge UI JavaScript syntax: **PASS**.
- Brave popup JavaScript syntax: **PASS**.
- Playwright test source syntax: **PASS**.
- macOS shell syntax: **PASS**.
- manifest JSON: **PASS**.

## Round F — real browser automation
A Playwright suite is included for:
- editor rendering and five-problem balance;
- compile-error UI + hint;
- autosave/reopen persistence;
- progressive hints;
- preview-action rejection;
- real Brave popup health/button click on macOS.

This hosted build environment could not execute that suite: `@playwright/test` is not preinstalled, package installation is network-limited, and the host-managed Chromium blocks loopback navigation. Therefore **no claim of a real popup click-through pass is made here**.

## Round G — target Mac / Brave acceptance — REQUIRED
Run:

```bash
npm install
bash tests/macos/prearm-acceptance.sh
```

Then complete `docs/LOCAL-AGENT-VALIDATION.md` with Playwright + visual/computer-use evidence on the actual Mac.

**Do not run `prepare-lock.sh` or `arm.sh` until Round G ends with `PRE-ARM ACCEPTANCE: PASS`.**
