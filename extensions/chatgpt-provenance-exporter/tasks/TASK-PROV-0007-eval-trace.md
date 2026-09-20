# TASK-PROV-0007 — Eval Lab trace compatibility adapter

- Status: active
- Owner: ChatGPT/Sol + local repository agent
- Priority: P1
- Depends on: `PROV-0001` through `PROV-0006` deterministic checkpoints
- Branch: `task/PROV-0007-eval-trace`

## Goal

Define and implement a deterministic local adapter from provenance bundles to a versioned portable evaluation trace, preserving mapping-node identity, source pointers, parent relationships, tool records, and explicit unmatched live events.

## Why

The project needs evaluation-friendly traces without sacrificing immutable source evidence. The repository has no pinned external Eval Lab schema, so a namespaced adapter and validator provide a safe compatibility boundary until an authorized target schema is available.

## Allowed files

- `extensions/chatgpt-provenance-exporter/eval-core.js`;
- `extensions/chatgpt-provenance-exporter/tools/export-eval-trace.mjs`;
- `extensions/chatgpt-provenance-exporter/specs/EVAL_TRACE_DESIGN.md`;
- `extensions/chatgpt-provenance-exporter/tests/**`;
- this task and `checkpoints/CURRENT.md`;
- no private bundles, transcript text, live event bodies, or network integration.

## Rules

- local-only deterministic conversion;
- no claim of native Eval Lab compatibility without an external pinned schema/validator;
- exactly one trace span per source mapping node;
- tool input/output retains complete source-derived objects;
- unknown and unmatched records remain visible;
- no raw source rewriting and no remote upload.

## Acceptance criteria

- [ ] portable trace schema and claim boundary are documented;
- [ ] source nodes/edges/tools convert deterministically to trace spans;
- [ ] source pointers, parent spans, unknown classes, and raw-source references are retained;
- [ ] optional live-only events remain explicit unmatched spans;
- [ ] validator covers node/span/tool/parent conservation and deterministic ordering;
- [ ] local CLI exports a trace from a redacted structural fixture without network access;
- [ ] deterministic tests and repository-wide tests pass;
- [ ] checkpoint records exact commands/results, blockers, and next atomic action.

## Planned commands

```text
node tests/test.js
node tools/export-eval-trace.mjs --help
node scripts/test-all.mjs
git diff --check
```

## Checkpoint log

### 2026-09-20 — Codex — PROV-0007 opened

Completed:
- created `task/PROV-0007-eval-trace` from the clean PROV-0006 checkpoint;
- confirmed the repository has no external Eval Lab schema or validator;
- recorded the portable, namespaced, source-preserving adapter contract in `specs/EVAL_TRACE_DESIGN.md`.

Decisions:
- use explicit `custom-extensions...` schema versioning instead of inventing a native vendor format;
- emit one span per source mapping node and retain source/raw references;
- represent live-only events as unmatched rather than forcing false source links.

Blockers/uncertainty:
- native Eval Lab field names and acceptance criteria require an external schema/validator that is not present in the repository;
- no private bundle or live event payload will be used in this checkpoint.

Next:
- implement the pure adapter/validator and redacted local CLI.

### 2026-09-20 — Codex — deterministic trace-adapter checkpoint

Completed:
- added `eval-core.js` with namespaced portable trace construction, one source span per mapping node, deterministic parent/span IDs, source-backed tool input/output, explicit unmatched live spans, and conservation validation;
- added `tools/export-eval-trace.mjs`, a local-only CLI that reads an existing capture bundle, optionally accepts page-memory live events, validates the result, and writes a new trace JSON without modifying the bundle;
- added deterministic tests for source/span/tool/parent conservation, broken-parent discrepancy reporting, deterministic ordering, CLI help, and redacted structural bundle export;
- kept native external Eval Lab integration unclaimed because no target schema or validator is present in the repository.

Exact environment:
- OS: `Microsoft Windows 11 Home 10.0.26200 build 26200 AMD64`;
- Node: `v24.14.1`;
- browser: not used for this local adapter checkpoint;
- branch: `task/PROV-0007-eval-trace`.

Exact commands/results:
- `node tests/test.js` from `extensions/chatgpt-provenance-exporter/` → exit `0`; `54 tests passed`;
- `node tools/export-eval-trace.mjs --help` from `extensions/chatgpt-provenance-exporter/` → exit `0`; printed the local-only portable trace contract;
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered extension suites passed; provenance suite `54 tests passed`; final output: `All registered extension test suites passed.`;
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings for tracked files.

Deterministic evidence:
- a redacted three-node source graph produced exactly `3` source spans and `2` tool spans;
- one supplemental live event produced one explicit `live:1` unmatched event span with `source_pointer: null`;
- repeated trace construction produced identical canonical output;
- corrupted parent span validation returned `differences_observed` with a `parent_mismatch` finding;
- CLI export from a redacted structural bundle returned `ok: true` and `validation.status: no_differences_observed`;
- CLI source is local-only and contains no fetch/HTTP/remote upload path;
- no private transcript contents, event bodies, bundles, or raw IDs were added to Git.

Observed defects/fixes:
- none after deterministic implementation; all initial PROV-0007 tests passed on the recorded run.

Blockers/uncertainty:
- native Eval Lab compatibility cannot be asserted until an external pinned schema and validator are supplied;
- PROV-0004 controlled account smoke, PROV-0005 real-ZIP validation, and PROV-0006 built-in-browser live-event smoke remain unrun by design;
- the portable adapter deliberately does not infer unsupported native fields.

Acceptance result: **PROV-0007 deterministic portable trace-adapter gate passed; native external compatibility and live validations remain unresolved.**

Next:
- commit this review checkpoint, then return to the controlled live-validation backlog only when the user authorizes the relevant real sources; do not start account-wide export automatically.

## Handoff

Read `PROJECT.md → checkpoints/CURRENT.md → this task → specs/SDD.md → specs/EVAL_TRACE_DESIGN.md` before continuing. Do not claim native external compatibility without a pinned target schema.
