# Current Handoff — ChatGPT Provenance Exporter

This project is ready for a fresh session without prior chat history.

## Active work

- Task: `PROV-0001 — Single-Conversation Provenance Pilot`
- GitHub issue: #6
- Draft PR: #7
- Branch: `feature/chatgpt-provenance-exporter`
- Canonical task: `tasks/TASK-PROV-0001-pilot-capture.md`
- Status: `LOCAL_TESTED / LIVE_SMOKE_PASSED / HOLDOUT_PASSED`; built-in full-CDP pilot, required MV3 smoke, and authorized observer smoke accepted; the controlled account run is paused after six valid per-conversation bundles and awaits final account-level manifest/catalog/hash validation

## Read exactly this first

1. `PROJECT.md`
2. `AGENTS.md`
3. `checkpoints/CURRENT.md`
4. `tasks/TASK-PROV-0001-pilot-capture.md`
5. `docs/LOCAL_VALIDATION_LUNA.md`
6. `specs/TDD.md` as needed

Do not reconstruct project state from the chat session that created this branch.

## Exact next action

The accepted v0.1 pilot/holdout baseline is complete. The controlled account run has already produced six internally valid per-conversation bundles and is intentionally paused for inspection. The next atomic action is to use the existing Brave MV3 run's `Resume export` control, allow finalization, and validate the account manifest/catalog/SHA-256 index. Do not press `Reset export` unless intentionally discarding the run. Wait for a user-supplied official export ZIP before testing official import.

## Scope guard

Do not claim account-wide completion until its raw/derived files, manifest, reconciliation, and SHA-256 evidence are written to the controlled account directory. The pilot and independent PROV-0002 holdout are already accepted.

## Authority

`PROJECT + CURRENT + TASK + relevant spec` are canonical. Issue #6 and PR #7 are coordination/review mirrors.
