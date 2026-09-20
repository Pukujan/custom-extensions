# TASK-PROV-0003 — Provenance Ontology v0.1

- Status: complete
- Owner: ChatGPT/Sol + local repository agent
- Priority: P1
- Depends on: `PROV-0001` and `PROV-0002` live acceptance
- Branch: `task/PROV-0003-ontology-v01`

## Goal

Define the first versioned, source-preserving ontology from the two accepted real captures without changing the raw evidence, the v0.1 classifier, or the capture schema.

## Why

The pilot and independent holdout expose real tool/content variants. The ontology should describe what the exporter observed, distinguish deterministic classes from interpretation, and remain independently versioned so future reclassification never rewrites archived evidence.

## Rules

- raw source remains authoritative;
- ontology labels are interpretations and must carry an ontology version;
- unknown content/types remain valid and preferred to false certainty;
- classes must distinguish source-backed tool calls/results, user/assistant messages, citations, artifacts/attachments, browser/activity, execution/status, and unknown structures;
- examples in the repository must be redacted/structural and must not contain private transcript text or raw conversation identifiers;
- no account-wide export begins in this task.

## Allowed files

- `extensions/chatgpt-provenance-exporter/ontology/**`;
- `extensions/chatgpt-provenance-exporter/tests/**` when adding ontology validation;
- this task and `checkpoints/CURRENT.md`;
- no raw downloaded bundles are copied into the repository.

## Acceptance criteria

- [ ] ontology is versioned at `v0.1.0`;
- [ ] classes, rules, schema, and structural examples are present;
- [ ] observed classes/content types from both accepted captures are represented without transcript content;
- [ ] each class states whether it is evidence-preserving, interpretive, or fallback/unknown;
- [ ] tool.call and tool.result rules preserve source pointers and raw-node retention requirements;
- [ ] unknown/future structures have an explicit fallback rule;
- [ ] deterministic tests validate ontology file shape and version consistency;
- [ ] full repository test suite passes;
- [ ] checkpoint records distributions, decisions, commands, blockers, and one next atomic action.

## Observed input summary

The two accepted captures reported these aggregate class/content families:

- source classes: `tool.call`, `tool.result`, `message.assistant`, `message.user`, `citation`, and `unknown`;
- source content types: `code`, `execution_output`, `multimodal_text`, `text`, `thoughts`, `reasoning_recap`, and missing/null content type;
- tool classes were source-backed and retained complete raw nodes in both captures;
- both captures exposed raw/rendered role-count discrepancies, so reconciliation remains a report rather than an ontology correction.

## Planned commands

```text
node tests/test.js
node scripts/test-all.mjs
git diff --check
```

## Checkpoint log

### 2026-09-20 — Codex — ontology task opened

Completed:
- created the ontology task from the accepted two-chat baseline;
- created branch `task/PROV-0003-ontology-v01` from the PROV-0002 acceptance checkpoint;
- inspected aggregate class/content distributions from both downloaded bundles without copying private transcript data.

Decisions:
- ontology v0.1 will document and validate the current conservative classifier vocabulary;
- the ontology will be independently versioned and will not be used to relabel the pilot/holdout archives in place;
- unknown remains a first-class fallback.

Blocked/uncertain:
- none at task start; ontology artifacts and deterministic validation remain to be implemented.

Next:
- add `ontology/v0.1.0/{classes,rules,schema,examples}.json*`, validate their cross-file invariants, and run the full test suite.

### 2026-09-20 20:45:28 UTC — Codex — ontology v0.1.0 checkpoint

Completed:
- added `ontology/README.md` and versioned `ontology/v0.1.0/classes.json`, `rules.json`, `schema.json`, and redacted `examples.jsonl`;
- added a deterministic ontology shape/version/source-preservation test to `tests/test.js`;
- aligned the ontology vocabulary with the frozen classifier and the two accepted live distributions without changing capture behavior;
- preserved `unknown` as an explicit fallback and required source pointers/raw-node retention in annotation examples.

Evidence from accepted captures (aggregate-only):
- pilot classes: `tool.call=127`, `tool.result=236`, `message.assistant=40`, `message.user=13`, `citation=48`, `unknown=1`;
- holdout classes: `tool.call=351`, `tool.result=511`, `message.assistant=90`, `message.user=6`, `citation=25`, `unknown=1`;
- observed content families across the two captures: `code`, `execution_output`, `multimodal_text`, `text`, `thoughts`, `reasoning_recap`, and missing/null content type;
- raw/rendered discrepancies remain reconciliation outputs and are not reclassified away.

Exact commands/results:
- `node tests/test.js` from `extensions/chatgpt-provenance-exporter/` → exit `0`; `25 tests passed`;
- `node scripts/test-all.mjs` from repository root → exit `0`; all registered suites passed, including provenance `25 tests passed`; final output: `All registered extension test suites passed.`;
- `git diff --check` → exit `0`; only normal LF/CRLF conversion warnings were reported.

Changed:
- `extensions/chatgpt-provenance-exporter/ontology/README.md`;
- `extensions/chatgpt-provenance-exporter/ontology/v0.1.0/classes.json`;
- `extensions/chatgpt-provenance-exporter/ontology/v0.1.0/rules.json`;
- `extensions/chatgpt-provenance-exporter/ontology/v0.1.0/schema.json`;
- `extensions/chatgpt-provenance-exporter/ontology/v0.1.0/examples.jsonl`;
- `extensions/chatgpt-provenance-exporter/tests/test.js`;
- this task checkpoint.

Blockers:
- none for PROV-0003 ontology acceptance;
- no bulk export has started.

Acceptance result: **PROV-0003 ontology v0.1.0 passed**.

Next:
- freeze the ontology checkpoint and open PROV-0004 for resumable incremental account-wide export design; retain the two live bundles as external local evidence and do not include them in Git.

## Handoff

Read `PROJECT.md → checkpoints/CURRENT.md → TASK-PROV-0003-ontology-v01.md → specs/TDD.md` before continuing. Do not begin bulk export.
