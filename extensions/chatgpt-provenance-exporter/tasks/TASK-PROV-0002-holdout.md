# TASK-PROV-0002 — Independent Conversation Holdout

- Status: complete
- Owner: ChatGPT/Sol + local Luna/browser agent for live validation
- Priority: P0
- Depends on: `PROV-0001` pilot acceptance at commit `b9e996263090f5d8d3dca55dd4b2210fe0cdc580`
- Branch: `task/PROV-0002-holdout`
- Pilot issue/PR: #6 / #7 (pilot baseline only)

## Goal

Validate the frozen provenance exporter against a second, independent, deliberately difficult ChatGPT conversation before any account-wide export work or pilot-specific classifier tuning.

## Why

The pilot proves the implementation can preserve one difficult source representation. A separate holdout tests whether the same source-conservation, tool/citation, rendered-reconciliation, and integrity properties generalize to a different conversation shape.

## Selection rule

- select a conversation different from pilot `6ab01034-f144-83ea-bae2-1e71588ccae5`;
- prefer research, coding/build, execution, citations, files/artifacts, branches/regenerations, or an unusual tool family;
- record only the conversation ID, title metadata if needed for the bundle path, aggregate counts, hashes, discrepancies, and defects; never copy private transcript text into the repository;
- do not change parser/classifier rules until the holdout evidence is recorded and compared against the frozen pilot implementation.

## Allowed files

- `extensions/chatgpt-provenance-exporter/**`;
- `extensions/registry.json` only if registration is required;
- root status/handoff docs only when repository-wide state changes.

## Acceptance criteria

- [ ] independent conversation selected and safely identified;
- [ ] deterministic suite passes before live capture;
- [ ] raw authenticated response is retained before parsing;
- [ ] mapping keys equal normalized node records with no duplicate node IDs;
- [ ] every source pointer resolves;
- [ ] every exposed parent/child relation is represented by an edge;
- [ ] unknown fields/types remain in raw-backed records;
- [ ] representative tool-call/tool-result records deep-match their raw nodes;
- [ ] citation/source records are counted and source-backed when exposed;
- [ ] SHA-256 values recompute for every listed bundle file;
- [ ] rendered first/middle/final and tool-heavy regions are spot-checked without recording transcript contents;
- [ ] lazy-load repeated sweeps converge or report an explicit discrepancy;
- [ ] rendered/raw reconciliation preserves mismatches rather than hiding them;
- [ ] pause/resume/reset behavior remains cancellation-safe on the refreshed unpacked instance;
- [ ] scroll position is restored after the rendered sweep;
- [ ] bundle is local-only and no bulk export is started;
- [ ] all commands/results and blockers are appended here, then committed with a `PROV-0002` message.

## Required metrics

- node recall and explicit parent-edge recall: `100%` relative to captured source;
- source-pointer validity: `100%`;
- raw-node retention: `100%` for sampled and representative derived records;
- duplicate normalized node rate: `0%`;
- deterministic rerun/serialization equality: `100%` for the applicable checks;
- known-class precision/recall reported separately from unknown/fallback records;
- raw/rendered discrepancies reported explicitly.

## Planned commands

From `extensions/chatgpt-provenance-exporter/`:

```text
node tests/test.js
```

From repository root:

```text
node scripts/test-all.mjs
git diff --check
```

The live bundle must also be checked with aggregate-only deterministic Node validation; no private transcript contents belong in the checkpoint.

## Checkpoint log

### 2026-09-20 — Codex — holdout task opened

Completed:
- created the independent holdout task from the accepted PROV-0001 baseline;
- created branch `task/PROV-0002-holdout` from `b9e996263090f5d8d3dca55dd4b2210fe0cdc580`;
- preserved the PROV-0001 pilot bundle and parser/classifier implementation unchanged;
- began locating a second ChatGPT conversation in the authorized Brave session, but the browser-control session was stopped by the user's physical Escape key before a holdout conversation was opened or captured.

Evidence:
- repository state was clean before branch creation;
- no holdout capture or additional download was produced in this checkpoint;
- no pilot transcript content was copied into this task.

Decisions:
- the pilot remains the frozen baseline;
- no classifier/parser changes will be made before holdout evidence exists;
- bulk export remains prohibited until this task passes.

Blocked/uncertain:
- holdout conversation ID has not yet been selected;
- live browser work must resume in a fresh supervised session because Computer Use reported that the user stopped the turn.

Next:
- reopen the authorized Brave ChatGPT session, select one independent tool-heavy conversation (not the pilot), and run the pre-capture deterministic/live smoke sequence.

### 2026-09-20 20:31:14 UTC — Codex — deterministic holdout gate

Completed:
- verified the frozen implementation before resuming live holdout work;
- retained the browser-control interruption as an explicit blocker rather than inferring a conversation selection or capture.

Evidence:
- `node tests/test.js` from `extensions/chatgpt-provenance-exporter/` → exit `0`; `24 tests passed`;
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered suites passed, including provenance `24 tests passed`; final output: `All registered extension test suites passed.`;
- the holdout branch remained clean before this checkpoint append; no live bundle was created and no private transcript content was added.

Changed:
- `extensions/chatgpt-provenance-exporter/tasks/TASK-PROV-0002-holdout.md` only.

Blocked/uncertain:
- Computer Use reported: `Computer Use was stopped by the user with the physical Escape key.` No further browser input was issued in that turn;
- an independent holdout conversation has not yet been opened, selected, or captured.

Next:
- in a fresh supervised browser-control turn, select the independent holdout conversation and run the frozen capture/validation sequence; do not start bulk export.

### 2026-09-20 20:40:36 UTC — Codex — holdout acceptance checkpoint

Completed:
- selected the independent ChatGPT conversation `https://chatgpt.com/c/6ab01a29-1e0c-83ea-a624-2dcb02656404` titled `Eval-lab PR 20 gate`, distinct from the PROV-0001 pilot;
- opened the installed unpacked exporter on that conversation and reset the persisted pilot state before starting;
- captured one large, tool-heavy holdout conversation with the frozen implementation;
- exercised pause during the holdout run: popup changed to `Capture paused` with `Resume capture`, and the displayed progress remained unchanged during the pause observation;
- exercised resume: popup changed to active capture and the run advanced to source acquisition/rendered sweep and completion;
- exercised active reset after starting a second holdout run: popup returned to `Ready`, all progress counts returned to `0`, and no second bundle was produced;
- visually compared the pre-capture and post-completion viewport: the page moved during the lazy rendered sweep and returned to the same pre-capture viewport/scroll position;
- did not change parser/classifier rules, start bulk export, or add private transcript contents to the repository.

Environment:
- OS: Microsoft Windows 11 Home, version `10.0.26200`, build `26200`, 64-bit;
- Brave: `153.1.95.102`;
- Node: `v24.14.1`;
- repository branch: `task/PROV-0002-holdout`.

Exact commands/results:
- `node tests/test.js` from `extensions/chatgpt-provenance-exporter/` → exit `0`; `24 tests passed`;
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered suites passed, including provenance `24 tests passed`; final output: `All registered extension test suites passed.`;
- aggregate-only structural Node validator over the holdout folder → exit `0`; raw parse, conservation, pointers, edges, raw-backed tool records, reconciliation, and hashes all passed;
- `git diff --check` → exit `0` with only normal LF/CRLF warnings.

Holdout bundle evidence (aggregate-only; no private transcript contents):
- controlled download folder: `C:\Users\pujan\Downloads\June 2026\chatgpt-provenance\20260920-Eval-lab PR 20 gate-6ab01a29-1e0c-83ea-a624-2dcb02656404`;
- capture ID: `1f95f8f3-fb06-498f-845e-b28c69a13941`;
- captured at: `2026-09-20T20:38:27.029Z`;
- raw response bytes preserved before parsing: `3,154,583`;
- mapping keys / normalized nodes / unique node IDs: `984 / 984 / 984`;
- messages: `983`;
- deduplicated edges: `983`; explicit parent relations checked: `983`; explicit child relations checked: `983`; explicit relations checked total: `1,966`; missing parent/child edges: `0`;
- source pointers missing: `0`;
- tool events: `862` (`351` `tool.call`, `511` `tool.result`); all `862` records were deep-structurally equal to their corresponding raw mapping node; content types were `code=644`, `execution_output=51`, `multimodal_text=163`, `text=4`;
- citations: `740`; artifacts: `0`;
- rendered turns: `12`; rendered stability: `true`; repeated lazy-load sweep converged;
- rendered first/middle/final aggregate spot checks: `user` at turn index `1`, `user` at turn index `7`, `assistant` at turn index `12`; all sampled records retained message IDs and stable keys;
- rendered reconciliation: `differences_observed`, with `12` overlapping comparable rendered/source IDs and one explicit assistant role-count discrepancy preserved (`rendered=6`, `source=466`); rendered user/assistant counts `6/6`, source user/assistant counts `6/466`, plus source tool `511` and none `1`;
- SHA-256 recomputation: all `12` listed hashes matched expected digest and byte length;
- raw source, normalized graph, tool/citation indexes, rendered records, reconciliation, and integrity files were present in the controlled folder.

Observed defects/fixes:
- no holdout conservation, pointer, lineage, raw-backed tool-event, citation, hash, or rendered-stability defect was found;
- the one raw/rendered role-count discrepancy remains explicitly recorded and is not silently corrected;
- pause/resume/reset and viewport restoration behaved as required on the independent conversation;
- no implementation fix was justified by this holdout, so the pilot implementation remains frozen.

Blockers:
- none for PROV-0002 holdout acceptance;
- bulk export remains prohibited until the next phase's ontology/checkpoint work is complete.

Acceptance result: **PROV-0002 holdout acceptance passed**.

Next:
- freeze the two-chat v0.1 evidence baseline and begin PROV-0003 ontology v0.1 from aggregate class/content distributions; do not begin account-wide export.

## Handoff

Read `PROJECT.md → checkpoints/CURRENT.md → TASK-PROV-0002-holdout.md → specs/TDD.md` before continuing. Do not start bulk export or tune the pilot classifier.
