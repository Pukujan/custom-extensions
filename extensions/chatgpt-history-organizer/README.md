# ChatGPT History Organizer v0.1

A Brave/Chromium extension for organizing **existing** ChatGPT conversations into extension-local folders.

It is intentionally retroactive-only. When you press **Scan existing chats**, the extension freezes a snapshot timestamp and ignores conversations created after that point. It does not watch what you type later and does not automatically ingest future chats.

## What it does

- enumerates the existing ChatGPT conversations available to your signed-in browser session;
- freezes and deduplicates that target set;
- reads each frozen conversation one at a time and derives a compact local topic profile;
- stores IDs, titles, timestamps, message count, and top keywords — not full raw transcripts;
- builds deterministic smart folders without requiring an AI API;
- optionally sends only proposed group metadata and representative titles to a BYOK LLM so it can rename or merge the proposed folders;
- provides a searchable extension-owned library whose links open the original ChatGPT chats.

It does **not** modify ChatGPT Projects, archive chats, delete chats, rename remote chats, or otherwise mutate the ChatGPT account.

## Browser-lifecycle behavior

The popup does not perform the long job. A Manifest V3 service worker processes bounded slices and checkpoints every unit to `chrome.storage.local`.

- switching tabs does not stop the run;
- closing the popup does not stop the run;
- service-worker suspension is recovered through `chrome.alarms`;
- a reloaded/discarded ChatGPT tab does not erase committed progress;
- if no ChatGPT tab is available, the run waits and keeps the same frozen snapshot;
- **Pause** stops before the next unit of work;
- **Resume** continues the same snapshot;
- **Reset** clears the organizer's local state and invalidates stale in-flight work.

## BYOK

BYOK is optional. v0.1 supports one active profile at a time for these OpenAI-compatible endpoints:

- OpenAI
- OpenRouter
- Groq
- Together
- Mistral
- DeepSeek
- xAI

You enter the model name yourself so the extension does not bake in a model identifier that may become stale.

Provider host access is optional permission requested only when you enable/save that provider. The API key is stored in extension-local storage, is not synced by this extension, and is never sent anywhere except the selected provider endpoint.

The LLM receives folder proposal metadata: group IDs, sizes, keywords, and bounded representative chat titles. It does not receive full conversation bodies. Its output is validated: it may rename or merge known proposed groups, but invented IDs fail closed and the deterministic folders remain usable.

v0.1 does not rotate multiple keys to bypass provider limits.

## Install in Brave

1. Use this extension directory from the repository checkout (or a future packaged release).
2. Open `brave://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this directory.
5. Sign in to `https://chatgpt.com`.
6. Open the extension and press **Scan existing chats**.
7. Reopen the popup at any time to pause/resume or open the organized library.

## Privacy boundary

Raw conversation responses are processed in memory for keyword extraction and are not written to extension storage. The extension retains compact derived profiles and folder assignments so the library can work after the scan.

The ChatGPT page bridge has one job: on explicit request, read the signed-in session token for the current work slice. It has no DOM observer, polling loop, input listener, or new-chat watcher.

## Known adapter risk

The extension uses ChatGPT's authenticated internal web list/detail endpoints. Those are not public stable APIs and may change. Adapter failures are surfaced instead of silently fabricating results.

## Validation

```bash
node tests/test.js
```

The deterministic suite covers snapshot boundaries, pagination overlap/dedupe, compact profiling, grouping invariants, pause/resume/reset, stale-generation protection, BYOK validation, manifest permissions, no passive watcher, and no ChatGPT mutation path.

A separate generated holdout is run outside the committed extension fixtures. See `TEST_REPORT.txt` for aggregate evidence. Live Brave/ChatGPT behavior still requires a real browser smoke test before it can be labeled `LIVE_SMOKE_PASSED`.