# Provenance Ontology

This directory versions interpretation separately from captured evidence. Raw conversation responses and derived indexes remain authoritative; ontology labels are reproducible annotations that may evolve without rewriting an archive.

## v0.1.0 basis

The first version was derived after two accepted live captures:

- pilot source nodes: `465`; holdout source nodes: `984`;
- observed classes: `tool.call`, `tool.result`, `message.assistant`, `message.user`, `citation`, and `unknown`;
- observed content types: `code`, `execution_output`, `multimodal_text`, `text`, `thoughts`, `reasoning_recap`, and missing/null content type;
- tool records remained source-backed in both captures, and raw/rendered role-count differences remained explicit in reconciliation.

No transcript text, raw conversation identifier, or downloaded bundle is stored here.

## Files

- `v0.1.0/classes.json` — stable class vocabulary and evidence/interpretation posture;
- `v0.1.0/rules.json` — ordered deterministic rules and fallback behavior;
- `v0.1.0/schema.json` — shape of an ontology annotation;
- `v0.1.0/examples.jsonl` — redacted structural examples only.

## Compatibility promise

An annotation must retain `source_pointer`, `raw_node_retained`, `classifier_version`, and `ontology_version`. An unknown or future structure is valid when preserved with class `unknown`; it is never silently dropped or coerced into a known class.
