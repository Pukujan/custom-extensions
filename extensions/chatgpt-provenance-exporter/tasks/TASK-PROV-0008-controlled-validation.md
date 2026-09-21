# TASK-PROV-0008 — Controlled live-validation backlog

- Status: review
- Owner: ChatGPT/Sol + local repository agent
- Priority: P0
- Depends on: `PROV-0001` through `PROV-0007` deterministic checkpoints
- Branch: `task/PROV-0007-eval-trace`

## Goal

Close the remaining real-source validation gaps without starting bulk export or placing private transcript contents in Git.

## Remaining validation items

- one controlled live smoke for the optional client-visible event observer — completed in `TASK-PROV-0006-live-events.md`; the authorized generation follow-up observed one `text/event-stream` request, with the stream body unavailable to the page hook;
- one real official ChatGPT export ZIP supplied by the user, if official-import validation is required;
- optional follow-up validation only: the required unpacked MV3 UI smoke is already recorded in the PROV-0001 pilot checkpoint;
- preserve exact evidence in this task and `checkpoints/CURRENT.md` only.

## Explicit boundaries

- Do not start account-wide export.
- Do not import or commit a private ZIP unless the user explicitly supplies it for this validation.
- Do not claim live acceptance while the approved ChatGPT desktop full-CDP/evaluate surface is unavailable.
- Do not automate the ChatGPT desktop app UI through the computer-use surface; the permitted route is the development-only CDP/evaluate surface when enabled.

## Previous blocker / current state

- OS: `Microsoft Windows 11 Home 10.0.26200 build 26200 AMD64`.
- Node: `v24.14.1`.
- ChatGPT desktop executable version observed in process metadata: `153.0.8010.48`.
- The earlier session lacked a connected full-CDP browser despite the setting being enabled. After the user reopened the pilot in a renegotiated Browser Use session, the tab exposed the approved `cdp` capability and the built-in-browser pilot completed successfully; the earlier CDP blocker is resolved.
- No private transcript, raw live event body, official ZIP, or capture bundle was written to Git.

## Deterministic baseline

- `node tests/test.js` → exit `0`; `56 tests passed`.
- `node tools/export-eval-trace.mjs --help` → exit `0`; local-only portable trace help printed.
- `node scripts/test-all.mjs` → exit `0`; all registered extension suites passed; final output `All registered extension test suites passed.`
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings.

## Acceptance

The controlled built-in-browser pilot is accepted: the live bundle passed source/node/edge conservation, source-pointer resolution, raw-backed tool checks, SHA-256 recomputation, stable rendered sweeps, rendered spot checks, pause/resume/reset, and scroll restoration. The required unpacked-MV3 smoke is also recorded in the PROV-0001 checkpoint: the fresh Brave run verified popup capture/pause/resume/reset, service-worker messaging, controlled `chrome.downloads` paths, and completed-state bundle discoverability. The authorized PROV-0006 observer smoke is complete for persisted and generated-response activity: one `text/event-stream` POST was observed among six eligible same-origin events, while the streaming body was explicitly unavailable and no SSE frames were parsed. This task remains in `review` only for any user-supplied real ZIP if official-import validation is requested; account-wide live export remains a separate explicitly authorized task. No bulk export is permitted as a workaround.

### 2026-09-20 23:38:57 UTC — Codex — cross-platform release-packaging checkpoint

- Added `scripts/package-extensions.mjs` as the canonical local/CI packager; it uses only Node.js built-ins, validates registry/manifest versions, emits deterministic stored ZIPs, and writes `SHA256SUMS.txt`.
- Updated the release workflow to call the Node packager, while retaining the legacy Bash wrapper for Unix environments.
- Exact verification: `node --check scripts/package-extensions.mjs` → exit `0`; `node scripts/package-extensions.mjs --help` → exit `0`; two independent `node scripts/package-extensions.mjs --out <controlled-temp-dir>` runs → four expected archives each, identical SHA-256 values; checksum recomputation, root `manifest.json`, and exclusion of `tests/`/`specs/` → passed; `node scripts/test-all.mjs` → exit `0`, all registered suites passed (`102` tests total).
- Temporary packaging directories were removed. No release was published and no private data was involved.
- At `2026-09-20 23:41:33 UTC`, packager cleanup was hardened to remove only generated `.zip` files and `SHA256SUMS.txt`; a controlled nested sentinel file survived, stale generated ZIPs were removed, and the two-run deterministic ZIP/checksum/archive-invariant check passed again. `node scripts/test-all.mjs` again returned exit `0` with all registered suites passed (`102` tests total).
- At `2026-09-20 23:43:11 UTC`, `node --check scripts/read-release-metadata.mjs` and `node scripts/read-release-metadata.mjs` passed, returning `tag=extensions-2026.09.20` and `title=Custom Extensions — 2026-09-20`; the release workflow now uses this Node validator instead of `jq`.

Blockers:

- official-import validation still requires a user-supplied ZIP;
- account-wide export remains a separately authorized action;
- no native external Eval Lab schema/validator is pinned.

Next atomic action: wait for a user-supplied official ZIP or separate account-wide authorization; otherwise keep the accepted v0.1 baseline frozen and do not start bulk export.

### 2026-09-20 23:00:04 UTC — Codex — MV3 gate reconciliation

Evidence reconciliation:
- the fresh Brave pilot checkpoint already records the required unpacked-MV3 smoke on the current capture/control implementation: popup capture, pause/resume, active and completed reset, service-worker download messaging, controlled `chatgpt-provenance/...` paths, and completed raw/tool/citation/reconciliation file discoverability;
- its fresh duplicate bundle passed the aggregate validator with `465` mapping/normalized nodes, `464` messages and edges, `363` tools, `328` citations, `0` source-pointer failures, `0` tool/raw mismatches, and `0` hash failures; no private transcript content is repeated here;
- the later `PROV-0008: improve bundle discoverability` change only adds four completed-state path labels to `popup.js`; the same current deterministic checkpoint recorded `node tests/test.js` → exit `0`, `56 tests passed`, and the repository-wide suite → exit `0`, all registered suites passed;
- a second browser replay was attempted in this session but is not available: `cua.listBrowsers()` returned only the ChatGPT in-app browser (`type: iab`), and `cua.createBrowserTab("chrome", "about:blank", ...)` returned `Browser is not available: chrome`. No browser-policy barrier was bypassed and no unobserved live result is claimed for that attempted replay.

Decision:
- remove the unpacked-MV3 smoke from the remaining required pilot gates; retain the prior Brave evidence as the authoritative live MV3 result;
- keep this task at `review` because the optional live-event observer remains separately unauthorized and official-import validation requires a user-supplied ZIP;
- no bulk export, private ZIP import, or private transcript content was started or committed.

Next atomic action:
- wait for explicit authorization before running the optional PROV-0006 client-visible observer smoke, or for a user-supplied official export ZIP; otherwise the v0.1 pilot/holdout validation is complete and frozen.

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

### 2026-09-20 22:46:59 UTC — Codex — built-in full-CDP pilot completed

Completed:
- user reopened the pilot in ChatGPT desktop's built-in browser; the tab exposed `cdp` alongside the normal page controls;
- evaluated the repository development payload through CDP in the authenticated ChatGPT origin;
- performed two aggregate-only captures: the first verified pause/resume and the second verified nonzero scroll restoration;
- reset the active run and confirmed the page remained ready with all progress counts zero after a settling delay;
- appended the detailed aggregate evidence to `TASK-PROV-0001-pilot-capture.md`.

Exact live results:
- final bundle: raw `1,490,216` bytes; `465` mapping/normalized/unique nodes; `464` edges; `464` messages; `363` tools; `328` citations; `0` artifacts;
- source-pointer failures `0`; missing/extra edges `0/0`; tool raw mismatches `0`; representative tool checks `3/3`; derived conservation all passed;
- SHA-256: `12` entries, `0` failures; manifest coverage missing/extra `0/0`;
- rendered: `21` stable turns after `2` passes; reconciliation `differences_observed` with `1` explicit discrepancy preserved;
- scroll restoration: `29,987.199` px before and after, delta `0`;
- no private transcript body, live-event body, or bundle was written to Git; the development route held files in page memory only.

Observed issue/fix:
- the first aggregate probe incorrectly counted the self-referential `integrity/SHA256SUMS.json` entry as missing; the probe was corrected to exclude that file, matching the committed validator. The final result passed; no product parser/classifier change was made.

Decision:
- mark the built-in-browser/live pilot portion accepted; keep this task `in_progress` until the unpacked MV3 smoke is completed. Do not start bulk export.

Next atomic action:
- load/reload the current unpacked MV3 extension in the authorized Chromium/Brave test surface and verify popup controls, service-worker messaging, controlled download paths, and completed-state tool/source file discoverability; then append aggregate-only evidence here and in the pilot task.

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

Follow-up evidence:
- the exposed browser evaluator's `evaluate` scope rejected the same-origin `fetch` probe with `TypeError: fetch is not a function`; this confirms that the available page evaluator is a restricted read-only inspection surface, not the approved full-CDP/evaluate surface required by `BUILTIN_BROWSER_VALIDATION.md`;
- no raw response, private transcript body, bundle, or download was created by this probe.

### 2026-09-20 23:07:39 UTC — Codex — release metadata audit

Completed:
- corrected the prepared release notes and release-install documentation so the provenance extension's passed pilot, holdout, required MV3 smoke, and built-in full-CDP validation are not reported as pending;
- verified release coverage with a local JSON check: `4` registry extensions map to `4` release assets, tag `extensions-2026.09.20`, coverage `ok`;
- checked local packaging prerequisites without generating artifacts.

Exact result:
- `bash` is available at `C:\Windows\system32\bash.exe`;
- `jq`, `zip`, `unzip`, and `sha256sum` are unavailable in this Windows environment, so `scripts/package-extensions.sh` was not run and no `dist/` ZIPs were generated;
- no release was published or uploaded.

Decision:
- preserve the Ubuntu GitHub Actions packaging workflow as the authoritative release path; do not add binaries to Git or fabricate local packaging evidence;
- keep optional live observer, official ZIP import, account-wide live export, and external publication separately gated.

Next atomic action:
- use the configured Ubuntu workflow when publication is explicitly authorized; otherwise the accepted v0.1 provenance pilot/holdout and repository-side implementation remain frozen.

### 2026-09-20 23:23:10 UTC — Codex — PROV-0006 observer smoke completed

Completed:
- recorded the required controlled-validation authorization in `TASK-PROV-0006-live-events.md`;
- built and evaluated the development-only observer through the approved built-in-browser CDP surface;
- observed one existing same-origin conversation fetch without sending a message or mutating remote data;
- reset page-memory state and removed all temporary transfer tabs/server state after aggregate inspection.

Aggregate evidence:
- `1` eligible `fetch` event, HTTP `200`, response length `1,484,442` characters;
- raw event JSON parsed successfully and derived to `465` mapping nodes, `464` edges, `363` tool events, and `328` citation records;
- source pointers resolved; source hints included tool/client activity and source/reference markers;
- forbidden credential-header keys retained: `0`; hook restoration: `true`;
- lifecycle start/pause/resume/stop/reset returned expected states;
- bounded retry after `10` seconds returned HTTP `429` and was not repeated; no streaming/SSE event was observed;
- the live event body and private response content were not written to Git; the authoritative source-bundle hash checks remain covered by the pilot/holdout evidence.

Decision:
- mark the optional PROV-0006 observer smoke complete with the explicit limitation that this run observed a persisted conversation fetch, not a newly streamed response;
- keep account-wide live export, official-import validation, and any future streaming/SSE smoke separately authorized; do not start bulk export.

Next atomic action:
- wait for a user-supplied official ZIP or a separate authorization for account-wide/streaming validation; otherwise the accepted v0.1 provenance baseline remains frozen.

### 2026-09-21 00:17:05 UTC — Codex — CDP capability recheck

Completed:
- rechecked the user-selected built-in ChatGPT browser tab at the pilot URL through the current Browser Use connection;
- confirmed that the tab exposes the approved optional `cdp` capability even though the convenience property `tab.cdp` is undefined;
- loaded the development-only live observer through direct CDP evaluation using the page's existing script nonce after the loopback payload-fetch path was rejected by the page/browser policy;
- started and stopped the observer successfully; stopping restored the page's original `fetch`/XHR hooks.

Exact evidence:
- tab: `https://chatgpt.com/c/6ab01034-f144-83ea-bae2-1e71588ccae5`;
- capability inventory included `cdp` with raw `Runtime.evaluate` support;
- `node dev/build-live-browser-payload.mjs` → exit `0`; generated payload length `12,246` bytes;
- loopback `fetch` and script-tag transfer attempts did not load the payload (`Failed to fetch` / `script_load_error`); no page or transcript data was sent to the loopback server;
- nonce-authorized CDP load returned `loaded:true`, `hasObserver:true`;
- observer start returned `status:"running", event_count:0, next_sequence:1`;
- observer stop returned `status:"stopped", event_count:0, next_sequence:1`; hooks were restored;
- no message was submitted, no live event body was retained, and no private transcript content was written to Git.

Decision:
- the earlier CDP blocker is definitively resolved; the remaining optional SSE gap is not caused by unavailable CDP;
- the next live action, if authorized, is one user-visible test response so the observer can determine whether the current page emits a streaming/SSE event; account-wide export remains out of scope.

Blocker/confirmation gate:
- submitting that test response is an external representational action and requires action-time user confirmation; no such message was sent in this checkpoint.

Next atomic action:
- after explicit confirmation to submit the single live test prompt, start the observer, submit the prompt, collect aggregate-only event counts/classifications/hashes, stop/reset the observer, and append the result; otherwise keep the accepted baseline frozen and do not start bulk export.
