# TASK-PROV-0001 — Single-Conversation Provenance Pilot

- Status: active
- Owner: ChatGPT/Sol + local Luna/browser agent for live validation
- Priority: P0
- Depends on: none
- Branch: `feature/chatgpt-provenance-exporter`\n- GitHub issue: #6

## Goal

Implement a provenance capture bundle for one currently open ChatGPT conversation and establish that the capture preserves all source nodes/relationships available in the authenticated conversation representation while independently reconciling the rendered transcript.

## Why

Hundreds of existing conversations may contain valuable tool-heavy research/build evidence. Before scaling capture, prove fidelity on a difficult real conversation and make failure visible.

## Allowed files

- `extensions/chatgpt-provenance-exporter/**`
- `extensions/registry.json` when registering the extension
- root status/handoff docs only when repository-wide state must change

## Acceptance criteria

- [ ] independently loadable MV3 extension;
- [ ] current ChatGPT conversation ID identified safely;
- [ ] authenticated raw conversation response preserved as exact text before parsing;
- [ ] every mapping/graph node represented in derived node index;
- [ ] all exposed parent/child relationships represented;
- [ ] unknown fields/types are preserved;
- [ ] conservative tool/message/event classification retains source pointer + raw node;
- [ ] DOM verifier handles virtualized/lazy-loaded long conversations with repeated sweeps;
- [ ] raw-vs-rendered reconciliation is explicit and never silently fixes disagreement;
- [ ] SHA-256 hashes emitted for evidence/derived artifacts;
- [ ] local-only and read-only behavior;
- [ ] deterministic unit/property/metamorphic tests pass;
- [ ] pilot capture performed on one large tool-heavy real conversation;
- [ ] exact beginning/middle/end rendered turns manually sampled against the bundle;
- [ ] multiple candidate tool calls and results inspected against raw nodes;
- [ ] capture report states limitations and verification status.

## Required metamorphic properties

- object-key/graph iteration order does not change normalized semantics;
- whitespace/JSON formatting changes raw hash but not parsed graph semantics;
- unknown metadata additions survive capture and do not change unrelated classification;
- repeated traversal cannot duplicate nodes/edges;
- graph key permutation preserves topology;
- every derived source pointer resolves;
- simulated DOM virtualization converges to the complete rendered fixture set;
- UI-only controls do not alter rendered conversation content;
- a one-byte raw mutation changes the integrity hash.

## Hidden/independent holdout rule

Do not use the second selected real conversation to tune the parser/classifier during PROV-0001. It becomes PROV-0002 and is evaluated only after the pilot implementation is frozen enough to expose generalization failures.

## Checkpoint log

### 2026-09-20 — ChatGPT/Sol

Completed:
- selected separate-extension architecture;
- chose raw conversation representation as archival source and DOM capture as verifier;
- constrained v0.1 to one current conversation before bulk export;
- added multi-session project/checkpoint/task/handoff architecture based on the established Eval Lab pattern.

Evidence:
- existing `chatgpt-10-day-cleaner` demonstrates authenticated session/conversation API patterns;
- existing `chatgpt-transcript-exporter` demonstrates virtualized DOM sweep behavior.

Decisions:
- preserve before classify;
- derive ontology from real pilot captures;
- deterministic tests are correctness oracle; Luna/CUA is behavioral/live smoke support;
- defer account-wide capture until pilot + independent holdout pass.

Blocked/uncertain:
- current ChatGPT conversation response shape/tool-node variants must be validated live;
- no live browser result has been observed yet.

Next:
- implement v0.1 acquisition, lossless graph normalization, conservative event indexing, DOM verifier, bundle hashing, and tests.

## Handoff

Receiving agent: read PROJECT → CURRENT → this task → PDD/SDD/TDD. Do not expand to bulk export. Preserve unexpected source structures and record them rather than tuning them away.
