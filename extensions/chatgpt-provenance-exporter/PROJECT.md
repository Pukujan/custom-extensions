# ChatGPT Provenance Exporter — Project Contract

## Main goal

Preserve the maximum recoverable evidence from existing ChatGPT conversations before interpretation or classification, so later agents and research workflows can reconstruct what ChatGPT persisted, what tools/actions are represented, what the UI rendered, and where evidence is incomplete or contradictory.

## Immediate objective

Validate lossless provenance capture on one deliberately large, tool-heavy ChatGPT conversation, then on a second independent holdout conversation. Do not begin account-wide bulk export until both pilot captures satisfy the acceptance criteria.

## Evidence hierarchy

1. Raw authenticated conversation response bytes are immutable source evidence.
2. Parsed graph/nodes preserve every source field and relationship.
3. Derived JSONL indexes are reproducible views over raw evidence.
4. Rendered DOM capture is an independent verifier, not the source of truth.
5. Classification/ontology labels are versioned interpretations and must never overwrite raw evidence.

## v0.1 scope

- one currently open, authorized ChatGPT conversation;
- raw response preservation before JSON parsing;
- complete node/edge extraction without dropping unknown fields;
- broad conservative event classification;
- rendered long-thread sweep for reconciliation;
- source pointers from every derived record to raw evidence;
- SHA-256 integrity metadata;
- local-only download;
- deterministic/property/metamorphic tests;
- live validation on one large tool-heavy conversation plus one holdout.

## Non-goals for v0.1

- account-wide export;
- live interception of every transient browser/network event;
- desktop/mobile instrumentation;
- claiming access to private server-side execution or hidden reasoning;
- ontology perfection;
- Eval Lab integration;
- automatic semantic grading as a correctness oracle.

## Program phases

1. Single-conversation forensic capture.
2. Two-chat live validation and holdout.
3. Versioned provenance ontology from real captured data.
4. Resumable incremental account-wide export.
5. Official ChatGPT data-export importer and reconciliation.
6. Optional live browser-event capture.
7. Eval Lab native execution-trace compatibility.

## Definition of success for v0.1

Another agent can load the extension, capture a selected large ChatGPT conversation, verify raw hashes, trace every derived record to its raw node, establish graph/node preservation, compare raw vs rendered user/assistant turns, inspect exact candidate tool records, and reproduce the same derived indexes from the preserved raw source without conversation history.
