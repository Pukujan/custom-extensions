# TASK-PROV-0004 — Resumable incremental account-wide exporter

- Status: review
- Owner: ChatGPT/Sol + local repository agent
- Priority: P0
- Depends on: `PROV-0001`, `PROV-0002`, and `PROV-0003`
- Branch: `task/PROV-0004-incremental-export`

## Goal

Add a read-only, resumable account-wide exporter that freezes a deterministic conversation queue, preserves each authenticated raw response before parsing, writes source-preserving derived records, and survives pause/resume/reset, popup closure, retries, and an interrupted run without duplicating or silently skipping conversations.

## Why

The single-conversation path is accepted, but account-wide export has different failure modes: pagination drift, long queues, browser restarts, rate limits, partial downloads, and storage pressure. Those invariants must be explicit and deterministic before any account-wide run is allowed.

## Allowed files

- `extensions/chatgpt-provenance-exporter/account-core.js`;
- `extensions/chatgpt-provenance-exporter/account-runner.js`;
- `extensions/chatgpt-provenance-exporter/background.js`;
- `extensions/chatgpt-provenance-exporter/manifest.json`;
- `extensions/chatgpt-provenance-exporter/specs/ACCOUNT_EXPORT_DESIGN.md`;
- `extensions/chatgpt-provenance-exporter/tests/**`;
- this task and `checkpoints/CURRENT.md`;
- no downloaded transcript bundles or private account data.

The existing popup remains the single-capture UI in this task. Account-wide live controls are not exposed until deterministic runner tests and a separate controlled smoke checkpoint authorize them.

## Rules

- read-only ChatGPT access only;
- no POST, PATCH, PUT, or DELETE endpoint;
- raw response text is preserved before JSON parsing;
- storage contains only bounded progress/queue metadata, never raw transcript bodies or tokens;
- queue order is frozen before detail export;
- a failed item does not advance the completion index;
- reset is cancellation-safe and cannot be overwritten by stale progress;
- retries overwrite deterministic paths and never use `uniquify` for account evidence;
- no bulk export is started by this task.

## Acceptance criteria

- [x] design contract is recorded in `specs/ACCOUNT_EXPORT_DESIGN.md`;
- [x] account-core deterministic functions cover queue, pagination, checkpoint, path, and conservation invariants;
- [x] account runner is read-only, same-origin, retry-bounded, pause/resume/reset capable, and persists checkpoints;
- [x] per-conversation output retains raw response text and source-preserving derived files;
- [x] storage never receives raw response bodies, access tokens, or transcript text;
- [x] account downloads use deterministic overwrite paths under `chatgpt-provenance-account/<run-id>/`;
- [x] manifest/integrity reconciliation is deterministic;
- [x] extension-local tests pass;
- [x] repository-wide tests pass;
- [x] no live account-wide run is performed until a later checkpoint explicitly authorizes it;
- [x] checkpoint records exact commands/results, design decisions, blockers, and one next atomic action.

## Planned commands

```text
node tests/test.js
node scripts/test-all.mjs
git diff --check
```

## Checkpoint log

### 2026-09-20 — Codex — PROV-0004 opened

Completed:
- created `task/PROV-0004-incremental-export` from the accepted PROV-0003 ontology checkpoint;
- inspected the existing cleaner pagination/state runner as a reference;
- explicitly excluded the cleaner's conversation mutation endpoint from this task;
- recorded the account-wide design contract in `specs/ACCOUNT_EXPORT_DESIGN.md`.

Decisions:
- freeze the ordered unique conversation-ID queue before fetching details;
- persist only queue/progress metadata in extension storage;
- treat the authenticated conversation response text as primary evidence;
- keep rendered DOM verification out of account-wide output and retain it as a single-capture operation;
- do not expose or execute bulk export in this task.

Blockers/uncertainty:
- live account enumeration and rate-limit behavior remain unverified until deterministic gates pass and a later checkpoint authorizes a controlled smoke run;
- ChatGPT's undocumented endpoint/schema may drift and must fail visibly.

Next:
- implement the pure account-core contract and deterministic tests before wiring the long-running runner.

### 2026-09-20 — Codex — deterministic implementation checkpoint

Completed:
- added `account-core.js` with versioned account schema, strict page normalization, frozen unique queue construction, pagination drift detection, queue fingerprinting, progress conservation, retryable failure recording, and traversal-safe deterministic paths;
- added `account-runner.js` as a long-running content runner with same-origin GET-only enumeration/detail reads, raw response preservation before parsing, bounded transient retries, serialized storage writes, pause/resume/reset, page-reload recovery, per-conversation source-preserving files, per-conversation SHA-256 metadata, and final account manifest/catalog/integrity index;
- extended `background.js` with safe account-directory validation and explicit deterministic `overwrite` conflict handling for retries;
- declared account-core and account-runner in the MV3 content-script order after the existing single-capture runner;
- added deterministic tests for syntax, pagination termination/drift, queue uniqueness/order, progress conservation and retryability, path safety/fingerprints, raw-before-parse/storage invariants, overwrite behavior, and write-endpoint exclusion;
- kept the existing popup as the single-capture UI. No account-wide start control was exposed and no account-wide export was run.

Exact environment:
- OS: `Microsoft Windows 11 Home 10.0.26200 build 26200 AMD64`;
- Node: `v24.14.1`;
- Brave live surface: previously validated at `Brave 153.1.95.102`, but no account-wide live run was performed for this checkpoint by design;
- branch: `task/PROV-0004-incremental-export`.

Exact commands/results:
- `node tests/test.js` from `extensions/chatgpt-provenance-exporter/` → exit `0`; `33 tests passed`;
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered extension suites passed; provenance suite `33 tests passed`; final output: `All registered extension test suites passed.`;
- `git diff --check` → exit `0`; only existing LF/CRLF conversion warnings for tracked files;
- the only failed command during this checkpoint was an initial `node tests/test.js` invoked from repository root, which correctly returned `MODULE_NOT_FOUND`; it was immediately rerun from the documented extension directory and passed. No code change was needed for that command-location error.

Evidence/reconciliation:
- deterministic queue tests observed `3` unique IDs from `4` listed items with duplicate preservation by first occurrence;
- repeated full pages and full pages with zero new IDs fail closed;
- progress remains conserved (`completed_ids.length === next_index`) and a failed queue head remains retryable without advancing;
- account paths sanitize traversal characters and queue fingerprints are deterministic `fnv1a64` values;
- runner source statically confirms raw `response.text()` precedes `JSON.parse`, storage writes do not include raw text, account downloads request `overwrite`, and no POST/PATCH/PUT/DELETE/XHR/WebSocket path is present;
- no private transcript contents, raw IDs, or downloaded bundles were added to Git;
- no live capture counts, rendered reconciliation, or account API response hashes are claimed for this task because live account export was intentionally not run.

Observed defects/fixes:
- brittle test assumption expected `completed_ids` text in the runner even though progress conservation is delegated to `account-core`; changed the test to assert the runner calls `accountCore.completeItem`;
- pagination logic initially detected only repeated identical full pages; tightened it to reject any full page with zero new IDs;
- replaced the potentially large manifest-embedded canonical queue string with a compact deterministic queue fingerprint;
- no remaining deterministic test failures.

Blockers/uncertainty:
- ChatGPT's undocumented account-list/detail endpoints and rate-limit behavior still need a controlled live smoke run;
- no account-wide run is authorized yet, so end-to-end download counts and browser runtime behavior remain unverified for PROV-0004;
- rendered DOM verification is intentionally not part of account-wide output and remains covered by the accepted single-conversation pilot/holdout path.

Acceptance result: **PROV-0004 deterministic design/implementation gate passed; live account smoke remains intentionally unresolved.**

Next:
- commit this review checkpoint, then open PROV-0005 for official ChatGPT export import/reconciliation while retaining the explicit PROV-0004 live-smoke authorization as a later controlled action; do not start account-wide export.

## Handoff

Read `PROJECT.md → checkpoints/CURRENT.md → this task → specs/SDD.md → specs/ACCOUNT_EXPORT_DESIGN.md` before continuing. Do not start a live account-wide export without a later explicit checkpoint.
