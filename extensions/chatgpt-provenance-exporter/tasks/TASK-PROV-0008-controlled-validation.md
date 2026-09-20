# TASK-PROV-0008 — Controlled live-validation backlog

- Status: blocked
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

- `node tests/test.js` → exit `0`; `56 tests passed`.
- `node tools/export-eval-trace.mjs --help` → exit `0`; local-only portable trace help printed.
- `node scripts/test-all.mjs` → exit `0`; all registered extension suites passed; final output `All registered extension test suites passed.`
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings.

## Acceptance

This task remains open until the permitted live-validation surface and any user-supplied real ZIP are available, or the user explicitly accepts deterministic-only status. The next atomic action is to enable the approved ChatGPT desktop full-CDP/evaluate surface and open the pilot conversation; then run the controlled built-in-browser/live-observer smoke and append aggregate-only evidence, followed by the unpacked MV3 UI smoke. If official-import validation is requested, obtain a user-supplied official export ZIP separately. No bulk export is permitted as a workaround.

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

### 2026-09-20 21:53:59 UTC — Codex — repeatable bundle validator

Completed:
- added `tools/validate-capture-bundle.mjs`, a local-only aggregate validator for the required raw/conservation/pointer/edge/tool/reconciliation/hash checks;
- added a redacted structural fixture test and documented the command in the extension README and local validation procedure.

Evidence:
- `node tests/test.js` → exit `0`; `56 tests passed`;
- `node tools/validate-capture-bundle.mjs --help` → exit `0`; aggregate-only contract printed;
- the fixture validator test passed conservation, raw-backed tool equality, reconciliation status, and SHA-256 checks;
- no private bundle or transcript content was copied into Git.

Decision:
- keep the validator output aggregate-only so users can verify a controlled download without exposing transcript contents in a checkpoint or terminal log.

Next:
- run the validator against the controlled pilot/holdout folders after any future capture, then proceed with the approved full-CDP/evaluate smoke when that external surface is enabled.

### 2026-09-20 21:55:19 UTC — Codex — real-bundle validator evidence

Completed:
- ran the committed aggregate-only validator against the controlled PROV-0001 pilot and PROV-0002 holdout bundles;
- corrected one initial holdout invocation that used a stale path string, then reran using the exact resolved directory.

Exact commands/results:
- `node tools/validate-capture-bundle.mjs "C:\\Users\\pujan\\Downloads\\June 2026\\chatgpt-provenance\\20260920-Handoff Declined-6ab01034-f144-83ea-bae2-1e71588ccae5"` → exit `0`; `ok:true`, status `no_differences_observed`;
- corrected holdout command with exact resolved path `C:\\Users\\pujan\\Downloads\\June 2026\\chatgpt-provenance\\20260920-Eval-lab PR 20 gate-6ab01a29-1e0c-83ea-a624-2dcb02656404` → exit `0`; `ok:true`, status `no_differences_observed`;
- initial stale-path holdout invocation → exit `1` with aggregate `missing:*` file errors; no bundle was modified.

Aggregate results:
- pilot: `465` mapping/normalized nodes, `464` messages, `464` edges, `363` tools, `328` citations, `22` rendered turns, `0` source-pointer failures, `0` tool-raw mismatches, `0` hash failures, reconciliation `differences_observed`;
- holdout: `984` mapping/normalized nodes, `983` messages, `983` edges, `862` tools, `740` citations, `12` rendered turns, `0` source-pointer failures, `0` tool-raw mismatches, `0` hash failures, reconciliation `differences_observed`.

Decision:
- the requested structural/hash/tool/source checks are now repeatable against both controlled real bundles without exposing private contents; live built-in-browser validation remains a separate external prerequisite.

Next:
- obtain the approved ChatGPT desktop full-CDP/evaluate surface and run the live smoke; do not start bulk export.

### 2026-09-20 21:58:03 UTC — Codex — payload readiness check

Completed:
- rebuilt both development-only browser payloads without opening a browser or writing a bundle.

Exact commands/results:
- `node dev/build-browser-payload.mjs | Measure-Object -Character -Line` → exit `0`; `1,246` lines and `43,419` characters;
- `node dev/build-live-browser-payload.mjs | Measure-Object -Character -Line` → exit `0`; `333` lines and `11,536` characters.

Decision:
- payload generation is ready for the approved CDP/evaluate route; no browser smoke is claimed until that external surface is enabled.

Next:
- enable full CDP/evaluate access in ChatGPT desktop and run the documented capture plus live-observer smoke.

### 2026-09-20 21:59:46 UTC — Codex — blocked-state audit

Evidence:
- ChatGPT desktop process remains version `153.0.8010.48` with no process-owned listening endpoint;
- approved browser-control inventory contains a ChatGPT desktop shell but no connected built-in-browser page;
- all repository-side deterministic, controlled-bundle, documentation, and payload-readiness work is committed and clean.

Decision:
- set this task to `blocked` because the remaining live acceptance cannot proceed without the external full-CDP/evaluate enablement; no browser UI automation or bulk export will be used as a workaround.

Next:
- after the authorized operator enables full CDP/evaluate access and opens the pilot conversation, resume this task, run the documented built-in-browser/live-observer smoke, append aggregate-only evidence, and then run the unpacked MV3 UI smoke; obtain a user-supplied official export ZIP separately only if official-import validation is requested.

### 2026-09-20 22:10:32 UTC — Codex — parallel repository hardening

Completed:
- integrated the disjoint Luna audits for release readiness, validator correctness, and checkpoint continuity;
- hardened `tools/validate-capture-bundle.mjs` against lexical/symlink path traversal, incomplete or extra hash entries, dangling/extra edges, derived-record conservation mismatches, and capture-report count drift;
- prepared the next release descriptor and release notes for all four registered extensions without generating ZIPs, publishing, or uploading anything;
- preserved the blocked live-validation state and did not inspect or automate a browser.

Exact verification:
- `node tests/test.js` → exit `0`; `56 tests passed`;
- `node scripts/test-all.mjs` → exit `0`; all four registered suites passed; total `102` tests; final output `All registered extension test suites passed.`;
- pilot `node tools/validate-capture-bundle.mjs <controlled-pilot-folder>` → exit `0`; `ok:true`, `no_differences_observed`;
- holdout `node tools/validate-capture-bundle.mjs <controlled-holdout-folder>` → exit `0`; `ok:true`, `no_differences_observed`;
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings;
- registry/manifest version and release-coverage checks → passed; no ZIP artifacts created.

Observed fixes:
- the validator initially treated `manifest.json` inconsistently between production manifests and the hash list; the expected hash set now explicitly includes `manifest.json`, and the fixture mirrors production layout;
- malformed/path-escape regression cases now fail safely with aggregate-only output.

Next:
- if the external CDP prerequisite becomes available, run the built-in-browser/live-observer smoke and then the unpacked MV3 UI smoke; otherwise no further live acceptance can be claimed.

### 2026-09-20 22:18:15 UTC — Codex — repaired-surface live probe

Environment:
- OS: `Microsoft Windows 11 Home`, version `10.0.26200`, build `26200`;
- ChatGPT desktop: `153.0.8010.48`;
- Brave: `153.1.95.102`;
- Node: `v24.14.1`;
- repository branch/commit at probe start: `task/PROV-0007-eval-trace` / `dbadee0148eafd73b2fe6db3b320d989ea70703e`.

Exact live probe:
- opened the user-selected pilot URL in the exposed Codex in-app Chromium browser: `https://chatgpt.com/c/6ab01034-f144-83ea-bae2-1e71588ccae5`;
- browser inventory returned only `Codex In-app Browser` (`type: iab`), with no `cdp` browser and no Brave/Chromium extension-provider connection;
- read-only page diagnostics returned `title:"Handoff Declined"`, the exact pilot URL, `hasBundle:false`, `bundleType:"undefined"`, and `extensionMarkers:[]`;
- rendered aggregate diagnostics returned `workedForButtons:3`, `sourceLikeLinks:46`, `toolLikeLabels:3`, and `mainTextChars:22558`;
- attempting `chrome://extensions/` was rejected by the browser-use URL policy; no workaround or raw-CDP/browser-command bypass was attempted;
- ChatGPT process inspection returned no `--remote-debugging-port` or equivalent full-CDP flag.

Interpretation:
- the exact pilot page visibly contains tool-work indicators and source-like links, so the user-reported absence of tools/sources is not evidence that this conversation has none;
- the exposed in-app page is not running the provenance payload or unpacked extension, so no live capture, pause/resume/reset, raw preservation, source-pointer, tool-raw, hash, rendered-reconciliation, lazy-load, or scroll-restore acceptance claim is made from this probe;
- no parser/classifier fix is justified by this evidence. The remaining blocker is the missing approved full-CDP/evaluate connection plus the required unpacked-MV3 browser smoke surface.

Decision:
- preserve the live-validation status as blocked; do not claim PROV-0001 pilot acceptance from this in-app read-only probe;
- do not start bulk export or PROV-0002; do not copy private transcript contents into Git.

Next atomic action:
- expose the approved ChatGPT desktop full-CDP/evaluate browser connection and load the unpacked MV3 extension in the authorized Chromium/Brave test surface; then run the documented payload controls and aggregate-only validation before changing this status.
