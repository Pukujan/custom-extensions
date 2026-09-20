# Current Handoff — ChatGPT Provenance Exporter

This project is ready for a fresh session without prior chat history.

## Active work

- Task: `PROV-0001 — Single-Conversation Provenance Pilot`
- GitHub issue: #6
- Draft PR: #7
- Branch: `feature/chatgpt-provenance-exporter`
- Canonical task: `tasks/TASK-PROV-0001-pilot-capture.md`
- Status: `LOCAL_TESTED / LIVE_SMOKE_PASSED / HOLDOUT_PASSED`; built-in full-CDP pilot accepted; final unpacked-MV3 UI smoke remains

## Read exactly this first

1. `PROJECT.md`
2. `AGENTS.md`
3. `checkpoints/CURRENT.md`
4. `tasks/TASK-PROV-0001-pilot-capture.md`
5. `docs/LOCAL_VALIDATION_LUNA.md`
6. `specs/TDD.md` as needed

Do not reconstruct project state from the chat session that created this branch.

## Exact next action

On a local machine/browser-capable session, perform the remaining narrow unpacked-MV3 smoke against the current build: verify popup capture/pause/resume/reset, service-worker messaging, controlled `chrome.downloads` paths, and completed-state discoverability for `raw/conversation.response.json`, `normalized/tool-events.jsonl`, `normalized/citations.jsonl`, and `validation/reconciliation.json`. The built-in full-CDP pilot already recorded aggregate source/node/edge/tool/citation/hash/rendered/scroll evidence in the canonical task checkpoint.

## Scope guard

Do not implement account-wide bulk export yet. After the pilot, run the independent PROV-0002 holdout before scaling or tuning an ontology.

## Authority

`PROJECT + CURRENT + TASK + relevant spec` are canonical. Issue #6 and PR #7 are coordination/review mirrors.
