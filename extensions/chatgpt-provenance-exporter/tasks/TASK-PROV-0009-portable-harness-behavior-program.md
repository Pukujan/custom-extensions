# TASK-PROV-0009 — Portable harness behavior program

Status: `IN_PROGRESS` — planning checkpoint; implementation begins after the current account run is finalized and the harness repository is identified.

## Objective

Turn ChatGPT Work/Cloud behavior into a durable, source-backed behavioral reference that can improve Kilo, OpenCode, and future harnesses without copying private transcript bodies into Git or requiring identical wording/tool order.

The exporter supplies the evidence plane. A separate harness engine must enforce the process plane.

## Scope boundary

- This repository owns the ChatGPT provenance exporter, raw/normalized evidence, validation, and portable trace formats.
- The harness implementation remains in its own repository. Its local path is not present in this checkout; do not invent or modify a harness path until its repository handoff is available.
- Raw responses remain immutable and local. Git receives schemas, tests, aggregate reports, hashes, and redacted examples only.
- ChatGPT behavior is observational gold, not an absolute semantic oracle. A harness may take an equivalent valid path when evidence and outcome requirements are met.

## Durable architecture

```text
immutable raw response
  -> normalized provenance graph
  -> canonical chronological event stream
  -> evidence/behavior annotations
  -> harness-neutral evaluation trace
  -> Kilo/OpenCode/future adapters
```

## Exporter workstream

### E0 — Close the current account checkpoint

1. Resume the existing paused Brave account run; do not reset it.
2. Wait for `manifest.json`, `catalog/conversations.jsonl`, and `integrity/SHA256SUMS.json`.
3. Validate every per-conversation report, raw-before-parse flag, mapping/node conservation, source pointers, parent/edge reconciliation, tool raw backing, citations, and all hashes.
4. Record aggregate-only results in `TASK-PROV-0004-incremental-export.md` and commit a checkpoint.

Exit gate: account-level files exist and aggregate validation has zero integrity/conservation failures.

### E1 — Freeze the portable trace contract

Add a versioned `events.jsonl` derived stream. It must preserve source pointers and represent observable messages, tool calls/results, citations, artifacts, status, retry, pause/resume, compaction, checkpoint, handoff, and unknown events. Missing observability is recorded explicitly as `not_observed` or `not_available`.

Exit gate: deterministic regeneration from raw evidence produces byte-stable output and no raw evidence is changed.

### E2 — Add behavior annotations

Add separate derived annotation files for `orient`, `inspect`, `decompose`, `research`, `compare_sources`, `plan`, `execute`, `verify`, `revise`, `synthesize`, `blocked`, `handoff`, and `complete`.

Each annotation must include source pointers, supporting tool/citation references, classifier version, confidence, and `observed` versus `inferred` status.

Exit gate: every inferred label is evidence-linked; unknown and disagreement states remain visible.

### E3 — Add research ownership links

Represent `claim -> source/citation/tool result -> plan or action` relationships. Preserve source quality, conflicts, unresolved questions, and unsupported claims without silently resolving them.

Exit gate: a validator can report unsupported claims, missing evidence links, and citation/source mismatches.

### E4 — Add dataset-level metadata

The account manifest should record capture version, ontology/classifier versions, browser/mode metadata when available, source coverage, partial-run state, privacy policy, and hashes. A paused or partial run must be distinguishable from a completed corpus.

## Harness workstream

### H0 — Establish the harness repository contract

Read its `AGENTS.md`, `PLAN.md`, `HANDOFF.md`, current checkpoint, test commands, and existing issue log. Preserve the issue log's no-skips/no-exceptions rules. Reconcile the existing Kilo/OpenCode failure metrics before implementation.

### H1 — Build a persistent state machine

Required states:

`INTAKE -> ORIENT -> DECOMPOSE -> RESEARCH -> PLAN -> EXECUTE -> VERIFY -> SYNTHESIZE -> CHECKPOINT -> DONE`, plus `BLOCKED`, `REPLAN`, and `HANDOFF`.

Every transition needs inputs, allowed tools, exit conditions, evidence requirements, and persisted state. A model's assertion of completion is never sufficient by itself.

### H2 — Add a task contract and plan graph

Persist objective, scope, constraints, success criteria, artifacts, research questions, risks, assumptions, dependencies, atomic tasks, done conditions, and verification commands. Plans may be revised, but abandoned obligations must remain recorded.

### H3 — Separate planner, worker, and critic roles

Use logical roles even when they share a model: planner decomposes, worker executes, critic checks evidence and completion. Add bounded replanning after failures instead of allowing indefinite tool loops.

### H4 — Enforce research and verification gates

Before plan approval, require enough source inspection, authoritative-source assessment, conflict handling, and evidence-to-plan links. Before success, require tests/commands, artifact inspection, diff review, unresolved-defect disclosure, and comparison against the original task contract.

### H5 — Make compaction and recovery durable

Compaction must preserve open tasks, evidence links, failed attempts, assumptions, source quality, next atomic action, and checkpoint hash. Detect no-progress loops, stale workspace state, repeated tool failures, and unsupported claims; then retry, replan, gather evidence, pause, or mark blocked.

### H6 — Build the adapter-neutral interface

Expose common operations such as `start_task`, `read_workspace`, `research`, `run_tool`, `record_evidence`, `checkpoint`, `pause`, `resume`, `verify`, and `synthesize`. Kilo, OpenCode, and future harnesses become adapters rather than separate behavior implementations.

### H7 — Evaluate matched tasks, not style

Use the existing long Work-task set. Score outcome correctness, decomposition, research sufficiency, evidence grounding, verification, recovery, artifact quality, checkpoint quality, and unsupported-claim rate. Do not demand identical prose or tool order.

Exit gate: owner-approved behavior match on the holdout set, with mutation/metamorphic/differential tests still green.

## Execution order

1. Resume and finalize the current account run.
2. Push the local provenance checkpoint and reconcile PR #7.
3. Freeze the portable event/annotation contracts.
4. Identify and read the harness repository handoff.
5. Implement the harness state machine and durable task contract.
6. Add planner/worker/critic and research/verification gates.
7. Build adapters for Kilo and OpenCode.
8. Replay matched tasks and classify failures.
9. Iterate until the owner accepts the behavior match.

## Current blockers

- PR #7 is still draft/open; the remote branch is behind this checkout.
- The current account run is intentionally paused and not yet finalized.
- The harness-on-steroids repository path is not available in this workspace.
- No private transcript body or account bundle may be committed.

## Next atomic action

Commit the current handoff/plan clarification, push the branch, then resume the existing controlled account run and validate finalization. After that, obtain the harness repository path and perform its mandated handoff read before changing harness code.
