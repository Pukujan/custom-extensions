# Current Checkpoint — ChatGPT Provenance Exporter

## Program state

Phase: 8 — Controlled live-validation backlog.

Current P0 task: `TASK-PROV-0008-controlled-validation.md` (built-in full-CDP pilot accepted; unpacked-MV3 smoke remains).

## Main objective

Build and validate a read-only provenance bundle for one currently open, large, tool-heavy ChatGPT conversation before attempting bulk account export.

## Decisions already made

- this is a separate extension from `chatgpt-transcript-exporter`;
- raw authenticated conversation data is primary archival evidence;
- DOM scrolling is an independent rendered verifier;
- unknown node/content types must be preserved rather than dropped;
- classification is versioned interpretation over immutable raw evidence;
- v0.1 does not claim complete knowledge of OpenAI-internal execution;
- pilot live validation may use ChatGPT desktop's built-in browser only when the approved development-only full-CDP/evaluate surface is enabled; installed-extension controls still require one unpacked MV3 smoke check;
- active captures expose pause/resume/reset controls and reset is cancellation-safe;
- bulk account export is explicitly deferred until two-chat validation passes.

## Active

- PROV-0008 controlled live-validation backlog and evidence checkpoint (built-in full-CDP pilot accepted; unpacked-MV3 smoke remains).
- Deterministic implementation maintenance only; no bulk account export.

## Queued

1. Native external Eval Lab compatibility, only after a pinned target schema and validator are supplied.

## Current verification state

The PROV-0001 pilot and PROV-0002 independent holdout are both accepted and frozen. The pilot preserved `465` nodes, `363` tool events, and `328` citations; the holdout preserved `984` nodes, `862` tools, and `740` citations. Both passed source conservation, lineage, pointer, raw-backed tool, hash, rendered-stability, pause/resume/reset, and scroll-restoration checks with raw/rendered discrepancies preserved. The built-in ChatGPT full-CDP pilot was subsequently executed against the same selected pilot and independently passed with `465` nodes, `363` tools, `328` citations, `0` pointer failures, `0` edge mismatches, `0` tool-raw mismatches, `0` hash failures, stable rendered sweeps, and exact scroll restoration. The popup names the raw, tool-event, citation, and reconciliation files after completion so separate evidence indexes are discoverable. PROV-0003 ontology v0.1.0 is implemented and its deterministic/full-suite gates are green. PROV-0004's design and deterministic implementation gate is green, but its controlled live account smoke remains unrun by design; no live account-wide export has started. PROV-0005's deterministic official-export importer/reconciliation gate is green, but no real private ZIP has been imported. PROV-0006's deterministic client-event observer gate is green and its live observer smoke remains separately unauthorized/unrun. PROV-0007's deterministic portable trace-adapter gate is green; no native external Eval Lab schema is claimed. The earlier CDP block is resolved; the built-in in-app browser now exposes the approved `cdp` capability for the pilot, while the final unpacked-MV3 popup/service-worker/download smoke remains outstanding.

The latest repository-wide verification is green: `node tests/test.js` returned exit `0` with `56 tests passed`; `node scripts/test-all.mjs` returned exit `0` with `All registered extension test suites passed.`; `node tools/validate-capture-bundle.mjs --help` returned exit `0`; `git diff --check` returned exit `0` with only normal LF/CRLF conversion warnings. No private transcript contents, live event bodies, bundles, or raw IDs are in Git.

The committed aggregate validator also passed against both controlled real bundles: pilot `465` nodes / `363` tools / `328` citations / `0` pointer failures / `0` tool-raw mismatches / `0` hash failures; holdout `984` nodes / `862` tools / `740` citations / `0` pointer failures / `0` tool-raw mismatches / `0` hash failures. Both rendered reconciliations remain explicitly `differences_observed` rather than being hidden.

## Next atomic action

Run the one unpacked MV3 popup/service-worker/download smoke against the current extension build and append aggregate-only evidence. Keep the optional PROV-0006 live observer unrun until its task explicitly authorizes it. If official-import validation is desired, obtain a user-supplied official export ZIP separately. Do not start account-wide export automatically.
