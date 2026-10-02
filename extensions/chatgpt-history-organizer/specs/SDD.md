# SDD — ChatGPT History Organizer

## Architecture

```text
popup.html/js
   | user commands + BYOK settings
   v
MV3 background service worker
   | durable state in chrome.storage.local
   | one small resumable work slice per activation
   | chrome.alarms recovery trigger
   v
session-bridge.js on chatgpt.com
   | explicit request only: obtain current session token
   v
ChatGPT read-only list/detail endpoints

background -> optional BYOK provider
             proposed folders only

library.html/js <- persisted compact profiles + folder map
```

The popup is never the long-running worker. Closing it has no effect on the job.

## Browser contexts

### Popup
- start, pause, resume, reset;
- display persisted status/progress;
- configure optional BYOK provider/model/key;
- request provider host permission only from the user gesture that saves BYOK settings;
- open the extension-owned library page.

### Background service worker
- owns the state machine;
- performs enumeration, detail fetching, deterministic organization, and optional LLM refinement in bounded slices;
- persists before scheduling the next slice;
- uses a one-shot alarm to recover after MV3 suspension;
- never relies on global variables for durable correctness.

### ChatGPT session bridge
- injected declaratively on `https://chatgpt.com/*`;
- responds only to explicit extension messages;
- fetches `/api/auth/session` from the signed-in page origin and returns the access token to the requesting worker;
- has no DOM observer, interval, navigation watcher, or chat-content listener.

### Library page
- reads extension-local folder/profile state;
- searches titles/keywords;
- links back to `https://chatgpt.com/c/<conversation-id>`.

## State machine

```text
idle
  -> enumerating
  -> profiling
  -> organizing
  -> refining (optional)
  -> done

active phase -> paused -> previous active phase
active phase -> waiting_tab -> previous active phase
active phase -> error -> previous active phase on Resume
any non-idle phase -> reset -> idle (new generation)
```

A completed run cannot be replaced by pressing Start. The user must Reset first, making a new snapshot an explicit action.

## Snapshot invariant

At Start:

- `snapshot_cutoff_ms = Date.now()`;
- only conversation summaries whose `create_time <= snapshot_cutoff_ms` enter the queue;
- duplicate IDs are ignored;
- enumeration may observe later conversations because the remote list is changing, but they are filtered before queue admission;
- after enumeration completes, the queue is frozen and resume never re-enumerates it.

Pagination uses overlap (`limit=100`, step=80) to reduce omission risk from list drift. Deduplication makes overlap idempotent. Completion occurs on an empty/short page or when the observed page reaches the reported tail. Counts are observational, not a completeness guarantee.

## Checkpoint model

`chrome.storage.local` stores one compact state document containing:

- schema version, generation, run ID, phase, resume phase;
- snapshot timestamp;
- enumeration counters and frozen summaries;
- profile progress index;
- compact per-chat profiles (ID/title/times/message count/top keywords);
- deterministic folders and optional refined folders;
- bounded failures and last warning/error.

Raw conversation responses and ChatGPT access tokens are never persisted.

Every work slice:

1. reads current durable state;
2. validates run ID/generation;
3. performs one enumeration page or a small detail batch;
4. rereads state before commit;
5. commits only if run ID/generation/phase still match;
6. schedules the next alarm.

Reset increments `generation`. A stale async task from an older generation cannot commit over the reset state.

## Tab/background behavior

The worker does not depend on the currently active tab. It searches for any ChatGPT tab.

- If none exists when Start is pressed, it creates an inactive ChatGPT tab.
- If no usable tab exists later, state becomes `waiting_tab`; an alarm retries.
- If the content script is missing in an already-open tab after installation/update, the worker injects `session-bridge.js` and retries.
- Changing active tabs does not alter the run.
- If a ChatGPT tab reloads or is discarded, no progress is lost because the last committed unit is already durable.
- If the service worker is suspended, the next alarm/startup/tab event reconstructs work from storage.

## ChatGPT adapter

Known read endpoints:

- `GET /backend-api/conversations?offset=<n>&limit=100&order=updated`;
- `GET /backend-api/conversation/<id>`.

Authentication is a bearer token obtained from the signed-in page session. The token exists only in memory for the current work slice.

Retry policy:
- bounded retries for `429` and `5xx`;
- exponential delay inside the current slice;
- non-transient/malformed detail responses record a bounded failure and fall back to a title-only profile so one corrupt chat does not block the account run;
- list-response shape failure stops in `error` because the target set cannot be trusted.

## Deterministic organizer

For each frozen conversation:

1. parse message text from the conversation mapping in memory;
2. bound inspected text length;
3. tokenize title + message text;
4. weight title tokens and title bigrams more heavily;
5. retain only top keywords and counts;
6. discard raw text.

Folder generation is sparse and deterministic:

- compute document frequency for keywords;
- choose bounded topic anchors that are neither unique noise nor near-universal terms;
- assign each chat to its strongest available anchor;
- merge tiny residual groups into `Other`;
- produce stable folder IDs and stable member ordering.

No FAISS/vector database is required for v0.1. The module boundary allows a future embedding adapter without changing lifecycle semantics.

## BYOK refinement

Supported v0.1 providers use OpenAI-compatible chat-completions endpoints:

- OpenAI;
- OpenRouter;
- Groq;
- Together;
- Mistral;
- DeepSeek;
- xAI.

Provider origins are declared as `optional_host_permissions`. Permission is requested only when the user saves an enabled provider profile.

Stored setting fields: provider, model, API key, enabled. The API key is local extension storage only, never synced or logged by the extension.

The provider receives:
- deterministic group ID;
- size;
- top keywords;
- bounded representative chat titles.

It does not receive raw transcript bodies.

Expected response:

```json
{"groups":[{"name":"Browser Automation","source_group_ids":["topic-browser","topic-extension"]}]}
```

Validation rules:
- every source group ID must already exist;
- no source group may appear twice;
- names are bounded strings;
- omitted source groups remain unchanged;
- malformed/invented output is rejected and deterministic folders remain final.

## Permissions

Required:
- `storage` — durable checkpoints/settings;
- `tabs` — find/create ChatGPT tab and open library workflows;
- `scripting` — recover an already-open tab whose declarative content script predates installation/update;
- `alarms` — MV3 recovery scheduling;
- host `https://chatgpt.com/*` — read authorized ChatGPT data.

Optional provider hosts are explicit and provider-specific. No `<all_urls>`, cookies permission, webRequest, debugger, native messaging, or remote script execution.

## Failure semantics

- enumeration integrity error -> `error`, Resume retries same phase/state;
- missing ChatGPT tab -> `waiting_tab`, automatic retry without resetting;
- malformed individual detail -> bounded failure + title-only profile;
- BYOK failure -> deterministic result remains `done` with warning;
- pause -> no new unit starts after current bounded request/batch boundary;
- reset -> stale generation invalidated; all extension-local organizer state cleared;
- no remote ChatGPT write exists in v0.1.

## Validation strategy

- dependency-free Node unit/property/metamorphic tests for `core.js`;
- source/manifest architecture assertions for MV3, permissions, no passive watcher, alarms/checkpoints, and no ChatGPT mutation;
- separate uncommitted holdout generator for unseen topic vocabularies and interruption/drift cases;
- live Brave smoke remains a separate evidence state.