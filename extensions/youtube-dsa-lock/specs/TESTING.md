# Validation plan

Keep validation small and executable.

## Automated on every change
Run:

```bash
npm install --ignore-scripts
npm run check
```

This covers:
- lock/unlock pure logic;
- DNR rule construction;
- challenge selection/progress persistence logic;
- problem-bank structural contracts;
- real Pyodide execution of correct and incorrect Python;
- build output and bundled WebAssembly presence;
- rejection of accidental CDN/localhost/native-service dependencies in runtime JS.

GitHub Actions runs the same test/build/validation sequence on Ubuntu, macOS, and Windows. This catches path/copy/build portability problems without maintaining separate OS code.

## Manual browser smoke test before release
Load `dist/` unpacked in Brave or Chrome and verify:
1. YouTube navigation redirects to the blocked page.
2. Clicking the extension always shows **Solve 10 problems**.
3. Challenge expands in the popup; **Open in tab** shows the same saved session.
4. Syntax errors are reported instead of passing.
5. Infinite/very slow code is stopped by the execution timeout.
6. A sample-correct but submit-wrong solution does not count.
7. A correct solution increments once and stays passed after popup reopen.
8. 10/10 immediately allows YouTube.
9. Manually shorten `UNLOCK_MINUTES` during development and confirm automatic re-lock/reset.
10. Repeat the smoke test once on macOS and once on Windows before calling the version releasable.

## Why no mutation testing yet
Mutation testing is intentionally deferred. The high-value logic is small and already covered by direct contract tests plus a real Pyodide integration test. Add mutation testing only if the state/locking logic grows enough that ordinary branch/behavior tests stop giving confidence.
