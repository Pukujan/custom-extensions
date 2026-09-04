# ChatGPT 10-Day Cleaner v2 — Brave / Chromium

Version 2 fixes the popup-lifecycle problem.

## Packaged download

For the current repository release, download `chatgpt-10-day-cleaner-v2.0.0.zip` from GitHub Releases, extract it, and select the extracted folder with Brave's **Load unpacked** flow. This extension is destructive: always inspect the dry-run candidate set before confirming deletion.

## What changed

The old build performed the actual scan/delete loop inside the extension popup. Chromium popups are ephemeral: clicking elsewhere closes the popup and destroys its JavaScript context.

v2 moves the long-running work into a content runner attached to the `chatgpt.com` tab and persists state in `chrome.storage.local`.

That means:

- you may close the extension popup while it scans/deletes;
- reopening the popup shows the saved progress;
- deletion resumes from its saved index after a ChatGPT page reload;
- a page reload during a **scan** fails closed and requires a fresh dry run;
- the deletion queue is the exact frozen candidate set from the dry run;
- the cutoff is **not recalculated** when you press Delete;
- **Last updated date** remains the default basis.

## Install / upgrade in Brave

1. Extract the release ZIP, or use this directory from a repository checkout.
2. Open `brave://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the folder containing this extension's `manifest.json`.
5. Keep a signed-in `https://chatgpt.com` tab open.
6. Open the extension and click **Scan / Dry run**.
7. Reopen it, inspect the frozen snapshot, type `DELETE`, and start deletion.

## Safety invariants

1. A chat is eligible only when the selected timestamp is strictly older than the frozen cutoff.
2. Invalid/missing timestamps fail closed and are not candidates.
3. Candidate IDs are deduplicated.
4. Deletion uses the exact dry-run candidate set, not a fresh rescan.
5. Deletion progress is persisted after every processed chat.
6. Closing the popup cannot stop the runner because the popup does not perform the backend loop.
7. If the ChatGPT page reloads during deletion, the runner resumes from saved progress.
8. If the page reloads during scanning, partial scan data is discarded.

## Local tests

```bash
node tests.js
```

## Caveat

This extension uses ChatGPT's authenticated internal web endpoints. Those endpoints can change, which may require an extension update.
