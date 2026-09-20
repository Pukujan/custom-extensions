# Official ChatGPT export importer design

## Scope

This phase imports a user-provided official ChatGPT data-export ZIP locally. OpenAI documents that the export is delivered as a ZIP containing chat history and other account data, with `conversations.json` or numbered conversation JSON files for larger exports. The importer treats the ZIP as untrusted local input, never contacts ChatGPT, and never changes the source archive.

Source reference: <https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt>

## Input and source preservation

- accept a local ZIP file only through the Node CLI;
- support ZIP entries stored with method 0 or deflated with method 8;
- reject encrypted entries, unsafe paths, duplicate entry names, malformed central directories, and unsupported compression;
- identify conversation documents structurally, not only by filename: a JSON object must contain an object `mapping`, and an array must contain conversation objects with mappings;
- preserve the original ZIP byte-for-byte by copying it to the output bundle before deriving any records;
- every imported conversation carries an explicit source pointer of the form `zip-entry:<entry-name>#/items/<index>` (or `#/conversation` for a single object);
- raw source files are never rewritten as normalized JSON.

## Derived output

```text
chatgpt-provenance-official-import/<run-id>/
  manifest.json
  raw/official-export.zip
  normalized/conversations.jsonl
  normalized/nodes.jsonl
  normalized/edges.jsonl
  normalized/messages.jsonl
  normalized/tool-events.jsonl
  normalized/citations.jsonl
  normalized/artifacts.jsonl
  validation/reconciliation.json
  integrity/SHA256SUMS.json
```

Each normalized record retains the official source entry/index and the existing provenance source pointer into its conversation mapping. Unknown node fields and broad classifications follow the same versioned core used by browser captures. The imported raw ZIP remains the authoritative evidence; derived files can be regenerated.

## Reconciliation

The importer reports, without silently resolving:

- official conversation IDs missing from an optional account-export catalog;
- live/account IDs missing from the official export;
- duplicate official IDs and duplicate account IDs;
- title/create/update metadata mismatches when both sides expose a value;
- official conversations with malformed or empty mappings.

Reconciliation is a report, not a merge. A missing conversation can mean deletion, export eligibility differences, workspace boundaries, or endpoint/list timing; the importer must not infer which explanation is true.

## Integrity

- SHA-256 is computed over the original ZIP bytes and every derived UTF-8 file;
- `SHA256SUMS.json` excludes itself and maps relative paths to digest and byte length;
- the manifest records the raw archive digest, counts, schema versions, duplicate IDs, unrecognized JSON entries, and reconciliation status;
- no transcript text or raw IDs are committed to the repository's fixtures.

## Safety

- no browser permissions, ChatGPT session access, cookies, remote requests, or extension storage;
- no file deletion or overwrite of the input archive;
- output directory must be supplied explicitly and must not equal the input path;
- the CLI refuses to write outside its supplied output directory after path resolution;
- no official export is copied into Git.

## Acceptance gate

Deterministic tests must cover stored/deflated ZIP parsing, path/encryption rejection, conversation-file discovery, duplicate IDs, mapping/node conservation, source pointers, tool/source retention, reconciliation discrepancies, and SHA-256 recomputation. A real official ZIP may be imported only when the user supplies one and the task checkpoint explicitly authorizes it; until then, structural fixtures remain redacted.

