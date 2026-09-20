# TASK-PROV-0001 — Single-Conversation Provenance Pilot

- Status: complete
- Owner: ChatGPT/Sol + local Luna/browser agent for live validation
- Priority: P0
- Depends on: none
- Branch: `feature/chatgpt-provenance-exporter`\n- GitHub issue: #6\n- Draft PR: #7

## Goal

Implement a provenance capture bundle for one currently open ChatGPT conversation and establish that the capture preserves all source nodes/relationships available in the authenticated conversation representation while independently reconciling the rendered transcript.

## Why

Hundreds of existing conversations may contain valuable tool-heavy research/build evidence. Before scaling capture, prove fidelity on a difficult real conversation and make failure visible.

## Allowed files

- `extensions/chatgpt-provenance-exporter/**`
- `extensions/registry.json` when registering the extension
- root status/handoff docs only when repository-wide state must change

## Acceptance criteria

- [ ] independently loadable MV3 extension;
- [ ] current ChatGPT conversation ID identified safely;
- [ ] authenticated raw conversation response preserved as exact text before parsing;
- [ ] every mapping/graph node represented in derived node index;
- [ ] all exposed parent/child relationships represented;
- [ ] unknown fields/types are preserved;
- [ ] conservative tool/message/event classification retains source pointer + raw node;
- [ ] DOM verifier handles virtualized/lazy-loaded long conversations with repeated sweeps;
- [ ] raw-vs-rendered reconciliation is explicit and never silently fixes disagreement;
- [ ] SHA-256 hashes emitted for evidence/derived artifacts;
- [ ] local-only and read-only behavior;
- [ ] deterministic unit/property/metamorphic tests pass;
- [ ] pilot capture performed on one large tool-heavy real conversation;
- [ ] exact beginning/middle/end rendered turns manually sampled against the bundle;
- [ ] multiple candidate tool calls and results inspected against raw nodes;
- [ ] capture report states limitations and verification status.

## Required metamorphic properties

- object-key/graph iteration order does not change normalized semantics;
- whitespace/JSON formatting changes raw hash but not parsed graph semantics;
- unknown metadata additions survive capture and do not change unrelated classification;
- repeated traversal cannot duplicate nodes/edges;
- graph key permutation preserves topology;
- every derived source pointer resolves;
- simulated DOM virtualization converges to the complete rendered fixture set;
- UI-only controls do not alter rendered conversation content;
- a one-byte raw mutation changes the integrity hash.

## Hidden/independent holdout rule

Do not use the second selected real conversation to tune the parser/classifier during PROV-0001. It becomes PROV-0002 and is evaluated only after the pilot implementation is frozen enough to expose generalization failures.

## Checkpoint log

### 2026-09-20 — ChatGPT/Sol

Completed:
- selected separate-extension architecture;
- chose raw conversation representation as archival source and DOM capture as verifier;
- constrained v0.1 to one current conversation before bulk export;
- added multi-session project/checkpoint/task/handoff architecture based on the established Eval Lab pattern.

Evidence:
- existing `chatgpt-10-day-cleaner` demonstrates authenticated session/conversation API patterns;
- existing `chatgpt-transcript-exporter` demonstrates virtualized DOM sweep behavior.

Decisions:
- preserve before classify;
- derive ontology from real pilot captures;
- deterministic tests are correctness oracle; Luna/CUA is behavioral/live smoke support;
- defer account-wide capture until pilot + independent holdout pass.

Blocked/uncertain:
- current ChatGPT conversation response shape/tool-node variants must be validated live;
- no live browser result has been observed yet.

Next:
- implement v0.1 acquisition, lossless graph normalization, conservative event indexing, DOM verifier, bundle hashing, and tests.

### 2026-09-20 — ChatGPT/Sol — deterministic validation checkpoint

Completed:
- resumed from the extension-local handoff and followed its repository read order;
- verified Issue #6 / draft PR #7 / branch `feature/chatgpt-provenance-exporter` and tested PR head `9e77b13f65596b9abe5b1df9722ec0251966e067`;
- attempted direct Git access, then reconstructed the provenance-exporter test inputs from GitHub blobs because the shell environment could not resolve `github.com`;
- verified reconstructed provenance-exporter files against their Git blob SHAs before execution;
- ran the extension-local deterministic/property suite successfully.

Environment:
- OS: Linux `6.18.44`, x86_64;
- Node: `v22.16.0`;
- Brave/Chromium: not available in this session, so no live browser version or smoke evidence is claimed.

Commands/results:
- `git ls-remote https://github.com/Pukujan/custom-extensions.git refs/heads/feature/chatgpt-provenance-exporter` → exit 128, `Could not resolve host: github.com`;
- `node tests/test.js` from the exact reconstructed `extensions/chatgpt-provenance-exporter/` inputs → exit 0, **23 tests passed**;
- `node scripts/test-all.mjs` was invoked from a temporary partial reconstruction → provenance exporter passed 23/23, but the command exited 1 because the three unchanged legacy extension directories were not materialized in that temporary tree. This is an environment/reconstruction limitation and is **not** recorded as a repository-wide test failure or pass.

Blob evidence for the extension-local passing run:
- `core.js` → `b443cd66340b6a36baba1da169e9fcd391f07607`;
- `content.js` → `0576ea720c8941e6d981a80a477660bd64a4e4af`;
- `background.js` → `b2412e459d835a8d67d01348b258ce175094b5c3`;
- `popup.js` → `0606c77074c0228e64d7d74c1639bec252b77b2f`;
- `manifest.json` → `1b0f7d869996b01f20f842c13abf5f90733eb68d`;
- `tests/test.js` → `c43b348033fe703f47a1f491adcfcf1f963779af`.

Evidence/decisions:
- no deterministic implementation defect was exposed by the extension-local suite;
- no parser/classifier rule was changed;
- the repository-wide gate remains unverified in this session because a complete checkout could not be obtained;
- live acquisition, rendered reconciliation, hash recomputation on a real bundle, representative tool-node checks, and scroll restoration remain unverified;
- no bulk-export work was started.

Blockers/uncertainty:
- shell DNS cannot resolve `github.com`, preventing a normal branch checkout and qualifying repository-wide rerun;
- this session has no local Brave/Chromium control, so the PROV-0001 live pilot cannot be executed here.

Next atomic action:
- on a complete local checkout of this branch, run `node scripts/test-all.mjs` and require a clean exit; then load the extension unpacked in Brave/Chromium, capture one deliberately large tool-heavy pilot conversation, perform the structural/hash/rendered/tool-event/scroll-restoration checks in `docs/LOCAL_VALIDATION_LUNA.md`, and append the exact observed results here. Do not start PROV-0002 or bulk export before the pilot checkpoint is complete.

### 2026-09-20 — Codex — repository-wide gate and live-pilot checkpoint

Completed:
- cloned the authoritative `Pukujan/custom-extensions` remote into a local checkout because the supplied project directory contained only project outputs/work folders;
- checked out `feature/chatgpt-provenance-exporter` at `b0513e8a56a4bbde597bfd07e25e5e24d1cda21a`;
- ran the exact repository-wide command below; it passed cleanly;
- no implementation defect was evidenced, so no parser/classifier or extension code was changed;
- no private transcript content was copied into this checkpoint.

Environment:
- OS: Microsoft Windows 11 Home, version `10.0.26200`, build `26200`, 64-bit;
- Brave executable: `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`;
- installed Brave version: `153.1.95.102`;
- Node: `v24.14.1`.

Commands/results:
- `git switch feature/chatgpt-provenance-exporter` → already on the requested branch; initial checkout HEAD `b0513e8a56a4bbde597bfd07e25e5e24d1cda21a`;
- `node scripts/test-all.mjs` from repository root → exit `0`;
- exact suite result: `chatgpt-10-day-cleaner` — `12 invariant/property tests passed`; `linkedin-connection-exporter` — `16 tests passed`; `chatgpt-transcript-exporter` — `18 tests passed`; `chatgpt-provenance-exporter` — `23 tests passed`; final output: `All registered extension test suites passed.`
- the already checkpointed extension-local `node tests/test.js` evidence was not rerun or overwritten; the repository-wide run independently reported the provenance suite at `23 tests passed`.

Live pilot status:
- capture counts: not applicable; no pilot bundle was produced;
- raw response preservation: not performed;
- mapping/node conservation: not performed;
- source-pointer resolution: not performed;
- parent/edge reconciliation: not performed;
- representative tool-call/tool-result checks against raw source: not performed;
- SHA-256 recomputation: not performed;
- rendered first/middle/final/tool-heavy spot checks: not performed;
- rendered reconciliation/discrepancy result: not available;
- lazy-load/stability sweep: not performed;
- scroll-position restoration: not observed.

Observed blocker:
- the in-app Chromium surface rejected `chrome://extensions` under its browser URL policy;
- the sanctioned desktop computer-use surface did find Brave, but stopped before interaction with: `Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy. Stop your work and send a final message noting why Computer Use ended.`
- therefore the extension was not loaded unpacked, no ChatGPT conversation was opened or captured, and no browser result is claimed. The browser safety guard was not bypassed.

Observed defects/fixes:
- none evidenced by `node scripts/test-all.mjs`;
- no code fix was made;
- no bulk export and no PROV-0002 work was started.

Next atomic action:
- in a supervised Brave/Chromium session whose browser-control surface can safely verify the current URL, load `extensions/chatgpt-provenance-exporter/` unpacked, capture one deliberately large tool-heavy conversation, run every structural/hash/rendered/tool-event/lazy-load/scroll check in `docs/LOCAL_VALIDATION_LUNA.md`, append the exact aggregate evidence here, and commit that pilot checkpoint with a `PROV-0001` message. Do not start PROV-0002 or bulk export until the pilot is fully checkpointed.

### 2026-09-20 — Codex — control recovery and built-in browser validation route

Completed:
- verified the repository-wide gate from the complete Windows checkout before changing implementation;
- confirmed the user-observed missing pause/reset controls in the checked-in popup/content architecture: only `START_PROVENANCE_CAPTURE` existed and the runner had only a boolean `running` guard;
- added pause, resume, and reset controls to the installed-extension path;
- made reset cancellation-safe with an active-run token, `AbortController`, serialized status writes, and stale-run suppression;
- added a development-only standalone runtime adapter and payload builder for the ChatGPT desktop built-in browser, preserving the same core/content capture path while retaining the bundle only in page memory;
- updated PDD/SDD, the local validation procedure, and `checkpoints/CURRENT.md` so the built-in browser is the preferred live pipeline validation route and the unpacked MV3 smoke test remains limited to popup/service-worker/storage/download behavior;
- no private transcript text or capture bundle was added to the repository.

Changed files:
- `extensions/chatgpt-provenance-exporter/content.js`
- `extensions/chatgpt-provenance-exporter/popup.html`
- `extensions/chatgpt-provenance-exporter/popup.js`
- `extensions/chatgpt-provenance-exporter/popup.css`
- `extensions/chatgpt-provenance-exporter/tests/test.js`
- `extensions/chatgpt-provenance-exporter/dev/standalone-browser-bootstrap.js`
- `extensions/chatgpt-provenance-exporter/dev/build-browser-payload.mjs`
- `extensions/chatgpt-provenance-exporter/docs/BUILTIN_BROWSER_VALIDATION.md`
- `extensions/chatgpt-provenance-exporter/docs/LOCAL_VALIDATION_LUNA.md`
- `extensions/chatgpt-provenance-exporter/specs/PDD.md`
- `extensions/chatgpt-provenance-exporter/specs/SDD.md`
- `extensions/chatgpt-provenance-exporter/checkpoints/CURRENT.md`
- this task file

Environment:
- OS: Microsoft Windows 11 Home, version `10.0.26200`, build `26200`, 64-bit;
- Node: `v24.14.1`;
- Brave: `153.1.95.102` installed, but no new Brave pilot capture was claimed;
- ChatGPT desktop built-in browser: no browser page/version was available in the controllable ChatGPT app window during this checkpoint; full CDP status is not claimed.

Commands/results:
- `node tests/test.js` from `extensions/chatgpt-provenance-exporter/` → exit `0`, **24 tests passed**;
- `node --check dev/build-browser-payload.mjs` → exit `0`;
- `node --check dev/standalone-browser-bootstrap.js` → exit `0`;
- `node dev/build-browser-payload.mjs | Select-Object -First 8` → exit `0`, payload begins with `/* core.js */` and the browser payload is emitted to standard output;
- `node scripts/test-all.mjs` from repository root → exit `0`; registered suites passed: chatgpt-10-day-cleaner 12, linkedin-connection-exporter 16, chatgpt-transcript-exporter 18, chatgpt-provenance-exporter 24; final output `All registered extension test suites passed.`;
- `git diff --check` → exit `0`; only normal Git LF/CRLF warnings were reported when inspecting the working copy.

Live pilot evidence:
- capture counts: not available; no new pilot bundle was produced;
- raw response preservation, mapping/node conservation, source-pointer resolution, parent/edge reconciliation, representative tool-event/raw-source checks, SHA-256 recomputation, rendered spot checks, rendered reconciliation, lazy-load/stability sweep, and scroll restoration: not performed in this checkpoint;
- prior Brave blocker remains unchanged; the new preferred live route requires the user to enable ChatGPT desktop **Settings → Browser → Developer mode → Enable full CDP access** and open the selected pilot conversation;
- the ChatGPT desktop window currently exposed the Codex app shell rather than an open built-in-browser page, so no CDP page evaluation was attempted and no private content was inspected.

Observed defects/fixes:
- confirmed defect: no pause/resume/reset UI or messages existed → fixed in popup/content runner;
- confirmed design risk: a reset could otherwise be overwritten by in-flight progress writes → fixed with serialized state writes and active-run checks;
- unverified user report: missing tool/source records. The live raw response and bundle are still required before changing conservative classification; no parser/classifier tuning was made.

Blockers:
- user action required before live built-in-browser validation: enable full CDP in the ChatGPT desktop Browser settings and open the exact pilot conversation;
- installed MV3 popup/service-worker/download smoke check remains outstanding;
- PROV-0001 pilot acceptance is not yet passed.

Next atomic action:
- after full CDP is enabled and the exact pilot conversation is open in ChatGPT's built-in browser, evaluate the payload from `docs/BUILTIN_BROWSER_VALIDATION.md`, run pause/resume/reset plus one capture, perform every structural/hash/rendered/tool-event/lazy-load/scroll check from `docs/LOCAL_VALIDATION_LUNA.md`, record aggregate evidence only, then perform the narrow unpacked-MV3 control/download smoke check. Do not start PROV-0002 or bulk export.

### 2026-09-20 — Codex — exact pilot page reached, page evaluator is read-only

Completed:
- opened the exact pilot URL `https://chatgpt.com/c/6ab01034-f144-83ea-bae2-1e71588ccae5` in the available non-Brave Codex In-app Browser surface;
- confirmed the page title is `Handoff Declined`, document state is `complete`, and the page is not actively streaming (`stopButton: false`);
- confirmed the page is signed in enough for the normal ChatGPT page to render the account/sidebar state; no authentication data was copied into the checkpoint;
- kept all returned observations aggregate-only; no transcript text was recorded.

Exact browser observations/results:
- `cua.createBrowserTab("iab", "https://chatgpt.com/c/6ab01034-f144-83ea-bae2-1e71588ccae5", {visible:true})` → Browser tab `2`, title `ChatGPT`, exact requested URL;
- read-only page evaluation of `{href, title, readyState, renderedTurnCount, stopButton}` → `{href: requested URL, title: "Handoff Declined", ready: "complete", turns: 5, stopButton: false}`;
- attempted standalone payload evaluation → rejected with `TypeError: Function is not a constructor`;
- attempted wrapped payload evaluation → rejected because the read-only page global is not extensible (`Cannot add property ChatGPTProvenanceCore, object is not extensible`);
- attempted same-origin session probe → rejected because `fetch` is not available in the read-only evaluator (`TypeError: fetch is not a function`).

Live pilot evidence:
- no raw response, mapping, tool/source bundle, hashes, reconciliation, or download was produced;
- no pause/resume/reset runner invocation was performed because the runner could not be installed in the page;
- the available tab is therefore not the full-CDP surface required by `BUILTIN_BROWSER_VALIDATION.md`.

Blocker update:
- enabling a ChatGPT desktop Browser setting alone is not yet evidenced as sufficient in this session; the next session must expose a CDP-enabled page connection that permits in-page runner evaluation and authenticated same-origin GETs;
- installed MV3 popup/service-worker/download smoke check remains outstanding;
- PROV-0001 pilot acceptance is not yet passed.

Next atomic action:
- obtain a CDP-enabled browser connection for the already-open pilot URL (or have the user open it in the ChatGPT desktop built-in browser with full CDP access enabled), evaluate the standalone payload, exercise pause/resume/reset, capture once, and run every structural/hash/rendered/tool-event/lazy-load/scroll check. Do not start PROV-0002 or bulk export.

Additional rendered observation:
- read-only DOM aggregate probe returned `totalSemanticNodes: 264`, `codeBlocks: 250`, `links: 46`, `buttons: 186`;
- the probe found `matchedAttributeCount: 9`, but all unique matches were sidebar/UI labels (`Search`, project/conversation controls, `tooltip`), not conversation-level tool/source/citation/reference markers;
- this is supporting UI evidence for the reported absence of visibly labeled tool/source records, not proof of raw-source absence. No classifier change was made without raw API evidence.

Additional page-HTML aggregate observation:
- `document.documentElement.outerHTML.length` was `1000860` bytes;
- serialized-page marker counts were `tool_call: 5`, `function_call: 0`, `tool_result: 0`, `tool_output: 0`, `citation: 16`, `content_reference: 1`, `source: 41`, and `reference: 34`;
- the page contained `pre: 130` and `code: 120` elements;
- these counts may include hidden application state and are not treated as raw API evidence. They do indicate that the page contains tool-call/citation-related serialized markers even though the semantic rendered marker probe did not expose clear conversation-level labels, strengthening the case for raw-source validation before classifier edits.

### 2026-09-20 — Codex — make citation visibility explicit

Completed:
- kept the conservative tool/source classifier unchanged because raw API evidence is still unavailable;
- added `citationRecords` to persisted capture progress and completed-state reporting;
- returned derived citations from bundle construction so the popup can report an explicit citation count, including zero;
- reset now clears the citation count with the other progress fields;
- extended the deterministic control test to cover citation visibility.

Commands/results:
- `node tests/test.js` from `extensions/chatgpt-provenance-exporter/` → exit `0`, **24 tests passed**;
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered suites passed, including provenance `24 tests passed`;
- `git diff --check` → exit `0`; only normal LF/CRLF warnings were reported.

Observed defects/fixes:
- confirmed observability defect: a capture could produce a citation artifact without exposing its count in popup status → fixed by reporting `citationRecords` explicitly;
- no raw-source evidence yet proves that tool events or citations are being incorrectly classified, so no classifier rule was changed.

Blockers and next atomic action remain unchanged: obtain a CDP-enabled page connection, run the real capture and validation, then perform the narrow unpacked-MV3 smoke check before declaring PROV-0001 accepted.

### 2026-09-20 — Codex — Brave pilot capture and control retest

Completed:
- opened the exact pilot conversation in Brave at `https://chatgpt.com/c/6ab01034-f144-83ea-bae2-1e71588ccae5`;
- verified the installed `ChatGPT Provenance Exporter` is enabled in Brave's extension manager;
- captured one large tool-heavy conversation without copying transcript contents into this checkpoint;
- validated the downloaded bundle structurally and cryptographically using aggregate-only checks;
- tested Reset from the popup both after a completed capture and while a new capture was active; both returned the popup to `Ready` and the active run was stopped before download;
- used Brave's extension-manager Reload control after the control mismatch was observed, but the browser-control session stopped before a post-reload page retest could be completed.

Environment:
- OS: Microsoft Windows 11 Home, version `10.0.26200`, build `26200`, 64-bit;
- Brave: `153.1.95.102`;
- Node: `v24.14.1`;
- repository branch: `feature/chatgpt-provenance-exporter`.

Exact commands/results:
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered suites passed, including provenance `24 tests passed`; final output `All registered extension test suites passed.`
- prior deterministic extension-local checkpoint remains unchanged; it recorded `node tests/test.js` → exit `0`, `23/23 passed` before the later citation-status test was added;
- post-change extension-local validation previously recorded `node tests/test.js` → exit `0`, `24 tests passed`;
- `node --check dev/build-browser-payload.mjs` → exit `0`;
- `node --check dev/standalone-browser-bootstrap.js` → exit `0`;
- `git diff --check` → exit `0` with only normal LF/CRLF warnings.

Bundle location and capture aggregates:
- download folder: `C:\Users\pujan\Downloads\June 2026\chatgpt-provenance\20260920-Handoff Declined-6ab01034-f144-83ea-bae2-1e71588ccae5`;
- capture ID: `d2d197cc-4bc1-4d1c-914a-7cb4cc9e6a90`;
- raw response bytes preserved before parsing: `1,490,216`;
- mapping keys / normalized nodes: `465 / 465`;
- messages: `464`;
- edges: `464` (explicit parent/child relations checked: `928`);
- tool events: `363` (`127` `tool.call`, `236` `tool.result`);
- citations: `328`;
- rendered turns: `22`; rendered stability: `true`;
- reconciliation: `differences_observed`; comparable rendered/source message IDs: `21/21`; rendered role counts user/assistant `14/8`; source role counts user/assistant `13/215`, tool `236`, none `1`; discrepancies were preserved as role-count mismatches rather than hidden.

Validation results:
- raw response was present and parsed only after the raw text was retained;
- every mapping key had one normalized node and every node source pointer resolved back to its mapping ID;
- all explicit parent/child relations reconciled to the deduplicated edge set;
- all `363` tool records were checked against their corresponding raw mapping node with deep structural equality; representative tool-call records contained assistant/code/recipient and tool metadata, and representative tool-result records contained tool author/content and result metadata;
- tool record class distribution was `tool.call=127`, `tool.result=236`; content types were `code=221`, `execution_output=2`, `multimodal_text=112`, `text=28`;
- the bundle's `integrity/SHA256SUMS.json` contained `12` file hashes; recomputation verified all `12` hashes;
- rendered first/middle/final spot checks completed using aggregate role metadata: first `user`, middle `assistant`, final `user`; rendered stability remained `true`;
- lazy-load sweep completed with `22` stable rendered turns;
- rendered reconciliation completed and recorded the discrepancies above;
- scroll restoration is not accepted yet: the implementation restores the numeric scroll offset, but this run did not produce a sufficiently isolated before/after anchor proof, so no pass is claimed.

Observed defects/fixes:
- the original report that no tool calls or sources were captured was not reproduced for this pilot bundle: `363` tool events and `328` citations were present, including `tool-events.jsonl` and `citations.jsonl`; the popup instance used during this run did not display the newer citation-count line, which is a loaded-build/version observability issue rather than evidence that the records were absent;
- Reset is visibly functional and cancellation-safe in the tested instance;
- Pause remains unresolved in the installed-instance smoke test: after starting a fresh capture, clicking `Pause capture` left the popup at `Capturing… rendered-sweep` and rendered-turn progress continued from `7` to `9`; the subsequent Reset returned `Ready`;
- the pause test was performed before the extension-manager Reload and before the required post-reload page retest, so the current evidence does not distinguish a stale/mixed loaded extension instance from a repository defect; no parser/classifier change was made.

Blockers:
- browser-control safety stopped the Brave session immediately after the extension-manager Reload, before the exact pilot page could be reloaded and the pause/resume control path could be retested against the refreshed extension instance;
- scroll-position restoration still lacks an isolated acceptance proof;
- PROV-0001 pilot acceptance is not yet passed.

Next atomic action:
- in a fresh supervised Brave session, reload the unpacked extension and then reload the exact pilot page; start capture, verify `Pause capture` changes the persisted status to `Capture paused` and freezes counts, verify `Resume capture` restarts progress, and verify Reset aborts without later stale writes; then perform an isolated scroll-anchor before/after check and append only aggregate evidence. Do not start PROV-0002 or bulk export.

### 2026-09-20 — Codex — post-reload pilot acceptance checkpoint

Completed:
- reloaded the unpacked `ChatGPT Provenance Exporter` from Brave's extension manager, then reloaded the exact pilot conversation before the control retest;
- verified the refreshed popup exposed the `Citation records` status line;
- verified pause/resume on the refreshed instance: after a fresh capture reached rendered work, `Pause capture` changed the popup to `Capture paused` and the displayed counts remained at source nodes `465`, rendered turns `9`, tool events `0`, and citation records `0` during the observation window; `Resume capture` changed it back to active capture and rendered progress advanced from `9` to `15` and onward;
- verified Reset after completion returned the refreshed popup to `Ready` with source nodes, tool events, citation records, and rendered turns all `0`; the earlier active-run reset test remains recorded above as cancellation-safe and stopped before download;
- performed the isolated scroll-restoration check from a known pre-capture viewport: the page visibly moved during the lazy rendered sweep and, after completion, returned to the same pre-capture viewport/scroll position; no transcript text is recorded here;
- did not start bulk export or PROV-0002.

Environment:
- OS: Microsoft Windows 11 Home, version `10.0.26200`, build `26200`, 64-bit;
- Brave: `153.1.95.102`;
- Node: `v24.14.1`;
- repository branch: `feature/chatgpt-provenance-exporter`.

Exact commands/results:
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered extension test suites passed, including provenance `24 tests passed`; final output was `All registered extension test suites passed.` The earlier `23/23` deterministic checkpoint remains unchanged and was not overwritten;
- `node --check dev/build-browser-payload.mjs` → exit `0`;
- `node --check dev/standalone-browser-bootstrap.js` → exit `0`;
- `git diff --check` → exit `0` with only normal LF/CRLF warnings;
- aggregate structural validator over the fresh duplicate download set → exit `0`; raw parse, mapping/node conservation, source pointers, parent/child edges, tool/raw equality, and hashes all passed.

Fresh bundle evidence (aggregate-only; no private transcript contents):
- controlled download folder: `C:\Users\pujan\Downloads\June 2026\chatgpt-provenance\20260920-Handoff Declined-6ab01034-f144-83ea-bae2-1e71588ccae5`;
- fresh capture ID: `f9f8ccba-54d9-483f-8746-7f38ba900da0`;
- captured at: `2026-09-20T20:05:51.642Z`;
- raw response bytes preserved before parsing: `1,490,216`;
- mapping keys / normalized nodes / unique node IDs: `465 / 465 / 465`;
- messages: `464`;
- deduplicated edges: `464`; explicit parent relations checked: `464`; explicit child relations checked: `464`; explicit relations checked total: `928`; missing parent/child edges: `0`;
- source pointers missing: `0`;
- tool events: `363` (`127` `tool.call`, `236` `tool.result`); all `363` records were deep-structurally equal to their corresponding raw mapping node; content types were `code=221`, `execution_output=2`, `multimodal_text=112`, `text=28`;
- citations: `328`; artifacts: `0`;
- rendered turns: `22`; rendered stability: `true`; lazy-load repeated sweeps converged;
- rendered first/middle/final aggregate spot checks: `user` at turn index `1`, `assistant` at turn index `6`, `user` at turn index `13`; all sampled records retained message IDs and stable keys; tool-heavy source regions were cross-checked through the raw-backed tool records;
- rendered reconciliation: `differences_observed`, with `21` overlapping comparable message IDs and `2` explicit role-count discrepancies preserved; rendered user/assistant counts `14/8`, source user/assistant counts `13/215`, plus source tool `236` and none `1`;
- SHA-256 recomputation: all `12` listed hashes matched expected digest and byte length;
- raw source, normalized graph, tool/citation indexes, rendered records, reconciliation, and integrity files were all present in the controlled folder. Repeated browser downloads used `(1)` filename suffixes within that same folder; no transcript data was written to the repository or sent to a remote service.

Observed defects/fixes:
- the original report that tools and sources were absent was not reproduced: the fresh bundle contains `363` tool events and `328` citation records, and the refreshed popup exposes the citation count;
- the pre-reload pause-control mismatch was not reproduced after extension/page reload; pause froze progress and resume continued it;
- no classifier or parser rule was changed based only on rendered UI differences; the two rendered/source role-count discrepancies remain explicit in reconciliation;
- no implementation defect remains open for PROV-0001 acceptance. Scroll restoration is currently numeric-offset based but passed the required isolated Brave before/after behavioral check.

Blockers:
- none for PROV-0001 pilot acceptance;
- the built-in ChatGPT browser remains a read-only development surface unless full CDP access is explicitly enabled, so the acceptance evidence is from the required unpacked Brave smoke test.

Acceptance result: **PROV-0001 pilot acceptance passed**.

Next atomic action:
- freeze this pilot bundle as the PROV-0001 baseline and prepare the independent PROV-0002 holdout task; do not begin bulk export and do not alter the pilot classifier to fit this conversation.

## Handoff

Receiving agent: read PROJECT → CURRENT → this task → PDD/SDD/TDD. Do not expand to bulk export. Preserve unexpected source structures and record them rather than tuning them away.
