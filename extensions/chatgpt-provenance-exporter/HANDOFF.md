# Current Handoff — ChatGPT Provenance Exporter

This project is ready for a fresh session without prior chat history.

## Active work

- Task: `PROV-0001 — Single-Conversation Provenance Pilot`
- GitHub issue: #6
- Draft PR: #7
- Branch: `feature/chatgpt-provenance-exporter`
- Canonical task: `tasks/TASK-PROV-0001-pilot-capture.md`
- Status: `LOCAL_TESTED / LIVE_SMOKE_PASSED / HOLDOUT_PASSED`; built-in full-CDP pilot, required MV3 smoke, and authorized observer smoke accepted; account-wide export is explicitly authorized but not executable in the current in-app-browser surface

## Read exactly this first

1. `PROJECT.md`
2. `AGENTS.md`
3. `checkpoints/CURRENT.md`
4. `tasks/TASK-PROV-0001-pilot-capture.md`
5. `docs/LOCAL_VALIDATION_LUNA.md`
6. `specs/TDD.md` as needed

Do not reconstruct project state from the chat session that created this branch.

## Exact next action

The accepted v0.1 pilot/holdout baseline is complete. The latest checkpoint added visible account-wide start/pause/resume/reset controls and recorded standing authorization for the live account export, but the current Codex in-app browser has no installed MV3 extension context or usable controlled download sink. The next atomic action is to run PROV-0004 in a connected Chromium/Brave MV3 surface; no further authorization prompt is required. Wait for a user-supplied official export ZIP before testing official import.

## Scope guard

Do not claim account-wide completion until its raw/derived files, manifest, reconciliation, and SHA-256 evidence are written to the controlled account directory. The pilot and independent PROV-0002 holdout are already accepted.

## Authority

`PROJECT + CURRENT + TASK + relevant spec` are canonical. Issue #6 and PR #7 are coordination/review mirrors.
