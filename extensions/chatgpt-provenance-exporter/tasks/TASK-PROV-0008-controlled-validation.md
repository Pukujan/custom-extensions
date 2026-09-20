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

### 2026-09-20 21:37:52 UTC — Codex — live-surface recheck

Completed:
- re-read the repository handoff in the required order: project contract, current checkpoint, this task, system design, local validation, and handoff protocol;
- rechecked the current ChatGPT desktop process and the repository baseline without changing capture code or starting export.

Evidence:
- `git status --short --branch` → clean `task/PROV-0007-eval-trace` before this append;
- `Get-Process ChatGPT` → executable `C:\Program Files\WindowsApps\OpenAI.Codex_26.915.3509.0_x64__2p2nqsd0c76g0\app\ChatGPT.exe`, product version `153.0.8010.48`;
- process-owned listening-port check → no listening endpoint returned;
- environment-variable check for CDP/debug controls → no relevant variable returned;
- `node tests/test.js` → exit `0`; `54 tests passed`;
- `node scripts/test-all.mjs` → exit `0`; final output `All registered extension test suites passed.`;
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings.

Decisions:
- keep live acceptance unresolved; the missing full-CDP/evaluate surface is an external prerequisite, not evidence that the capture implementation passed live validation;
- do not use the ChatGPT desktop UI automation surface, do not switch to Brave without authorization, and do not start account-wide export as a workaround.

Changed:
- this task checkpoint only; no private transcript, raw event body, official ZIP, or capture bundle was written.

Blocked/uncertain:
- PROV-0006 live smoke and the built-in-browser pilot cannot proceed until the approved full-CDP/evaluate surface is enabled;
- official-import live validation additionally requires a user-supplied official export ZIP.

Next:
- enable the approved ChatGPT desktop full-CDP/evaluate surface, then run the controlled built-in-browser smoke and append aggregate-only evidence.

### 2026-09-20 21:45:44 UTC — Codex — controlled pilot bundle audit

Completed:
- inspected the user-tested pilot directory in the controlled local download root using aggregate-only parsing;
- compared the reported missing tool/source behavior against the actual emitted bundle artifacts without printing transcript text or raw IDs.

Evidence:
- directory: `C:\Users\pujan\Downloads\June 2026\chatgpt-provenance\20260920-Handoff Declined-6ab01034-f144-83ea-bae2-1e71588ccae5`;
- raw response file size: `1,490,216` bytes;
- normalized nodes: `465`; messages: `464`; tool records: `363`; citation records: `328`;
- tool classes: `127` `tool.call`, `236` `tool.result`;
- tool content values: `363` objects;
- citation fields: `175` `citations`, `153` `content_references`;
- rendered turns: `22`; rendered stability: `true`; reconciliation status: `differences_observed`; explicit discrepancies: `2`;
- the bundle contains separate `normalized/tool-events.jsonl` and `normalized/citations.jsonl` artifacts. The readable `rendered/transcript.md` is not the complete raw-backed tool/source view.

Decision:
- the user report that no tool calls or sources were recorded is not reproduced by this controlled pilot bundle; no classifier/parser change is justified by the evidence. The remaining issue is discoverability/documentation of the separate evidence indexes, while the live desktop-browser route remains independently blocked.

Next:
- finish the documentation/status reconciliation in parallel, then obtain the approved full-CDP/evaluate surface for the built-in-browser smoke.

### 2026-09-20 21:48:58 UTC — Codex — discoverability checkpoint

Completed:
- incorporated independent Luna audits: no reproducible source/tool extraction defect; no CDP endpoint available; documentation/status changes are disjoint and evidence-backed;
- added explicit completed-state popup paths for the raw source, tool-event index, citation/source index, and reconciliation report;
- closed the stale PROV-0002 task status and updated the collection registry/root handoff/status docs to reflect the accepted pilot and holdout.

Evidence:
- `node tests/test.js` → exit `0`; `54 tests passed`;
- `node scripts/test-all.mjs` → exit `0`; final output `All registered extension test suites passed.`;
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings;
- controlled pilot bundle audit remains aggregate-only: `465` nodes, `363` tool records, `328` citation records; the reported missing records were not reproduced.

Observed defect/fix:
- discoverability defect: the readable rendered transcript does not contain every raw-backed tool/source record, and the popup did not identify the separate JSONL artifacts; fixed by documenting the bundle layout and naming those paths in the completed popup status. Extraction rules were not changed.

Blocked/uncertain:
- built-in-browser/live-event acceptance still requires the external full-CDP/evaluate surface; no bulk export was started.

Next:
- enable the approved full-CDP/evaluate surface, run the controlled built-in-browser smoke, and append aggregate-only live evidence.
