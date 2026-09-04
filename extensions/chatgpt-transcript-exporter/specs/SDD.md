# SDD — ChatGPT Transcript Exporter

## Runtime architecture

```text
popup
  │ START_TRANSCRIPT_EXPORT
  ▼
content script runner on chatgpt.com
  │
  ├─ detect streaming / conversation
  ├─ find scroll container
  ├─ repeated top→bottom harvest sweeps
  ├─ stable-key dedupe + order
  ├─ serialize Markdown or JSON
  │
  └─ DOWNLOAD_TEXT_EXPORT
          ▼
   MV3 service worker
          ▼
   chrome.downloads
```

The popup is a controller/status view only. It does not own the long-running harvest loop.

## Context ownership

### `core.js`
Pure deterministic functions: text normalization, turn-index parsing, stable keys, merge/dedupe, ordering, repeated-sweep stability classification, filename sanitization, and Markdown/JSON serialization. Browser-safe and Node-testable.

### `content.js`
Site adapter and runner: message/role selectors, content-root selection, DOM→Markdown conversion, scroll-container detection, virtualized sweep, progress state, scroll restoration, and serialization request.

Primary selectors favor semantic attributes: `article[data-testid^="conversation-turn-"]`, `article[data-turn]`, and `[data-message-author-role]`. Generated CSS class names are only content-root fallbacks, not identity.

### `background.js`
Receives generated text and invokes `chrome.downloads.download`. It has no site access or extraction logic.

### `popup.js`
Queries the active ChatGPT tab, starts an export, and renders `chrome.storage.local` progress. Actual concurrency is owned by the content runner.

## Completeness protocol

A pass jumps to the top, waits for DOM settle, harvests current turns, advances by roughly 55% of viewport height with overlap, repeats to the bottom, and performs a final settled harvest. Each pass records the stable keys it personally observed.

The export is `stable_full_sweep` only if the latest two pass sets are identical and non-empty. Maximum passes: 4. This establishes sweep stability under the current page behavior; it does not prove ChatGPT exposed hidden or regenerated branches.

## Identity priority

1. `data-turn-id` + role;
2. conversation `data-testid` + role;
3. message id/uuid + role;
4. fallback content fingerprint + role.

Fallback identity is weaker and may collapse identical repeated text; JSON retains available identifiers for auditability.

## Ordering

Prefer numeric `conversation-turn-N`. Records lacking turn index sort after indexed records by first-seen top-to-bottom order.

## Failure semantics

Hard error/no download: wrong host, active streaming response, no recognized turns, zero non-empty extracted turns, or download API failure.

Warning/download allowed: bounded repeated sweeps fail to stabilize; output is explicitly marked partial.

The original scroll position is restored in a `finally` block around sweep execution.

## Permissions

- `activeTab`: popup interaction with current tab;
- `storage`: small progress/status only, never transcript archive;
- `downloads`: local file creation;
- host: `https://chatgpt.com/*` only.

No `cookies`, `webRequest`, `<all_urls>`, remote code, or backend API access.

## Test strategy

Node tests cover pure logic and architecture/manifests. Live Brave smoke tests cover current DOM selectors, scroll-container behavior, virtualization, download behavior, and formatting fidelity.
