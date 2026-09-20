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
- pilot live validation may use ChatGPT desktop's built-in browser with full CDP through the development-only standalone runner; installed-extension controls still require one unpacked MV3 smoke check;
- active captures expose pause/resume/reset controls and reset is cancellation-safe;
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

The exact pilot URL has now produced one real Brave bundle with preserved raw response, conserved mapping/nodes, resolved source pointers, reconciled parent/edge evidence, `363` tool events, `328` citations, stable rendered sweeps, discrepancy-preserving reconciliation, and verified SHA-256 hashes. Deterministic validation remains green. PROV-0001 is still pending the refreshed unpacked-instance pause/resume smoke test and an isolated scroll-anchor restoration proof. The built-in in-app browser remains read-only and is not being treated as the live acceptance surface.

## Next atomic action

In a fresh supervised Brave session, reload the unpacked extension and the exact pilot page, retest pause/resume/reset with persisted progress checks, then perform the isolated scroll-anchor restoration check and append aggregate evidence. Do not start PROV-0002 or bulk export before the pilot checkpoint is complete.
