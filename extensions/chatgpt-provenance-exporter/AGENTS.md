# Agent Operating Contract — ChatGPT Provenance Exporter

This extension is designed for short, focused sessions by multiple independent agents.

## Read order

Before changing this extension, read only:

1. `PROJECT.md`
2. `checkpoints/CURRENT.md`
3. the assigned `tasks/TASK-*.md`
4. the minimum domain document required:
   - product properties: `specs/PDD.md`
   - system design: `specs/SDD.md`
   - testing: `specs/TDD.md`
   - continuity: `docs/HANDOFF_PROTOCOL.md`

Do not use old chat transcripts as authoritative project state when repository state disagrees.

## One task, one branch/worktree, one primary agent

Task branches should use:

`task/PROV-XXXX-short-name`

A task may modify only its declared files unless the task contract is updated first.

## Checkpoint rule

At every meaningful stop, append to the task checkpoint log:

- completed work;
- exact files changed;
- commands/tests run and results;
- evidence collected;
- decisions;
- blockers/uncertainty;
- next atomic action.

Update `checkpoints/CURRENT.md` only when repository-wide state or priority changes.

## Evidence discipline

Never upgrade a claim because an agent said it happened. Distinguish:

- raw source evidence;
- deterministic derived evidence;
- rendered/UI evidence;
- external confirmation;
- agent/model interpretation;
- unrecoverable or inferred history.

Do not alter or normalize away disagreements.

## Context minimization

A receiving session should be able to start from PROJECT + CURRENT + one task + one relevant spec. If more context is required, link it explicitly from the task.

## Local execution / Luna handoff

Local browser or shell-capable agents must write observed commands/results back into the task file before stopping. A model/CUA observation is supporting evidence; deterministic structural checks remain the correctness oracle for capture completeness.
