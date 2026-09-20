# TDD — ChatGPT Provenance Exporter

## Testing objective

Demonstrate source conservation, deterministic derivation, explicit uncertainty, virtualization resistance, and integrity without using an LLM as the pass/fail oracle.

## Level 1 — deterministic unit tests

Cover:
- conversation ID parsing;
- mapping validation;
- node conservation;
- raw-node field retention;
- parent/child edge extraction and dedupe;
- role/content classification;
- tool candidate extraction;
- unknown-type preservation;
- JSONL determinism;
- source-pointer formation/resolution;
- rendered stable-key dedupe/order;
- reconciliation;
- filename/path sanitization;
- manifest/capture-report fields.

## Level 2 — property/randomized tests

Generate graphs with:
- arbitrary mapping key order;
- random parent/child topology;
- duplicated child references;
- missing optional fields;
- unknown metadata;
- user/assistant/system/tool roles;
- repeated identical text;
- random opaque content structures.

Invariants:
- normalized node count equals mapping key count;
- every source mapping key appears exactly once;
- no derived edge is invented;
- every explicit parent relation appears;
- every source pointer resolves;
- unknown raw fields remain present;
- deterministic serialization is stable across repeated runs.

## Metamorphic tests

### M-PROV-001 — Mapping permutation
Permuting mapping object key order does not change canonical normalized semantics.

### M-PROV-002 — JSON formatting
Pretty/minified source formatting may change raw hash but not parsed graph semantics.

### M-PROV-003 — Unknown metadata extension
Adding an unknown field preserves it and leaves unrelated derived records unchanged.

### M-PROV-004 — Traversal duplication
Visiting a source node repeatedly cannot duplicate normalized nodes/edges.

### M-PROV-005 — Lineage permutation
Permuting node storage order does not change edge topology.

### M-PROV-006 — Source-pointer round trip
Every derived node/message/tool source pointer resolves to the intended mapping node.

### M-PROV-007 — Virtualized rendered sweep
Synthetic passes exposing overlapping subsets converge to the union exactly once when the full fixture becomes observable.

### M-PROV-008 — UI noise
Adding copy/edit/button/aria-hidden controls does not change rendered turn content.

### M-PROV-009 — Hash sensitivity
Changing one emitted UTF-8 byte changes SHA-256.

### M-PROV-010 — Unknown-type fallback
Replacing a recognized classification marker with an unseen marker changes classification to `unknown` without losing raw evidence.

## Level 3 — browser fixture integration

A local fixture should emulate:
- short conversation;
- long virtualized conversation;
- incremental older-turn insertion after upward scroll;
- duplicate overlapping render windows;
- UI-only controls;
- missing stable IDs;
- tool-like visible cards.

The extension runner must preserve original scroll and produce a stable rendered set or explicit partial status.

## Level 4 — live pilot

Select one large existing conversation with:
- many turns;
- several tool calls/results;
- research/execution/build activity;
- citations and/or artifacts if available.

Checks:
- capture succeeds;
- raw artifact parses independently;
- derived node count equals source mapping count;
- graph source pointers resolve;
- manual beginning/middle/end rendered samples match;
- several tool event records match their raw source nodes exactly;
- hashes recompute;
- discrepancies are documented.

## Hidden/independent holdout

Select a second real conversation before pilot tuning is complete, but do not inspect it to change parser/classifier rules during PROV-0001.

Evaluate it in PROV-0002 using the frozen implementation.

Suggested holdout diversity:
- different model/mode;
- different tool family;
- files/artifacts;
- citations/research;
- unusually long transcript;
- unknown content/metadata variants.

## Holdout metrics

Structural:
- node recall: 100%;
- explicit parent-edge recall: 100%;
- source-pointer validity: 100%;
- raw-node retention: 100%;
- duplicate normalized node rate: 0%;
- deterministic rerun equality: 100%.

Classification:
- report known-class precision/recall separately;
- unknown is acceptable and preferred to false certainty;
- classification defects must not affect source conservation.

## CUA / Luna role

A browser-using local agent may:
- load unpacked extension;
- operate the live ChatGPT UI;
- observe popup/progress/download behavior;
- identify DOM/API drift;
- inspect representative bundle records.

It must not be the sole correctness oracle. Node/edge/hash/source-pointer assertions are deterministic.

## Exit gate for bulk export

Do not implement account-wide bulk export until:
- deterministic/metamorphic suite passes;
- live pilot passes;
- independent holdout passes or produces understood, documented gaps;
- capture schema is versioned and raw-source conservation is established.
