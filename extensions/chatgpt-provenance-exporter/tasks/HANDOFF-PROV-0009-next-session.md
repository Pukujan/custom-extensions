# New-session handoff — PROV-0009 portable harness behavior program

## Start here

Repository: `Pukujan/custom-extensions`

Local checkout:

`C:\Users\pujan\Documents\Codex\2026-09-20\continue-the-active-chatgpt-provenance-exporter\work\custom-extensions`

Branch: `feature/chatgpt-provenance-exporter`

Remote head and local HEAD: `df51d9452baea4c9c5c2acad4c5c31bc452ab9ff`

PR: `https://github.com/Pukujan/custom-extensions/pull/7`

PR state: open, draft, not merged.

## Required read order

From the repository root, read:

1. `README.md`
2. `AGENTS.md`
3. `HANDOFF.md`
4. `extensions/chatgpt-provenance-exporter/PROJECT.md`
5. `extensions/chatgpt-provenance-exporter/HANDOFF.md`
6. `extensions/chatgpt-provenance-exporter/checkpoints/CURRENT.md`
7. `extensions/chatgpt-provenance-exporter/tasks/TASK-PROV-0001-pilot-capture.md`
8. `extensions/chatgpt-provenance-exporter/tasks/TASK-PROV-0004-incremental-export.md`
9. `extensions/chatgpt-provenance-exporter/tasks/TASK-PROV-0009-portable-harness-behavior-program.md`
10. `extensions/chatgpt-provenance-exporter/docs/LOCAL_VALIDATION_LUNA.md`

Do not reconstruct state from prior chats.

## Current exporter state

- PROV-0001 pilot acceptance: passed.
- PROV-0002 independent holdout: passed.
- PROV-0003 ontology v0.1.0: deterministic gate passed.
- PROV-0004 account exporter: authorized and intentionally paused after six valid per-conversation bundles.
- Controlled output root: `C:\Users\pujan\Downloads\June 2026\chatgpt-provenance-account`.
- Existing partial run evidence: `2,633` nodes, `2,627` edges/messages, `2,105` tools, `2,062` citations, `1` artifact; `6/6` raw responses parsed; `42` per-file hashes matched; zero pointer, edge, count, or raw-tool mismatches.
- Missing only because the run is paused: account-level `manifest.json`, `catalog/conversations.jsonl`, and `integrity/SHA256SUMS.json`.

## Immediate next action

1. Use the existing Brave MV3 exporter instance.
2. Click `Resume export`; do not click `Reset export`.
3. Leave the run open until the account-level manifest, catalog, and SHA-256 index appear.
4. Run aggregate-only validation and append results to `TASK-PROV-0004-incremental-export.md`.
5. Commit the checkpoint with a `PROV-0004` message.

If no Brave MV3 surface is connected, do not claim account completion. Keep the checkpoint unchanged and report the exact browser-surface blocker.

## Deterministic checks

From the repository root:

```powershell
node extensions/chatgpt-provenance-exporter/tests/test.js
node scripts/test-all.mjs
git diff --check
```

The last verified results were `57 tests passed` for the provenance suite and all `103` registered repository tests passed.

## Portable behavior program

After account finalization:

1. Identify the local `harness-on-steroids` repository. It was not present in this checkout during the previous audit.
2. Read its `AGENTS.md`, `PLAN.md`, `HANDOFF.md`, current checkpoint, issue log, and test commands before changing code.
3. Keep the exporter as the evidence plane and build a separate harness process plane.
4. Add a versioned chronological event stream, evidence-linked behavior annotations, claim/source/action links, and dataset metadata.
5. Build the harness state machine:

   `INTAKE -> ORIENT -> DECOMPOSE -> RESEARCH -> PLAN -> EXECUTE -> VERIFY -> SYNTHESIZE -> CHECKPOINT -> DONE`

   Also support `BLOCKED`, `REPLAN`, `PAUSE`, `RESUME`, and `HANDOFF`.
6. Add a persistent task contract, plan graph, planner/worker/critic roles, research gates, verification gates, compaction preservation, and recovery policies.
7. Evaluate Kilo/OpenCode/future adapters on matched Work tasks using outcomes, evidence, verification, recovery, and artifact quality—not identical wording or tool order.

## Candidate harness matrix

The following was checked locally without printing secret values:

- OpenCode: installed, `1.18.31`; supports `opencode run`, `opencode acp`, sessions, agents, and model selection.
- Kilo CLI: not installed. Official CLI package is `@kilocode/cli`; verify with `kilo --version` after installation. Kilo supports headless `kilo run`, ACP, model selection, custom agents, and session export.
- Grok Build: not installed. Official CLI is `grok`; official docs describe headless `grok -p` and streaming JSON output. Audit its data/network behavior and use a sanitized fixture before pointing it at private workspaces.
- Pi: not installed. Official package is `@earendil-works/pi-coding-agent`; its RPC mode (`pi --mode rpc`) is a strong candidate for a harness adapter.
- DeepSeek: treat as a model/provider, not a harness. It can be tested through OpenCode, Pi, direct API, or OpenRouter. Preserve provider/model/version metadata in every evaluation record.
- OpenRouter: an API/model gateway, not a harness. Use it for controlled cross-model evaluation, preferably starting with free models and strict budgets. Pin exact model slugs and capture the provider/model returned; free-model availability and routing can change.

Environment variable names matching available provider credentials were present, including `OPENROUTER_API_KEY`, but values were never printed. Never commit, echo, paste into prompts, or place keys in transcript/checkpoint files.

## Evaluation protocol

For every harness/model run:

- use the same task prompt, repository snapshot, permissions, and tool inventory;
- record harness, adapter, provider, model, model version, temperature/reasoning settings, and start/end times;
- save private run bodies only in a controlled local results directory;
- commit only aggregate metrics, hashes, redacted failure labels, and reproducible fixtures;
- score decomposition, research sufficiency, source quality, evidence links, plan quality, execution, verification, recovery, final artifact, and unsupported claims;
- run mutation, metamorphic, differential, and holdout tests before accepting a behavior change.

## Safety rules

- Do not use private transcript bodies as Git fixtures.
- Do not send private ChatGPT exports to third-party models until the run is explicitly sanitized and the provider/data-retention policy is understood.
- Do not treat ChatGPT wording or tool order as the only correct behavior.
- Do not call a task complete without recorded verification.
- Do not install or run candidate CLIs against the private corpus before a sanitized connectivity/data-flow probe.

## Next checkpoint format

Append exact commands/results, aggregate counts, hashes, defects, blockers, and the next atomic action to the relevant task file. Commit meaningful progress with the task ID in the commit message. Push the branch only after the worktree is clean and no private data is staged.
