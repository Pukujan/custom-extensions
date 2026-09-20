# SDD — ChatGPT Provenance Exporter

## Runtime architecture

```text
popup/status
   │ START / PAUSE / RESUME / RESET_PROVENANCE_CAPTURE
   ▼
content runner on chatgpt.com
   │
   ├─ identify /c/<conversation-id>
   ├─ obtain signed-in session access token
   ├─ GET /backend-api/conversation/<id>
   ├─ preserve raw response text before JSON.parse
   ├─ normalize graph losslessly
   ├─ derive node/edge/message/tool/etc indexes
   ├─ independent virtualized DOM sweep
   ├─ reconcile source vs rendered views
   ├─ SHA-256 emitted text artifacts
   │
   └─ DOWNLOAD_PROVENANCE_FILES
                ▼
        MV3 service worker
                ▼
         chrome.downloads
```

The popup controls/status only. Long-running work belongs to the content runner so closing the popup does not terminate capture. Each run has a cancellation token and `AbortController`; pause waits at network/sweep boundaries, resume continues the same run, and reset aborts it and clears status. State writes are serialized so a reset cannot be overwritten by a stale progress write.

## Context ownership

### `core.js`
Pure browser/Node-compatible logic:
- stable JSON/string helpers;
- graph node/edge extraction;
- broad event classification;
- messages/tool/citation/artifact derivation;
- rendered dedupe/order;
- reconciliation;
- deterministic JSON/JSONL/Markdown serialization;
- manifest/capture-report construction.

### `content.js`
Site adapter and runner:
- auth session request;
- authenticated conversation GET;
- raw response acquisition;
- DOM virtualized sweep;
- SHA-256 hashing;
- progress state;
- bundle assembly request.

### `background.js`
Local download adapter only. Receives named UTF-8 files and downloads them under a deterministic capture directory. It has no ChatGPT extraction logic.

### `popup.js`
Starts, pauses, resumes, and resets capture for the active ChatGPT conversation while rendering persisted progress.

### Built-in browser development adapter
`dev/standalone-browser-bootstrap.js` supplies an in-memory runtime shim for `content.js` and retains the generated bundle only at `window.__CHATGPT_PROVENANCE_BUNDLE__`. `dev/build-browser-payload.mjs` composes `core.js`, the shim, and `content.js` for evaluation in the ChatGPT desktop built-in browser with full CDP enabled. This validates the same-origin acquisition/DOM/core pipeline but intentionally does not claim coverage for the MV3 popup, service worker, `chrome.storage`, or `chrome.downloads` surfaces.

## Acquisition

1. Require hostname `chatgpt.com`.
2. Parse conversation ID from `/c/<id>`.
3. GET `/api/auth/session` with session credentials.
4. Require `accessToken`.
5. GET `/backend-api/conversation/<encoded-id>` with Bearer token and credentials.
6. Read response as text before parsing.
7. Parse JSON; require a non-empty mapping/object graph.
8. Preserve the raw response text as an evidence artifact.

These are undocumented site adapters and therefore explicitly unstable. Drift must fail visibly.

## Source graph representation

The adapter treats `conversation.mapping` as an opaque mapping of node IDs to arbitrary node objects.

Derived `nodes.jsonl` records contain:
- mapping key/node_id;
- parent;
- children;
- selected convenience fields;
- broad class;
- source pointer;
- `raw_node` containing the complete node object.

No unknown field is discarded from the normalized node record because `raw_node` remains complete.

`edges.jsonl` derives only relationships explicitly present in source:
- parent -> node;
- node -> child.

Edges are deduplicated deterministically.

## Broad classification

Classification is intentionally conservative and versioned.

Priority examples:
- author role user -> `message.user`;
- assistant -> `message.assistant`;
- system -> `message.system`;
- tool -> `message.tool`;
- explicit recipient/tool-call content markers -> `tool.call`;
- explicit tool author/result markers -> `tool.result`;
- citation structures -> `citation`;
- file/artifact structures -> `artifact` or `attachment`;
- browser/activity markers -> `browser.activity`;
- status/progress markers -> `execution.status`;
- otherwise -> `unknown`.

Candidate tool records include the complete raw node and classification evidence; they are not reduced to a guessed name/args pair.

## Rendered verifier

Use semantic selectors from the existing transcript exporter:
- `article[data-testid^="conversation-turn-"]`;
- `article[data-turn]`;
- `[data-message-author-role]`.

The verifier:
1. saves original scroll;
2. jumps to top;
3. sweeps downward in overlapping steps;
4. harvests visible user/assistant records;
5. repeats full sweeps;
6. declares rendered stability only after two consecutive non-empty pass key sets are identical;
7. restores original scroll in `finally`;
8. records partial/not-established otherwise.

DOM verifier output is never used to alter source graph nodes.

## Reconciliation

Compute:
- source mapping node count;
- source user/assistant/tool/system role counts;
- source message IDs/turn IDs when exposed;
- rendered user/assistant count;
- rendered stable/not-established;
- ID overlaps where IDs are comparable;
- ordered role/text fingerprints as a weaker fallback;
- explicit discrepancies.

A mismatch is a report result, not an automatic failure unless the relevant acceptance property requires equality.

## Bundle layout

Downloads use a capture directory such as:

```text
chatgpt-provenance/<date>-<conversation-id>/
  manifest.json
  raw/conversation.response.json
  normalized/nodes.jsonl
  normalized/edges.jsonl
  normalized/messages.jsonl
  normalized/tool-events.jsonl
  normalized/citations.jsonl
  normalized/artifacts.jsonl
  rendered/rendered-turns.jsonl
  rendered/transcript.md
  validation/reconciliation.json
  validation/capture-report.json
  integrity/SHA256SUMS.json
```

## Integrity

SHA-256 is computed over the exact UTF-8 string passed to download for each non-hash file. `SHA256SUMS.json` maps relative path -> digest + byte length.

## Persistence/resume

v0.1 captures one conversation in one run. Progress/status is persisted in `chrome.storage.local`; transcript/evidence content is not retained there after download. Pause/resume is in-memory run control with status updates. Reset aborts the active run, clears the small status record, and is safe to invoke after a failed or completed run. No remote conversation mutation is performed.

Account-wide resume is deferred to a later task.

## Permissions

- `activeTab`: popup active-tab interaction;
- `storage`: small status/progress only;
- `downloads`: local provenance files;
- host: `https://chatgpt.com/*`.

No `cookies`, `webRequest`, debugger, native messaging, or broad host scope.

## Security/privacy

- no credential export;
- access token remains in runner memory and is never included in bundle;
- no external telemetry;
- no remote code;
- no write endpoints;
- error bodies are bounded in status display and not treated as evidence.

## Failure semantics

Hard failure/no successful capture:
- wrong host;
- missing conversation ID;
- no access token;
- conversation GET failure;
- malformed JSON;
- missing/non-object mapping;
- hashing failure;
- download failure.

Warning/capture allowed:
- DOM sweep does not stabilize;
- source/rendered mismatch;
- unknown node types;
- tool classification uncertainty.

## Verification status

Tests establish deterministic behavior only. Live ChatGPT evidence states remain:
- `LIVE_SMOKE_REQUIRED`;
- `LIVE_PILOT_PASSED`;
- `LIVE_HOLDOUT_PASSED`.

Bulk export work must not begin before pilot + holdout evidence is recorded.
