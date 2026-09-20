# TASK-PROV-0006 — Optional client-visible event capture

- Status: active
- Owner: ChatGPT/Sol + local repository agent
- Priority: P1
- Depends on: `PROV-0001`, `PROV-0002`, `PROV-0003`, and the PROV-0005 deterministic importer checkpoint
- Branch: `task/PROV-0006-live-events`

## Goal

Add an opt-in, development-only observer for same-origin ChatGPT conversation requests/responses so client-visible tool-call/result and streaming envelopes can be inspected alongside—but never used to rewrite—the authoritative raw conversation capture.

## Why

Persisted conversation mappings preserve many tool events, but they cannot prove what the client actually observed during a live response. A separate page-memory observer can expose client-visible request/response envelopes and SSE framing while maintaining a strict credential/privacy boundary.

## Allowed files

- `extensions/chatgpt-provenance-exporter/live-core.js`;
- `extensions/chatgpt-provenance-exporter/live-hook.js`;
- `extensions/chatgpt-provenance-exporter/dev/build-live-browser-payload.mjs`;
- `extensions/chatgpt-provenance-exporter/specs/LIVE_EVENT_CAPTURE_DESIGN.md`;
- `extensions/chatgpt-provenance-exporter/docs/BUILTIN_BROWSER_VALIDATION.md` when adding the optional route;
- `extensions/chatgpt-provenance-exporter/tests/**`;
- this task and `checkpoints/CURRENT.md`;
- no manifest permissions, popup wiring, private event bodies, or live bundles in Git.

## Rules

- development-only, opt-in, in-memory capture;
- same-origin conversation paths only;
- never record Authorization, Cookie, Set-Cookie, or other credential headers;
- never mutate, block, retry, or replay page requests;
- raw live body text remains separate from the source conversation response;
- pause/resume/stop/reset behavior is explicit and testable;
- no automatic live capture in the installed extension.

## Acceptance criteria

- [ ] live event design and capture boundary are documented;
- [ ] core normalizes/filter events, preserves raw text, parses SSE frames, and excludes credentials;
- [ ] hook observes fetch/XHR without changing page behavior and restores originals on stop;
- [ ] pause/resume/reset lifecycle is cancellation-safe and page-memory only;
- [ ] deterministic tests cover filtering, framing, hashes/source hints, sequencing, and lifecycle;
- [ ] built-in-browser development payload can be built without adding MV3 permissions;
- [ ] repository-wide tests pass;
- [ ] no live event smoke is run until a later explicit validation checkpoint;
- [ ] checkpoint records exact commands/results, blockers, and next atomic action.

## Planned commands

```text
node tests/test.js
node dev/build-live-browser-payload.mjs
node scripts/test-all.mjs
git diff --check
```

## Checkpoint log

### 2026-09-20 — Codex — PROV-0006 opened

Completed:
- created `task/PROV-0006-live-events` from the clean PROV-0005 checkpoint;
- defined a development-only same-origin observer rather than widening installed-extension permissions;
- recorded explicit credential filtering, lifecycle, raw-body, SSE, and non-mutation rules in `specs/LIVE_EVENT_CAPTURE_DESIGN.md`.

Decisions:
- page-memory development route first; installed extension remains unchanged;
- `/backend-api/f/conversation` is eligible because live generation/tool envelopes may use it;
- raw live events remain supplementary and unmatched events remain visible rather than forced into source classifications.

Blockers/uncertainty:
- actual ChatGPT transport paths and streaming behavior must be confirmed later in the built-in browser;
- no live event smoke is authorized in this checkpoint.

Next:
- implement `live-core.js`, the reversible fetch/XHR hook, and deterministic lifecycle tests.

### 2026-09-20 — Codex — deterministic observer checkpoint

Completed:
- added `live-core.js` with same-origin conversation-path filtering, safe-header allowlisting, bounded raw request/response text, SSE frame derivation, source hints, and lifecycle state;
- added `live-hook.js` with reversible fetch/XHR observation, page-memory-only storage, explicit start/pause/resume/stop/reset, and restoration of original page methods;
- added `dev/build-live-browser-payload.mjs` and documented the approved built-in-browser development route;
- added deterministic tests for path filtering, credential exclusion, raw-body/SSE preservation, sequence/lifecycle behavior, restoration, and absence of added MV3 sensitive permissions;
- kept the installed MV3 manifest and popup unchanged. No live observer smoke was run.

Exact environment:
- OS: `Microsoft Windows 11 Home 10.0.26200 build 26200 AMD64`;
- Node: `v24.14.1`;
- browser: not used for this deterministic checkpoint; the optional built-in-browser route remains unrun;
- branch: `task/PROV-0006-live-events`.

Exact commands/results:
- `node tests/test.js` from `extensions/chatgpt-provenance-exporter/` → exit `0`; `49 tests passed`;
- `node dev/build-live-browser-payload.mjs | Measure-Object -Character -Line` → exit `0`; generated `333` lines and `11,536` characters of payload without writing a bundle to disk;
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered extension suites passed; provenance suite `49 tests passed`; final output: `All registered extension test suites passed.`;
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings for tracked files.

Deterministic evidence:
- same-origin `/backend-api/conversation`, `/backend-api/conversations`, and `/backend-api/f/conversation` are accepted;
- `/api/auth/session`, unrelated ChatGPT paths, and external origins are rejected;
- Authorization and Cookie response headers are excluded while safe content/request-id headers remain sorted and retained;
- exact response text remains available alongside parsed SSE frames; a two-frame test preserved JSON data and `[DONE]`;
- sequence values are monotonic for accepted events; paused/stopped events are not retained; reset returns to an empty ready state;
- body-limit omission is explicit rather than silently truncating raw evidence;
- static hook checks confirm original fetch/XHR methods are restored and no browser permission/storage/download APIs were added;
- no private live event bodies, raw IDs, or bundles were added to Git.

Observed defects/fixes:
- none after deterministic implementation; all initial PROV-0006 tests passed on the recorded run.

Blockers/uncertainty:
- actual ChatGPT transport usage, streaming response behavior, and correlation with source-backed tool records remain unverified until an explicit built-in-browser smoke checkpoint;
- the observer is intentionally supplementary and does not claim that client-visible events expose hidden server-side execution;
- PROV-0004 controlled account smoke and PROV-0005 real-ZIP validation remain separate later actions.

Acceptance result: **PROV-0006 deterministic observer gate passed; live event smoke remains intentionally unresolved.**

Next:
- commit this review checkpoint, then open PROV-0007 for Eval Lab trace compatibility; retain the live smoke as a later controlled validation action.

## Handoff

Read `PROJECT.md → checkpoints/CURRENT.md → this task → specs/SDD.md → specs/LIVE_EVENT_CAPTURE_DESIGN.md` before continuing. Do not perform a live event smoke without a later checkpoint authorization.
