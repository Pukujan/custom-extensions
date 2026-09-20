# Current Checkpoint — ChatGPT Provenance Exporter

## Program state

Phase: 7 — Eval Lab trace compatibility adapter.

Current P0 task: `TASK-PROV-0007-eval-trace.md` (review checkpoint).

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
- independent PROV-0002 holdout validation;
- versioned PROV-0003 ontology v0.1.0.
- PROV-0004 account-wide exporter design and deterministic implementation.
- PROV-0005 official export importer/reconciliation implementation.
- PROV-0006 optional client-visible event capture implementation.
- PROV-0007 Eval Lab trace compatibility adapter.

## Queued

1. PROV-0004 — resumable incremental account-wide exporter.
2. PROV-0005 — official ChatGPT export importer/reconciliation.
3. PROV-0006 — optional live client-visible event capture.
4. PROV-0007 — Eval Lab trace compatibility.

## Current verification state

The PROV-0001 pilot and PROV-0002 independent holdout are both accepted and frozen. The pilot preserved `465` nodes, `363` tool events, and `328` citations; the holdout preserved `984` nodes, `862` tool events, and `740` citations. Both passed source conservation, lineage, pointer, raw-backed tool, hash, rendered-stability, pause/resume/reset, and scroll-restoration checks with raw/rendered discrepancies preserved. PROV-0003 ontology v0.1.0 is implemented and its deterministic/full-suite gates are green. PROV-0004's design and deterministic implementation gate is green, but its controlled live account smoke remains unrun by design; no live account-wide export has started. PROV-0005's deterministic official-export importer/reconciliation gate is green, but no real private ZIP has been imported. PROV-0006's deterministic client-event observer gate is green, but its built-in-browser smoke remains unrun by design. PROV-0007's deterministic portable trace-adapter gate is green; no native external Eval Lab schema is claimed. The built-in in-app browser remains read-only and is not treated as the live acceptance surface.

## Next atomic action

Commit the PROV-0007 review checkpoint. The implementation phases are complete; next work is controlled live validation of PROV-0004/0005/0006 only with explicit real-source authorization. Do not start account-wide export automatically.
