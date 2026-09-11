# SDD — YouTube DSA Lock

## Architecture
A single Manifest V3 extension owns the whole product flow.

### Background service worker
`background.js` owns dynamic Declarative Net Request rules and the unlock-expiry alarm. State is stored in `chrome.storage.local`.

### Popup / editor
`popup.html` + `popup.js` render lock status, challenge progress, problem selection, a plain Python textarea, sample execution, and submit execution. The same page can open as an extension tab for a larger editor.

### Python execution
`python-worker.js` runs bundled Pyodide in a Web Worker. The worker executes only user-entered Python plus the bundled local test harness. A 5-second parent-side execution timeout terminates and recreates a stuck worker.

Pyodide is installed from a pinned npm version at build time and copied into `dist/vendor/pyodide/`; deployed extension code does not load remote executable logic.

### Problem bank
`lib/problems.mjs` is local static data. Problems use JSON-compatible arguments/results so the test harness stays small.

### Locking
DNR rules redirect top-level YouTube navigation to `blocked.html` and block YouTube subframes. A successful 10/10 challenge sets `unlockUntil`, removes those rules, and schedules an alarm. Expiry removes the unlock and challenge state and reinstalls rules.

## Security / trust model
This is a self-control tool. Bundled tests are inspectable and an unpacked extension is removable. v1 intentionally avoids OS-specific persistence. If stronger anti-removal friction is added later, it should be a separate optional adapter and must not be required for the coding flow.
