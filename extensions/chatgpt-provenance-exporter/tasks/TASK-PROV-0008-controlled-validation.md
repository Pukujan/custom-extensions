# TASK-PROV-0008 — Controlled live-validation backlog

- Status: active
- Owner: ChatGPT/Sol + local repository agent
- Priority: P0
- Depends on: `PROV-0001` through `PROV-0007` deterministic checkpoints
- Branch: `task/PROV-0007-eval-trace`

## Goal

Close the remaining real-source validation gaps without starting bulk export or placing private transcript contents in Git.

## Remaining validation items

- one controlled live smoke for the optional client-visible event observer;
- one real official ChatGPT export ZIP supplied by the user, if official-import validation is required;
- one unpacked MV3 UI smoke for the installed extension controls;
- preserve exact evidence in this task and `checkpoints/CURRENT.md` only.

## Explicit boundaries

- Do not start account-wide export.
- Do not import or commit a private ZIP unless the user explicitly supplies it for this validation.
- Do not claim live acceptance while the approved ChatGPT desktop full-CDP/evaluate surface is unavailable.
- Do not automate the ChatGPT desktop app UI through the computer-use surface; the permitted route is the development-only CDP/evaluate surface when enabled.

## Current blocker evidence

- OS: `Microsoft Windows 11 Home 10.0.26200 build 26200 AMD64`.
- Node: `v24.14.1`.
- ChatGPT desktop executable version observed in process metadata: `153.0.8010.48`.
- The ChatGPT desktop main process did not expose a `--remote-debugging-port` flag, so no approved full-CDP/evaluate route was available for the live smoke.
- No private transcript, raw live event body, official ZIP, or capture bundle was written to Git.

## Deterministic baseline

- `node tests/test.js` → exit `0`; `54 tests passed`.
- `node tools/export-eval-trace.mjs --help` → exit `0`; local-only portable trace help printed.
- `node scripts/test-all.mjs` → exit `0`; all registered extension suites passed; final output `All registered extension test suites passed.`
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings.

## Acceptance

This task remains open until the permitted live-validation surface and any user-supplied real ZIP are available, or the user explicitly accepts deterministic-only status. The next atomic action is to obtain the missing validation prerequisite; no bulk export is permitted as a workaround.
