# Current Handoff — ChatGPT Provenance Exporter

This project is ready for a fresh session without prior chat history.

## Active work

- Task: `PROV-0001 — Single-Conversation Provenance Pilot`
- GitHub issue: #6
- Draft PR: #7
- Branch: `feature/chatgpt-provenance-exporter`
- Canonical task: `tasks/TASK-PROV-0001-pilot-capture.md`
- Status: `IMPLEMENTED_UNVERIFIED / LIVE_SMOKE_REQUIRED / HOLDOUT_REQUIRED`

## Read exactly this first

1. `PROJECT.md`
2. `AGENTS.md`
3. `checkpoints/CURRENT.md`
4. `tasks/TASK-PROV-0001-pilot-capture.md`
5. `docs/LOCAL_VALIDATION_LUNA.md`
6. `specs/TDD.md` as needed

Do not reconstruct project state from the chat session that created this branch.

## Exact next action

On a local machine/browser-capable session:
1. check out this branch;
2. run `node tests/test.js` in this extension;
3. run repository-wide `node scripts/test-all.mjs`;
4. fix only evidenced defects;
5. load the extension unpacked in Brave/Chromium;
6. capture one selected large, tool-heavy ChatGPT conversation;
7. verify node conservation, source pointers, representative tool records, hashes, rendered reconciliation, and scroll restoration;
8. append exact results to the canonical task checkpoint.

## Scope guard

Do not implement account-wide bulk export yet. After the pilot, run the independent PROV-0002 holdout before scaling or tuning an ontology.

## Authority

`PROJECT + CURRENT + TASK + relevant spec` are canonical. Issue #6 and PR #7 are coordination/review mirrors.
