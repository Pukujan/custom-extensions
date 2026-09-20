# Handoff and Checkpoint Protocol

## Purpose

Any new ChatGPT, Luna, Work, Codex, Claude, or local-agent session should be able to resume without reconstructing project intent from historical conversation logs.

## State hierarchy

- `PROJECT.md`: stable why, scope, evidence philosophy, phases.
- `checkpoints/CURRENT.md`: single program-wide current state and next action.
- `tasks/TASK-*.md`: bounded execution contract and append-only checkpoint log.
- GitHub Issue / Beads item: coordination/queue mirror, not the only project memory.
- specs: behavioral/design/test contracts.
- captured provenance bundles: research evidence, never project-management state.

## Task contract

Every task should contain:

- ID/status/owner/priority;
- goal and why;
- allowed files;
- dependencies;
- acceptance criteria;
- planned/required commands;
- evidence requirements;
- checkpoint log;
- handoff.

Statuses: queued, active, blocked, review, done, abandoned.

## Checkpoint format

Append; do not rewrite history.

```
### YYYY-MM-DD HH:MM UTC — <agent/session>

Completed:
- ...

Evidence:
- command/observation -> result

Decisions:
- ...

Changed:
- ...

Blocked/uncertain:
- none | ...

Next:
- exactly one atomic action
```

## Session start

A fresh session reads:

`PROJECT → CURRENT → assigned TASK → one relevant spec`

Do not indiscriminately load historical transcripts. Use provenance archives only when the task explicitly needs historical evidence.

## Session stop

Before stopping:

1. commit meaningful changes or explicitly record dirty state;
2. append exact tests/results to the task;
3. record uncertainty rather than guessing;
4. set one atomic next action;
5. update CURRENT only if program priority/state changed;
6. link PR/issue/Beads identifiers where applicable.

## Context packs

A context pack is a derived convenience view, not authority. It may contain PROJECT + CURRENT + current TASK + relevant spec excerpts + latest checkpoint. It must identify the exact Git commit/ref it was built from.

Future automation may generate context packs, but canonical state remains the source files above.
