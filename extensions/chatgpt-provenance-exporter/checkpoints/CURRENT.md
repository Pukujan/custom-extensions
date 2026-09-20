# Current Checkpoint — ChatGPT Provenance Exporter

## Program state

Phase: 2 — two-chat live validation and holdout.

Current P0 task: `TASK-PROV-0002-holdout.md`.

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
- independent PROV-0002 holdout validation.

## Queued

1. PROV-0003 — ontology v0.1 from real captured tool-heavy data.
2. PROV-0004 — resumable incremental account-wide exporter.
3. PROV-0005 — official ChatGPT export importer/reconciliation.
4. PROV-0006 — optional live client-visible event capture.
5. PROV-0007 — Eval Lab trace compatibility.

## Current verification state

The PROV-0001 pilot is accepted and frozen at `b9e996263090f5d8d3dca55dd4b2210fe0cdc580`: its Brave bundle preserved raw source, conserved `465` nodes, retained `363` tool events and `328` citations, passed hashes/reconciliation/stability/scroll checks, and verified pause/resume/reset. PROV-0002 is now active on `task/PROV-0002-holdout`; no independent holdout conversation has been captured yet. Bulk export remains prohibited. The built-in in-app browser remains read-only and is not treated as the live acceptance surface.

## Next atomic action

In a fresh supervised Brave session, select one independent tool-heavy conversation (not the pilot), run the frozen extension and all holdout checks in `TASK-PROV-0002-holdout.md`, and append aggregate-only evidence. Do not start bulk export or tune the classifier before holdout evidence is recorded.
