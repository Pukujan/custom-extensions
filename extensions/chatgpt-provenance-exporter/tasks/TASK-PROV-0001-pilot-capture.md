# TASK-PROV-0001 — Single-Conversation Provenance Pilot

- Status: active
- Owner: ChatGPT/Sol + local Luna/browser agent for live validation
- Priority: P0
- Depends on: none
- Branch: `feature/chatgpt-provenance-exporter`\n- GitHub issue: #6\n- Draft PR: #7

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

### 2026-09-20 — ChatGPT/Sol — deterministic validation checkpoint

Completed:
- resumed from the extension-local handoff and followed its repository read order;
- verified Issue #6 / draft PR #7 / branch `feature/chatgpt-provenance-exporter` and tested PR head `9e77b13f65596b9abe5b1df9722ec0251966e067`;
- attempted direct Git access, then reconstructed the provenance-exporter test inputs from GitHub blobs because the shell environment could not resolve `github.com`;
- verified reconstructed provenance-exporter files against their Git blob SHAs before execution;
- ran the extension-local deterministic/property suite successfully.

Environment:
- OS: Linux `6.18.44`, x86_64;
- Node: `v22.16.0`;
- Brave/Chromium: not available in this session, so no live browser version or smoke evidence is claimed.

Commands/results:
- `git ls-remote https://github.com/Pukujan/custom-extensions.git refs/heads/feature/chatgpt-provenance-exporter` → exit 128, `Could not resolve host: github.com`;
- `node tests/test.js` from the exact reconstructed `extensions/chatgpt-provenance-exporter/` inputs → exit 0, **23 tests passed**;
- `node scripts/test-all.mjs` was invoked from a temporary partial reconstruction → provenance exporter passed 23/23, but the command exited 1 because the three unchanged legacy extension directories were not materialized in that temporary tree. This is an environment/reconstruction limitation and is **not** recorded as a repository-wide test failure or pass.

Blob evidence for the extension-local passing run:
- `core.js` → `b443cd66340b6a36baba1da169e9fcd391f07607`;
- `content.js` → `0576ea720c8941e6d981a80a477660bd64a4e4af`;
- `background.js` → `b2412e459d835a8d67d01348b258ce175094b5c3`;
- `popup.js` → `0606c77074c0228e64d7d74c1639bec252b77b2f`;
- `manifest.json` → `1b0f7d869996b01f20f842c13abf5f90733eb68d`;
- `tests/test.js` → `c43b348033fe703f47a1f491adcfcf1f963779af`.

Evidence/decisions:
- no deterministic implementation defect was exposed by the extension-local suite;
- no parser/classifier rule was changed;
- the repository-wide gate remains unverified in this session because a complete checkout could not be obtained;
- live acquisition, rendered reconciliation, hash recomputation on a real bundle, representative tool-node checks, and scroll restoration remain unverified;
- no bulk-export work was started.

Blockers/uncertainty:
- shell DNS cannot resolve `github.com`, preventing a normal branch checkout and qualifying repository-wide rerun;
- this session has no local Brave/Chromium control, so the PROV-0001 live pilot cannot be executed here.

Next atomic action:
- on a complete local checkout of this branch, run `node scripts/test-all.mjs` and require a clean exit; then load the extension unpacked in Brave/Chromium, capture one deliberately large tool-heavy pilot conversation, perform the structural/hash/rendered/tool-event/scroll-restoration checks in `docs/LOCAL_VALIDATION_LUNA.md`, and append the exact observed results here. Do not start PROV-0002 or bulk export before the pilot checkpoint is complete.

### 2026-09-20 — Codex — repository-wide gate and live-pilot checkpoint

Completed:
- cloned the authoritative `Pukujan/custom-extensions` remote into a local checkout because the supplied project directory contained only project outputs/work folders;
- checked out `feature/chatgpt-provenance-exporter` at `b0513e8a56a4bbde597bfd07e25e5e24d1cda21a`;
- ran the exact repository-wide command below; it passed cleanly;
- no implementation defect was evidenced, so no parser/classifier or extension code was changed;
- no private transcript content was copied into this checkpoint.

Environment:
- OS: Microsoft Windows 11 Home, version `10.0.26200`, build `26200`, 64-bit;
- Brave executable: `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`;
- installed Brave version: `153.1.95.102`;
- Node: `v24.14.1`.

Commands/results:
- `git switch feature/chatgpt-provenance-exporter` → already on the requested branch; initial checkout HEAD `b0513e8a56a4bbde597bfd07e25e5e24d1cda21a`;
- `node scripts/test-all.mjs` from repository root → exit `0`;
- exact suite result: `chatgpt-10-day-cleaner` — `12 invariant/property tests passed`; `linkedin-connection-exporter` — `16 tests passed`; `chatgpt-transcript-exporter` — `18 tests passed`; `chatgpt-provenance-exporter` — `23 tests passed`; final output: `All registered extension test suites passed.`
- the already checkpointed extension-local `node tests/test.js` evidence was not rerun or overwritten; the repository-wide run independently reported the provenance suite at `23 tests passed`.

Live pilot status:
- capture counts: not applicable; no pilot bundle was produced;
- raw response preservation: not performed;
- mapping/node conservation: not performed;
- source-pointer resolution: not performed;
- parent/edge reconciliation: not performed;
- representative tool-call/tool-result checks against raw source: not performed;
- SHA-256 recomputation: not performed;
- rendered first/middle/final/tool-heavy spot checks: not performed;
- rendered reconciliation/discrepancy result: not available;
- lazy-load/stability sweep: not performed;
- scroll-position restoration: not observed.

Observed blocker:
- the in-app Chromium surface rejected `chrome://extensions` under its browser URL policy;
- the sanctioned desktop computer-use surface did find Brave, but stopped before interaction with: `Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy. Stop your work and send a final message noting why Computer Use ended.`
- therefore the extension was not loaded unpacked, no ChatGPT conversation was opened or captured, and no browser result is claimed. The browser safety guard was not bypassed.

Observed defects/fixes:
- none evidenced by `node scripts/test-all.mjs`;
- no code fix was made;
- no bulk export and no PROV-0002 work was started.

Next atomic action:
- in a supervised Brave/Chromium session whose browser-control surface can safely verify the current URL, load `extensions/chatgpt-provenance-exporter/` unpacked, capture one deliberately large tool-heavy conversation, run every structural/hash/rendered/tool-event/lazy-load/scroll check in `docs/LOCAL_VALIDATION_LUNA.md`, append the exact aggregate evidence here, and commit that pilot checkpoint with a `PROV-0001` message. Do not start PROV-0002 or bulk export until the pilot is fully checkpointed.

## Handoff

Receiving agent: read PROJECT → CURRENT → this task → PDD/SDD/TDD. Do not expand to bulk export. Preserve unexpected source structures and record them rather than tuning them away.
