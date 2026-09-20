# ChatGPT Provenance Exporter — Brave / Chromium

Captures one currently open ChatGPT conversation as a local provenance bundle: the authenticated raw conversation representation, lossless graph indexes, conservative tool-event candidates, a separately harvested rendered transcript, reconciliation, and SHA-256 integrity metadata.

This extension is intentionally separate from `chatgpt-transcript-exporter`. The transcript exporter is optimized for a readable rendered transcript; this extension is optimized for evidence preservation and later re-analysis.

## v0.1 pilot scope

v0.1 captures **one current conversation at a time**. This is deliberate. The first release must be validated on one difficult tool-heavy conversation and a second independent holdout before account-wide export is added.

## Evidence model

- `raw/` — primary captured source representation; preserve unchanged.
- `normalized/` — deterministic derived JSONL views that always retain source pointers/raw nodes.
- `rendered/` — independent DOM/UI verification using repeated virtualized scroll sweeps.
- `validation/` — reconciliation/reporting; mismatches remain visible.
- `integrity/` — SHA-256 hashes over emitted text artifacts.

A successful capture means complete relative to the acquired source representation and stated verifier checks. It does **not** claim access to hidden reasoning, unexposed server-side execution, or transient events ChatGPT never persisted/exposed.

## Long/lazy-loaded conversations

The authenticated conversation representation is the archival source, so DOM lazy loading is not relied on for graph completeness.

The rendered verifier independently:
1. repeatedly scrolls to the top to trigger older-turn loading;
2. sweeps downward in overlapping viewport steps;
3. harvests user/assistant turns;
4. repeats bounded full passes;
5. declares rendered stability only after two consecutive pass key sets match;
6. restores the original scroll position.

If stability is not established, the bundle is still preserved but the rendered verifier is explicitly marked partial/not established.

## Install from the feature branch

Load `extensions/chatgpt-provenance-exporter/` as an unpacked Brave/Chromium extension.

## Pilot use

1. Open a specific `https://chatgpt.com/c/<id>` conversation.
2. Wait for active generation to finish.
3. Open the extension.
4. Click **Capture current conversation**.
5. Leave the ChatGPT tab open while the rendered verifier scrolls it.
6. Inspect the downloaded `chatgpt-provenance/.../` folder.

## Current usable capability

- one current conversation;
- raw conversation response preservation before parsing;
- full mapping node/edge index;
- message and broad tool-event indexes;
- citations/artifact candidates where exposed;
- independent rendered user/assistant transcript;
- lazy-load/virtualization sweep;
- reconciliation report;
- SHA-256 integrity metadata;
- project/task/checkpoint/handoff protocol for multi-session continuation.

## Deferred deliberately

- bulk account export;
- incremental/resumable account snapshots;
- official ChatGPT data-export ZIP importer;
- live network/runtime event capture;
- desktop/mobile-specific instrumentation;
- mature/versioned semantic ontology built from real pilot data;
- Eval Lab native trace integration.

## Tests

```bash
node tests/test.js
```

Deterministic/property/metamorphic tests are the structural correctness oracle. A local Luna/CUA/browser agent is useful for live UI smoke testing but cannot replace node/edge/hash/source-pointer assertions.

## Multi-session continuation

Read, in order:

1. `PROJECT.md`
2. `checkpoints/CURRENT.md`
3. current `tasks/TASK-*.md`
4. the minimum relevant spec.

Important state must be committed/checkpointed in the repository, not left only in a chat transcript.
