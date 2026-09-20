# Built-in Browser Validation — PROV-0001

This is a development-only validation route for the ChatGPT desktop app's built-in browser. It runs the same `core.js` and `content.js` capture logic in the actual `chatgpt.com` page through a small in-page runtime adapter. It does not replace the unpacked-extension checks for the popup, service worker, `chrome.storage`, or `chrome.downloads`.

## One-time setup

1. In the ChatGPT desktop app, open **Settings → Browser**.
2. Enable **Developer mode** and **Enable full CDP access**.
3. Open the selected pilot conversation at `/c/<conversation-id>` in the built-in browser.
4. Approve the browser-access prompt if ChatGPT shows one.

Full CDP access is required because the validation needs to evaluate the payload in the page's own origin, read the authenticated same-origin response, inspect the rendered DOM, and observe the in-memory bundle. Do not paste private transcript contents into the repository checkpoint.

## Build the page payload

From the extension directory, run:

```text
node dev/build-browser-payload.mjs
```

The command writes the payload to standard output. Use the built-in browser's approved CDP/evaluate surface to execute that output in the open conversation page. Do not use an external browser profile or inject it into an unrelated origin.

After evaluation, the page exposes:

```js
ChatGPTProvenanceStandalone.start()
ChatGPTProvenanceStandalone.pause()
ChatGPTProvenanceStandalone.resume()
ChatGPTProvenanceStandalone.reset()
ChatGPTProvenanceStandalone.getState()
ChatGPTProvenanceStandalone.getBundle()
```

The bundle is retained only in page memory at `window.__CHATGPT_PROVENANCE_BUNDLE__`; it is not sent to a remote endpoint or written to extension storage. Inspect aggregate counts and validation artifacts, then run the structural checks in `LOCAL_VALIDATION_LUNA.md`. Preserve only counts, hashes, reconciliation results, defects, and commands in the task checkpoint.

## What this proves

- the current same-origin session endpoint and conversation endpoint can be acquired;
- raw response text is preserved before parsing;
- the actual ChatGPT DOM can be swept and restored;
- the existing graph, tool, citation, reconciliation, and SHA-256 pipeline runs in-page;
- pause, resume, and reset stop or control the active run without mutating the remote conversation.

## What still needs an unpacked extension check

- popup labels and control messages;
- service-worker download behavior and local file paths;
- manifest permissions and browser storage behavior;
- a final user-facing installed-extension smoke test.

Do not begin bulk export or PROV-0002 from this development route.

## Optional client-visible event observer — PROV-0006

The repository also contains a separate, opt-in development payload for observing client-visible conversation request/response envelopes. Build it with:

```text
node dev/build-live-browser-payload.mjs
```

Evaluate the generated payload in the same approved built-in-browser page, then use:

```js
ChatGPTProvenanceLiveCapture.start()
ChatGPTProvenanceLiveCapture.pause()
ChatGPTProvenanceLiveCapture.resume()
ChatGPTProvenanceLiveCapture.stop()
ChatGPTProvenanceLiveCapture.reset()
ChatGPTProvenanceLiveCapture.getState()
ChatGPTProvenanceLiveCapture.getEvents()
```

This observer is not part of the installed MV3 extension. It records only same-origin conversation paths, excludes credential headers, never changes or replays requests, and retains events only in page memory. Do not run this smoke route until the PROV-0006 checkpoint explicitly authorizes it, and preserve only aggregate counts, classifications, hashes, and defects—not event bodies or private IDs.
