# Context Packs

## Purpose

A context pack gives a fresh agent/session the minimum project state needed to execute one task without loading historical chat transcripts or unrelated repository history.

## Canonical sources

A context pack is derived from:

1. `PROJECT.md`
2. `checkpoints/CURRENT.md`
3. one assigned `tasks/TASK-*.md`
4. only the relevant spec(s)
5. optional local-validation/handoff document explicitly linked by the task

The canonical state remains those source files. A context pack is disposable and must never be edited as the primary project record.

## Required metadata

Every generated/shared context pack should state:

- repository;
- Git branch/ref;
- commit SHA when available;
- generated_at;
- task ID;
- source file list.

## Recommended pack structure

```text
CONTEXT PACK
metadata
---
PROJECT
---
CURRENT
---
TASK
---
RELEVANT SPEC
---
LATEST HANDOFF / LOCAL VALIDATION
```

## Start-session rule

A new ChatGPT/Luna/Work/local session should receive the context pack or read the canonical files directly. It should not need prior session chat history.

## Stop-session rule

Agents do not update the context pack. They update the canonical task/checkpoint files, commit the change, and regenerate/re-share a pack only when useful.

## GitHub Issues / Beads

Issue trackers are coordination indexes:
- title/priority/status/owner/dependencies;
- links to branch/PR/task;
- short discussion.

They are not the only source of execution context. The repository task contract must remain sufficient if an issue tracker is unavailable.

If Beads is adopted, mirror the task ID (for example `PROV-0001`) so Beads, GitHub Issue, branch, commit messages, and task files all share one identifier.

## Context-rot guard

Keep one task small enough that a fresh session can execute it from PROJECT + CURRENT + TASK + one spec. If a task requires loading many unrelated documents or historical chats, split it.
