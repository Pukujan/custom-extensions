# PDD — ChatGPT History Organizer

## Problem

A large ChatGPT account can accumulate hundreds or thousands of old conversations with no useful folder structure. Manually opening and sorting them is too expensive, while continuously monitoring future conversations violates the intended privacy boundary for this utility.

## Product intent

Provide a one-shot, retroactive organizer for conversations that already exist when the user presses **Scan existing chats**. The extension freezes that population, derives compact local topic profiles, groups them deterministically, and optionally lets a user-supplied LLM rename or merge those proposed groups.

## Risk class

`stateful`.

The extension reads session-authorized ChatGPT conversation data and writes only extension-local organization state. It does not delete, archive, rename, or otherwise mutate ChatGPT account data.

## Core properties

### P-HIST-001 — Retroactive-only snapshot
The run freezes a start timestamp. Conversations created after that timestamp are excluded even if they appear during pagination or later retries.

### P-HIST-002 — No passive future-chat monitoring
The extension does not observe ChatGPT DOM mutations, message composition, conversation creation events, or future chats after a run finishes.

### P-HIST-003 — Frozen target set
After enumeration completes, detail processing uses the frozen deduplicated queue. Resume never re-enumerates that queue.

### P-HIST-004 — Durable progress
Popup closure, tab switching, MV3 worker suspension, page reload, browser backgrounding, or transient request failure must not silently reset progress. Durable checkpoints live in `chrome.storage.local`.

### P-HIST-005 — Explicit lifecycle controls
The user can pause, resume, and reset. Pause stops before the next unit of work; resume continues the same run; reset invalidates stale work and returns to a clean baseline.

### P-HIST-006 — Bounded local retention
Raw conversation bodies are processed in memory and are not persisted. Stored records contain conversation ID, title, timestamps, message count, compact keywords, folder assignment, bounded failures, and run metadata.

### P-HIST-007 — Deterministic baseline
Folder membership can be produced without an LLM. Reordering the same input must not change deterministic membership.

### P-HIST-008 — Optional BYOK refinement
BYOK is optional. The LLM receives proposed group metadata (group IDs, sizes, keywords, representative titles), not complete raw transcripts. It may rename or merge proposed groups only. Invalid or invented group IDs fail closed and the deterministic result remains usable.

### P-HIST-009 — No remote ChatGPT mutation
All ChatGPT account requests are read-only GET requests.

## Primary workflow

1. User opens the extension and optionally configures a BYOK provider.
2. User presses **Scan existing chats**.
3. The run freezes its snapshot time and enumerates existing conversation IDs.
4. The extension fetches each frozen conversation, derives a compact topic profile in memory, and checkpoints after every item.
5. The deterministic organizer builds folders.
6. If BYOK is enabled and permission was granted, the LLM may rename/merge those folders.
7. The library page shows folders and links back to the original ChatGPT conversations.

## Non-goals

- monitoring or automatically classifying newly created conversations;
- modifying ChatGPT's native Projects/folders or remote conversation metadata;
- deleting/archiving conversations;
- storing full raw transcripts in extension storage;
- bypassing ChatGPT authentication or access controls;
- using multiple API keys to evade provider limits;
- claiming live compatibility from deterministic tests alone.

## Acceptance criteria

- deterministic tests cover snapshot exclusion, dedupe, grouping stability, lifecycle transitions, malformed input, BYOK validation, permissions, and no-mutation policy;
- metamorphic tests cover reordering, duplicate pages, pause/resume equivalence, reset independence, and post-snapshot additions;
- a separate holdout run exercises unseen generated topics, pagination drift, lifecycle interruption, and malformed LLM output without changing implementation after seeing the holdout cases;
- repository test orchestration passes after registration;
- live Brave/ChatGPT behavior remains `LIVE_SMOKE_REQUIRED` until observed in a real browser session.