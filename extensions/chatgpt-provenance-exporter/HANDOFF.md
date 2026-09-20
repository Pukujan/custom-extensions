# Current Handoff — ChatGPT Provenance Exporter

This project is ready for a fresh session without prior chat history.

## Active work

- Task: `PROV-0001 — Single-Conversation Provenance Pilot`
- GitHub issue: #6
- Draft PR: #7
- Branch: `feature/chatgpt-provenance-exporter`
- Canonical task: `tasks/TASK-PROV-0001-pilot-capture.md`
- Status: `LOCAL_TESTED / LIVE_SMOKE_PASSED / HOLDOUT_PASSED`; built-in full-CDP pilot and required unpacked-MV3 smoke accepted; optional gates remain separately authorized

## Read exactly this first

1. `PROJECT.md`
2. `AGENTS.md`
3. `checkpoints/CURRENT.md`
4. `tasks/TASK-PROV-0001-pilot-capture.md`
5. `docs/LOCAL_VALIDATION_LUNA.md`
6. `specs/TDD.md` as needed

Do not reconstruct project state from the chat session that created this branch.

## Exact next action

No additional live action is required for the accepted v0.1 pilot/holdout baseline. The canonical pilot checkpoint already records the required unpacked-MV3 popup, service-worker, controlled-download, and completed-state discoverability smoke, while the built-in full-CDP pilot records the aggregate source/node/edge/tool/citation/hash/rendered/scroll evidence. Wait for explicit authorization before running the optional client-visible observer, or for a user-supplied official export ZIP before testing official import.

## Scope guard

Do not implement account-wide bulk export yet. After the pilot, run the independent PROV-0002 holdout before scaling or tuning an ontology.

## Authority

`PROJECT + CURRENT + TASK + relevant spec` are canonical. Issue #6 and PR #7 are coordination/review mirrors.
