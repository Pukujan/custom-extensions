# ChatGPT Transcript Exporter — Brave / Chromium

Exports the active ChatGPT conversation to Markdown or structured JSON without manual select-all/copy.

## Packaged download

For the current repository release, download `chatgpt-transcript-exporter-v0.1.0.zip` from GitHub Releases, extract it, and select the extracted folder with Brave's **Load unpacked** flow. The archive places `manifest.json` at its root.

## Why this implementation scrolls the conversation

Long ChatGPT conversations can be virtualized: older/off-screen turns may not all exist in the DOM at the same instant. A one-shot selector can therefore produce a convincing but truncated export.

This extension starts at the top, sweeps downward in overlapping viewport steps, harvests user/assistant turns, deduplicates stable identities, repeats full sweeps until two consecutive passes observe the same turn-key set (bounded to four passes), restores the original scroll position, and marks the export **PARTIAL / NOT ESTABLISHED** if sweep stability is not achieved.

It does not claim access to regenerated alternative branches or content the ChatGPT UI itself refuses to render.

## Install in Brave

1. Extract the release ZIP, or use this directory from a repository checkout.
2. Open `brave://extensions/`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the folder containing this extension's `manifest.json`.

## Use

1. Open the ChatGPT conversation you want to preserve.
2. Wait for any active response to finish streaming.
3. Click the extension.
4. Choose **Export Markdown** or **Export JSON**.
5. The page may scroll while harvesting. You may close the popup; the content runner continues in the tab.
6. Brave prompts for the local download location.

## Export semantics

Markdown includes title, source URL, conversation ID when available, export time, captured-turn count, completeness status, and ordered `User` / `Assistant` sections.

JSON uses schema `custom-extensions.chatgpt-transcript.v1` and includes role, stable IDs when exposed by the page, turn index when available, Markdown, and normalized plain text.

## Privacy

No transcript content is sent to a remote service. Extraction happens in the active `chatgpt.com` tab and the result is passed to the extension's local download service worker.

## Tests

```bash
node tests/test.js
```

Deterministic tests cover ordering, dedupe, stable identity, completeness classification, serialization, randomized message sets, manifest permissions, and architecture invariants. A live Brave smoke test is still required because ChatGPT DOM behavior can change.
