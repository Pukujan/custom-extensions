# TASK-PROV-0005 — Official ChatGPT export importer/reconciliation

- Status: active
- Owner: ChatGPT/Sol + local repository agent
- Priority: P1
- Depends on: `PROV-0001`, `PROV-0002`, `PROV-0003`, and the PROV-0004 design checkpoint
- Branch: `task/PROV-0005-official-import`

## Goal

Import a user-provided official ChatGPT data-export ZIP locally, preserve the original archive as primary evidence, derive the same source-preserving provenance indexes, and report discrepancies against an optional account-export catalog without silently merging or correcting either source.

## Why

The official export is an independent account-level source. It can reveal conversations unavailable to a browser list endpoint and can expose differences caused by deletion, eligibility, workspace boundaries, or timing. It must remain a separately preserved source, not be treated as a replacement for authenticated captures.

## Allowed files

- `extensions/chatgpt-provenance-exporter/official-core.js`;
- `extensions/chatgpt-provenance-exporter/official-zip.js`;
- `extensions/chatgpt-provenance-exporter/tools/import-official-export.mjs`;
- `extensions/chatgpt-provenance-exporter/specs/OFFICIAL_IMPORT_DESIGN.md`;
- `extensions/chatgpt-provenance-exporter/tests/**`;
- this task and `checkpoints/CURRENT.md`;
- no real user ZIPs, transcript text, or raw IDs.

## Rules

- local input only; no browser/network access;
- preserve input ZIP bytes before parsing/derivation;
- reject unsafe/encrypted/malformed ZIP entries;
- retain raw source pointers and complete raw nodes in derived records;
- duplicates and source disagreements remain explicit reconciliation findings;
- output writes only beneath the caller-supplied output directory;
- no real official ZIP is imported in this checkpoint.

## Acceptance criteria

- [ ] official ZIP design and source reference are recorded;
- [ ] stored and deflated ZIP entries are parsed with safety checks;
- [ ] `conversations.json` and numbered/structural conversation JSON documents are discovered;
- [ ] original ZIP bytes are preserved and hashed before parsing;
- [ ] normalized conversation/node/edge/message/tool/citation/artifact records preserve source pointers and raw nodes;
- [ ] optional account-catalog reconciliation reports missing IDs, duplicates, and metadata mismatches without mutation;
- [ ] deterministic tests cover parsing, conservation, reconciliation, and hash integrity;
- [ ] CLI syntax/help is deterministic and no real private ZIP is used;
- [ ] repository-wide tests pass;
- [ ] checkpoint records exact commands/results, blockers, and next atomic action.

## Planned commands

```text
node tests/test.js
node tools/import-official-export.mjs --help
node scripts/test-all.mjs
git diff --check
```

## Checkpoint log

### 2026-09-20 — Codex — PROV-0005 opened

Completed:
- created `task/PROV-0005-official-import` from the clean PROV-0004 checkpoint;
- verified from OpenAI's official help documentation that the data export is a ZIP and may contain `conversations.json` or numbered conversation JSON files;
- recorded the source-preserving importer/reconciliation contract in `specs/OFFICIAL_IMPORT_DESIGN.md`.

Decisions:
- implement a local Node CLI rather than adding browser permissions or a second live ChatGPT path;
- retain the complete ZIP as raw evidence and use structural source pointers into its JSON entries;
- preserve duplicate/missing/mismatched source findings instead of inferring causes;
- use redacted in-memory ZIP fixtures only; do not copy a private user export into Git.

Blockers/uncertainty:
- exact future official-export entry variants may drift; structural discovery must fail visibly for malformed mappings and report unrecognized JSON files;
- no real official ZIP is available or authorized for this checkpoint.

Next:
- implement the pure ZIP reader/import core and redacted deterministic tests, then wire the CLI.

### 2026-09-20 — Codex — deterministic importer checkpoint

Completed:
- added `official-zip.js`, a dependency-free Node ZIP reader supporting stored and deflated entries with CRC, path, encryption, size, duplicate-name, and central-directory checks;
- added `official-core.js` for structural conversation discovery, official ZIP source pointers, source-preserving graph/tool/citation/artifact derivation, and explicit optional account-catalog reconciliation;
- added `tools/import-official-export.mjs`, a local-only CLI that preserves the original ZIP bytes, writes normalized/reconciliation files beneath a caller-supplied empty directory, and emits SHA-256 metadata;
- extended deterministic tests with redacted ZIP fixtures, stored/deflated parsing, unsafe/encrypted rejection, duplicate/ignored JSON discovery, source-pointer/node/tool conservation, reconciliation discrepancies, CLI help, raw-byte preservation, and hash recomputation;
- did not add browser permissions, network access, ChatGPT session access, or real user export data.

Exact environment:
- OS: `Microsoft Windows 11 Home 10.0.26200 build 26200 AMD64`;
- Node: `v24.14.1`;
- browser: not used for this local importer checkpoint; no real official ZIP was supplied or opened;
- branch: `task/PROV-0005-official-import`.

Exact commands/results:
- `node tests/test.js` from `extensions/chatgpt-provenance-exporter/` → exit `0`; `42 tests passed`;
- `node tools/import-official-export.mjs --help` from `extensions/chatgpt-provenance-exporter/` → exit `0`; printed the two-line usage contract and the raw-archive/output-directory safety notes;
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered extension suites passed; provenance suite `42 tests passed`; final output: `All registered extension test suites passed.`;
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings for tracked files;
- the tests created only redacted temporary ZIP/output data under the system temporary directory and removed it in a `finally` block; no private export entered the repository or Downloads folder.

Deterministic evidence:
- both ZIP methods (stored `0`, deflated `8`) were parsed and round-tripped;
- unsafe traversal and encrypted entries were rejected; CRC mismatches would fail closed;
- a redacted two-conversation array plus numbered duplicate discovered `3` records, retained `1` duplicate ID finding, and reported unrelated `user.json` as unrecognized rather than treating it as a conversation;
- one three-node conversation derived `3` nodes, `2` deduplicated lineage edges, `2` tool events, and preserved the tool node's opaque raw field;
- mapping source pointers round-tripped through the existing core, and each official record retained a `zip-entry:...` source pointer;
- reconciliation preserved one official-only ID, one account-only ID, one duplicate official ID, and one metadata mismatch; absent account catalog is explicitly `not_comparable`;
- CLI integration preserved the input ZIP bytes exactly at `raw/official-export.zip`; every non-self hash in `integrity/SHA256SUMS.json` was recomputed and matched digest and byte length; manifest ZIP digest also matched;
- CLI source has no `fetch`, `http(s)`, browser API, or remote telemetry path.

Observed defects/fixes:
- first fixture expectation claimed four edges for a three-node parent/child chain; corrected the test to the two explicit deduplicated edges;
- first raw-node fixture placed the opaque field inside `message`; moved it to the node so the test verifies complete node retention;
- help assertion initially expected `input.zip` while the documented CLI uses `export.zip`; corrected the test only;
- no remaining importer test failures.

Blockers/uncertainty:
- no real official export was available or authorized, so actual archive entry variants beyond the supported structural contract remain unverified;
- official OpenAI documentation states that exports include chat history in a ZIP and may use `conversations.json` or numbered conversation JSON files, but the exact future archive layout can drift;
- PROV-0004 controlled account smoke is still intentionally unrun and remains a separate later action.

Acceptance result: **PROV-0005 deterministic importer/reconciliation gate passed; real official-export validation remains intentionally unresolved.**

Next:
- commit this checkpoint, then open PROV-0006 for optional live client-visible event capture; do not import a real private ZIP or start account-wide export without explicit later authorization.

## Handoff

Read `PROJECT.md → checkpoints/CURRENT.md → this task → specs/SDD.md → specs/OFFICIAL_IMPORT_DESIGN.md` before continuing. Do not import a real private ZIP without a later checkpoint authorizing it.
