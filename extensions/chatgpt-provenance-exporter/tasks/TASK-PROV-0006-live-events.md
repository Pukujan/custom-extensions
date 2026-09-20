# TASK-PROV-0006 — Optional client-visible event capture

- Status: complete
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

- [x] live event design and capture boundary are documented;
- [x] core normalizes/filter events, preserves raw text, parses SSE frames, and excludes credentials;
- [x] hook observes fetch/XHR without changing page behavior and restores originals on stop;
- [x] pause/resume/reset lifecycle is cancellation-safe and page-memory only;
- [x] deterministic tests cover filtering, framing, hashes/source hints, sequencing, and lifecycle;
- [x] built-in-browser development payload can be built without adding MV3 permissions;
- [x] repository-wide tests pass;
- [x] no live event smoke was run before the later controlled validation authorization;
- [x] checkpoint records exact commands/results, blockers, and next atomic action.

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

## Controlled live-smoke authorization

The active project request to continue through completion authorizes this narrow, development-only observer smoke on the already-open pilot page. The smoke must only observe an existing same-origin conversation load; it must not send a new ChatGPT message, mutate remote data, persist event bodies, or add private content to Git. If the page does not issue an eligible request during the controlled observation, record that result as an unresolved live-transport gap rather than widening scope.

### 2026-09-20 23:23:10 UTC — Codex — authorized built-in-browser observer smoke

Environment:
- OS: `Microsoft Windows 11 Home`, version `10.0.26200`, build `26200`;
- ChatGPT desktop: `153.0.8010.48`;
- Node: `v24.14.1`;
- browser surface: ChatGPT in-app browser, pilot URL already open, approved `cdp` capability;
- no new ChatGPT message was sent, no remote data was mutated, and no event body or private ID was written to Git.

Exact commands/results:
- `node dev/build-live-browser-payload.mjs` → exit `0`; payload transferred through the approved CDP route, `11,893` bytes;
- one read-only observer run acquired the existing `/backend-api/conversation/<id>` response and stopped/restored the page hooks;
- bounded retry after a `10` second wait returned HTTP `429` with a `30`-character response; no further retries were attempted;
- page-memory observer state was reset to `ready` and the temporary transfer tab/server were removed after inspection.

Aggregate live evidence from the successful first run:
- event count `1`; transport `fetch`; status `200`;
- eligible path count `1`, with no unrelated/session event retained;
- captured response length `1,484,442` characters; JSON parse succeeded;
- source-backed derivation from the observed raw response: `465` mapping nodes, `464` edges, `363` tool events, `328` citation records;
- source pointers resolved for all derived nodes; event source hints included tool/client activity and source/reference markers;
- forbidden response-header keys (`authorization`, `cookie`, `set-cookie`, proxy credentials): `0`;
- lifecycle probe: start, pause, resume, stop, reset all returned the expected state transitions; fetch hook restoration `true`;
- live-event/source correlation: the observed persisted response derived the same aggregate node/tool/citation counts as the accepted pilot; no live SSE stream or newly generated response was observed;
- live event body SHA-256 was intentionally not retained after aggregate inspection; the bounded retry was rate-limited, while the authoritative persisted bundle hashes remain covered by the PROV-0001/0002 checks. No private event body was copied into the checkpoint.

Acceptance result: **PROV-0006 deterministic and authorized live observer smoke passed with an explicit limitation: this run observed a persisted conversation fetch, not a newly streamed response.**

Next atomic action:
- keep the observer disabled in the installed MV3 extension; only run a future streaming/SSE observation if separately authorized and a live generation can be exercised without recording private event bodies.
