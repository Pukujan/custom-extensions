# Local Luna / Browser Validation — PROV-0001

## Purpose

Use a fresh local shell/browser-capable session to validate the implementation without relying on prior chat context.

## Read order

1. `PROJECT.md`
2. `AGENTS.md`
3. `checkpoints/CURRENT.md`
4. `tasks/TASK-PROV-0001-pilot-capture.md`
5. `specs/TDD.md`
6. this file

## Repository setup

Use branch:

```text
feature/chatgpt-provenance-exporter
```

A dedicated worktree is preferred if other work is active.

## Deterministic checks first

From `extensions/chatgpt-provenance-exporter/` run:

```bash
node tests/test.js
```

Then from repository root run:

```bash
node scripts/test-all.mjs
```

Do not begin changing parser/classifier rules merely because a live ChatGPT structure is unfamiliar. First record the raw failing structure and determine whether source-conservation properties actually fail.

## Load-unpacked browser smoke

1. Open Brave/Chromium extensions page.
2. Enable Developer mode.
3. Load `extensions/chatgpt-provenance-exporter/` unpacked.
4. Sign into `chatgpt.com` normally.
5. Open the selected pilot conversation at `/c/<conversation-id>`.
6. Ensure ChatGPT is not actively streaming.
7. Click **Capture current conversation**.
8. Leave the tab open while the verifier scrolls.
9. Confirm the page scroll position is restored.
10. Inspect the downloaded `chatgpt-provenance/.../` folder.

## ChatGPT built-in browser development route

When a ChatGPT desktop session has **Settings → Browser → Developer mode → Enable full CDP access** enabled, the same pilot can be run in the built-in browser using `docs/BUILTIN_BROWSER_VALIDATION.md`. This route is preferred for validating same-origin acquisition, raw preservation, the real rendered DOM, tool/source derivation, hashes, reconciliation, and pause/resume/reset without relying on Brave. It does not replace the final unpacked-extension check for popup, service-worker, storage, or download behavior.

## Pilot conversation selection

Choose a conversation that is deliberately difficult:
- long enough to exhibit lazy loading/virtualization;
- several tool calls and tool results;
- research/build/execution work;
- citations and/or files/artifacts if possible.

Do not use the second planned holdout conversation to tune v0.1.

## Structural validation

Using the downloaded files, verify deterministically:

1. `raw/conversation.response.json` parses.
2. Source mapping key count equals line count in `normalized/nodes.jsonl`.
3. Every node JSONL record has a unique `node_id`.
4. Every `source_pointer` resolves to the corresponding raw mapping key.
5. Every explicit source parent relationship exists in `edges.jsonl`.
6. Several `tool-events.jsonl` records match their `raw_node` in the raw source exactly.
7. SHA-256 values recompute for every file listed in `integrity/SHA256SUMS.json`.
8. `validation/reconciliation.json` reports rendered stability or an explicit discrepancy; do not manually "fix" mismatches.

## Rendered spot check

Manually compare:
- first visible user/assistant exchange;
- at least one exchange near the middle;
- final exchange;
- several known tool-heavy regions.

Record whether the rendered verifier found the same visible content/order.

## CUA role

A local Luna/computer-using agent is appropriate for:
- loading the unpacked extension;
- driving Brave/ChatGPT;
- observing scroll restoration and popup state;
- finding current DOM/API drift;
- inspecting representative files.

CUA is not the structural oracle. Node/edge/source-pointer/hash checks must be performed by deterministic code or direct file inspection.

## Stop rule

Before ending the local session, append to `tasks/TASK-PROV-0001-pilot-capture.md`:

- exact OS/Brave/Node versions;
- commands;
- test results;
- selected pilot characteristics (do not commit private transcript contents);
- counts from capture report;
- rendered reconciliation status;
- sampled tool-event validation result;
- bugs/fixes;
- blockers;
- exact next atomic action.

Commit meaningful progress with a PROV-0001 checkpoint message.

If pilot acceptance passes, do **not** start bulk export. Move next to PROV-0002 independent holdout.
