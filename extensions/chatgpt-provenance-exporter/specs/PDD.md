# PDD — ChatGPT Provenance Exporter

## Problem

Existing ChatGPT research/build conversations may contain valuable provenance beyond the visible final transcript: graph nodes, tool-related records, citations, metadata, parent/child lineage, and rendered activity. A DOM-only transcript loses some of that evidence, while a raw-only dump is difficult to inspect and validate.

## User outcome

From one currently open, authorized ChatGPT conversation, one capture produces a local provenance bundle containing immutable raw source material plus derived indexes and an independent rendered-transcript verification view.

## Risk class

`read-export`. The extension reads data available to the signed-in ChatGPT browser session and writes local downloads. It must not modify remote account state.

## Properties

### P-PROV-001 — Preserve before parse
The authenticated conversation response is captured as raw response text before JSON parsing or normalization.

### P-PROV-002 — Node conservation
Every mapping/graph node present in the parsed source is represented exactly once in the derived node index.

### P-PROV-003 — Field conservation
Unknown node, message, content, author, and metadata fields are retained through a raw-node field or source pointer; parsers never silently drop source structures.

### P-PROV-004 — Lineage conservation
Every exposed parent/child relationship is represented in the edge index without inventing missing relationships.

### P-PROV-005 — Conservative classification
Derived classes identify broad observable roles only. Unrecognized structures become `unknown`; classification never changes raw evidence.

### P-PROV-006 — Tool evidence retention
Candidate tool-call/tool-result records retain complete source node/message content, exact raw content values available in the conversation source, identifiers, metadata, and source pointer.

### P-PROV-007 — Derived traceability
Every derived node/message/tool/citation/artifact record contains enough information to resolve back to the source mapping key/node.

### P-PROV-008 — Rendered/raw independence
The DOM transcript sweep is an independent verification source. It must not overwrite raw graph evidence.

### P-PROV-009 — Virtualization resistance
Rendered verification repeatedly sweeps the conversation until two consecutive non-empty pass key sets stabilize or a bounded maximum is reached. Failure to stabilize is visible.

### P-PROV-010 — No false completeness
A capture may claim completeness only relative to the acquired source representation and the stated verifier checks. It never claims complete OpenAI-internal execution coverage.

### P-PROV-011 — Disagreement preservation
Raw-vs-rendered count/order/ID discrepancies remain explicit in reconciliation output.

### P-PROV-012 — Integrity
Every emitted evidence/derived text artifact receives SHA-256 metadata computed from the exact emitted UTF-8 content.

### P-PROV-013 — Local-only
Conversation content is sent only to the browser download subsystem. No third-party network endpoint, analytics, telemetry, or remote storage is used.

### P-PROV-014 — Read-only
The extension performs GET/read operations only. It never patches, deletes, edits, shares, or mutates ChatGPT conversations.

### P-PROV-015 — Fail visibly
Missing session/auth, malformed source JSON, absent mapping, zero captured messages, hashing failures, or download failures produce an explicit failed capture rather than a misleading successful bundle.

### P-PROV-016 — User-controlled run state
An active capture can be paused, resumed, or reset. Reset cancels pending reads/sweeps, clears persisted progress, leaves the remote conversation unchanged, and prevents stale work from overwriting the reset state.

## v0.1 non-goals

- bulk account enumeration/export;
- recovery of deleted/temporary chats not available to the session;
- private hidden reasoning or server-side events not returned to the client;
- live interception of every transient network/runtime event;
- desktop/mobile process instrumentation;
- perfect semantic ontology;
- automatic external-artifact verification;
- Eval Lab execution tracing.
- Using the ChatGPT desktop built-in browser as a replacement for the installed-extension popup/service-worker smoke test.

## Acceptance

Deterministic/property/metamorphic tests must pass. Live acceptance additionally requires:
1. one deliberately large, tool-heavy pilot conversation;
2. manual beginning/middle/end rendered comparison;
3. inspection of several candidate tool calls/results against raw source nodes;
4. then a second independent holdout conversation without parser tuning before evaluation.
