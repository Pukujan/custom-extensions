# Optional client-visible event capture design

## Scope

This phase adds an opt-in development-only observer for requests and responses that the ChatGPT page itself exposes to its client. It is supplementary evidence, not a replacement for the authenticated conversation response, and it never blocks or changes a request.

The first implementation is page-memory only and is exercised through the existing built-in-browser CDP development route. It is not enabled automatically by the installed MV3 extension and it does not add `webRequest`, `debugger`, cookies, or native permissions.

## Capture boundary

Only same-origin ChatGPT conversation paths are eligible:

- `/backend-api/conversation...`;
- `/backend-api/conversations...`;
- `/backend-api/f/conversation...`.

The session endpoint and all unrelated origins/paths are rejected before an event record is created. Authorization, cookie, proxy, and other sensitive headers are never recorded. Request bodies are captured only when they are already available as plain text or URL-encoded data to the page hook. Response bodies are retained as raw text, with a visible body-limit omission if a client event exceeds the configured safety bound.

## Event record

Each record contains:

- monotonic sequence and observation time;
- transport (`fetch` or `xhr`), request method, same-origin URL/path, status, and safe response headers;
- exact available request/response text or an explicit omission reason;
- SSE framing analysis that retains the original response text and parsed `data:` frames as a derived view;
- a source classification hint only; no event is promoted to a tool call/result without source evidence.

The raw conversation capture remains authoritative for mapping/node/tool/source conservation. Live records are joined by URL, request/response timing, and explicit IDs only when exposed; unmatched events remain unmatched.

## Lifecycle and safety

`start`, `pause`, `resume`, `stop`, and `reset` are explicit in-memory controls. Starting installs wrappers; stopping restores the original `fetch`/XHR methods. Pause stops recording at the next event boundary. Reset removes all retained live records. The hook never sends a network request, writes to ChatGPT, or persists transcript/event content to extension storage.

The development bootstrap exposes `ChatGPTProvenanceLiveStandalone.getEvents()` for aggregate inspection. Checkpoints store counts, classifications, hashes, and defects only—not event bodies or private IDs.

## Acceptance gate

Deterministic tests must cover same-origin filtering, credential-header exclusion, request/response raw preservation, SSE framing, sequence ordering, pause/reset behavior, and restoration of the original page hooks. A built-in-browser smoke may be performed later on a deliberately tool-heavy conversation; it must record aggregate event counts and whether live events correlate with source-backed tool records without copying event bodies to Git.

