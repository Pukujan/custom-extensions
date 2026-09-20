# Account-wide incremental export design

## Scope

This design adds a read-only, resumable account-wide exporter after the single-conversation pilot and independent holdout have passed. It does not start an export and it does not replace the single-conversation capture path.

The account exporter archives the authenticated conversation representation exposed by ChatGPT. It produces raw response evidence plus deterministic graph-derived records. It does not claim rendered-DOM coverage for every account conversation, and it does not claim access to hidden or transient execution state.

## Runtime stages

```text
enumerate conversation summaries
        |
        v
freeze ordered unique conversation-id queue
        |
        v
fetch one conversation detail -> preserve response text -> derive records
        |
        v
download deterministic per-conversation files -> persist checkpoint
        |
        v
write final account manifest/integrity index
```

The queue is frozen before detail export begins. This prevents a changing sidebar order from silently changing the meaning of an in-progress run. A resumed run never re-enumerates or reorders an existing queue.

## Enumeration contract

- endpoint: `GET /backend-api/conversations?offset=<offset>&limit=100&order=updated`;
- authentication: the signed-in `/api/auth/session` access token, retained only in runner memory;
- page order is retained as returned by ChatGPT;
- duplicate IDs are removed by first occurrence;
- an empty page, a short page, or reaching the reported total closes enumeration;
- a full page with no new IDs, a page-count limit, malformed page shape, or an inconsistent reported total fails closed;
- the frozen queue records `id`, title, create/update times, and original ordinal only; response bodies are never stored in `chrome.storage.local`;
- the queue fingerprint is deterministic and is recorded in the account manifest.

The server list is a moving target. The exporter therefore reports the observed `reported_total`, `listed_items`, and `unique_ids`; it does not convert those counts into a stronger completeness claim. A later run can be compared with the prior manifest.

## Checkpoint contract

The only durable runner state is a small `chrome.storage.local` record:

- `schema_version` and `run_id`;
- `status`: `ready`, `enumerating`, `queued`, `running`, `paused`, `cancelled`, `done`, or `error`;
- frozen queue IDs and summary metadata;
- enumeration page/offset counters;
- `next_index`, completed IDs, bounded failure records, and last error;
- output directory and timestamps.

Raw responses, normalized records, access tokens, and transcript text are never placed in extension storage. Each conversation is considered complete only after all deterministic files for that conversation have been accepted by the download adapter and the checkpoint is durably advanced.

State writes are serialized. Reset marks the active run cancelled, aborts its request, and writes a fresh `ready` state after the old run can no longer commit. Pause takes effect at request and conversation boundaries; resume continues the frozen queue. Closing the popup does not stop the runner.

## Per-conversation output

The account directory is deterministic and separate from single-capture directories:

```text
chatgpt-provenance-account/<run-id>/
  manifest.json
  catalog/conversations.jsonl
  conversations/<conversation-id>/raw/conversation.response.json
  conversations/<conversation-id>/normalized/nodes.jsonl
  conversations/<conversation-id>/normalized/edges.jsonl
  conversations/<conversation-id>/normalized/messages.jsonl
  conversations/<conversation-id>/normalized/tool-events.jsonl
  conversations/<conversation-id>/normalized/citations.jsonl
  conversations/<conversation-id>/normalized/artifacts.jsonl
  conversations/<conversation-id>/validation/conversation-report.json
  integrity/SHA256SUMS.json
```

The raw response is read as text before JSON parsing. The raw file is byte-for-byte the response text passed to the download adapter. Derived records retain source pointers and complete `raw_node` values through the existing core. A per-conversation report records source node, edge, message, tool, citation, and artifact counts plus SHA-256 values for that conversation's raw and derived files. The account-level `SHA256SUMS.json` hashes the account manifest/catalog and enumerates the per-conversation reports; each report is the integrity index for its own evidence files. Rendered transcript files are intentionally absent from account-wide output; rendered verification remains a single-conversation operation.

## Retry and failure semantics

- retry only transient `429` and `5xx` responses, with bounded exponential backoff;
- retrying a conversation overwrites the same deterministic paths rather than creating ` (1)` duplicates;
- a non-transient error records a bounded failure and pauses the run; it never advances `next_index` past the failed conversation;
- reset/cancel does not claim completion and never deletes already downloaded evidence;
- a malformed response or missing mapping is a hard failure for that conversation and requires operator resume/reset after inspection;
- no POST, PATCH, PUT, or DELETE endpoint is used.

## Acceptance gate

Before any live account-wide run:

1. deterministic tests cover queue construction, pagination termination/drift, checkpoint conservation, pause/reset race protection, stable paths, raw-before-parse handling, source-pointer derivation, and no-write endpoint policy;
2. repository-wide tests pass;
3. a small controlled account smoke run is performed only after the task checkpoint explicitly authorizes it;
4. the account manifest and integrity index reconcile completed IDs, downloaded paths, and SHA-256 values.
