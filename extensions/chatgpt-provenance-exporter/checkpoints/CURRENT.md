# Current Checkpoint — ChatGPT Provenance Exporter

## Program state

Phase: 1 — single-conversation forensic capture.

Current P0 task: `TASK-PROV-0001-pilot-capture.md`.

## Main objective

Build and validate a read-only provenance bundle for one currently open, large, tool-heavy ChatGPT conversation before attempting bulk account export.

## Decisions already made

- this is a separate extension from `chatgpt-transcript-exporter`;
- raw authenticated conversation data is primary archival evidence;
- DOM scrolling is an independent rendered verifier;
- unknown node/content types must be preserved rather than dropped;
- classification is versioned interpretation over immutable raw evidence;
- v0.1 does not claim complete knowledge of OpenAI-internal execution;
- bulk account export is explicitly deferred until two-chat validation passes.

## Active

- extension skeleton/specification/implementation;
- deterministic and metamorphic capture tests;
- pilot live-capture procedure.

## Queued

1. PROV-0002 — second-chat hidden/independent holdout validation.
2. PROV-0003 — ontology v0.1 from real captured tool-heavy data.
3. PROV-0004 — resumable incremental account-wide exporter.
4. PROV-0005 — official ChatGPT export importer/reconciliation.
5. PROV-0006 — optional live client-visible event capture.
6. PROV-0007 — Eval Lab trace compatibility.

## Current verification state

Not yet live validated.

## Next atomic action

Complete TASK-PROV-0001 implementation and deterministic/metamorphic tests, then capture one selected large tool-heavy ChatGPT conversation and record exact reconciliation evidence.
