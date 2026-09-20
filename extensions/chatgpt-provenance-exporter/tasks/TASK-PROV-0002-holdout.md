# TASK-PROV-0002 — Independent Conversation Holdout

- Status: active
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

## Handoff

Read `PROJECT.md → checkpoints/CURRENT.md → TASK-PROV-0002-holdout.md → specs/TDD.md` before continuing. Do not start bulk export or tune the pilot classifier.
