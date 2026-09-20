# Eval Lab trace compatibility design

## Scope and claim boundary

The repository does not contain a pinned external Eval Lab trace schema or an authorized endpoint. This phase therefore defines a versioned, portable trace adapter over the provenance ontology. It is intentionally not described as native Eval Lab integration until an external schema and validator are supplied.

The adapter is deterministic, local-only, and source-preserving. It converts immutable normalized nodes/edges/tool events into trace spans while retaining the original provenance source pointer and raw-node reference. It never changes the raw capture or sends a trace to a remote service.

## Trace envelope

```json
{
  "schema_version": "custom-extensions.chatgpt-provenance-eval-trace.v1",
  "trace_id": "capture-id",
  "source_schema_version": "custom-extensions.chatgpt-provenance.v1",
  "spans": [
    {
      "span_id": "mapping-node-id",
      "parent_span_id": "parent-node-id-or-null",
      "kind": "message|tool.call|tool.result|event",
      "name": "conservative-class",
      "input": "source-backed content or null",
      "output": "source-backed content or null",
      "attributes": {"author_role": "...", "content_type": "..."},
      "source_pointer": "/mapping/...",
      "raw_source": {"file": "raw/conversation.response.json", "pointer": "/mapping/..."}
    }
  ]
}
```

`span_id` is the source mapping node ID after deterministic escaping. Parent spans are only emitted when the source parent exists in the mapping. Tool input/output remains the complete source-derived content object; no guessed function name or argument schema is introduced. Live client events can be appended as `kind: event` records with `source_pointer: null` and an explicit `unmatched_live_event` attribute.

## Conservation and validation

The adapter validator requires:

- exactly one span for each normalized source node;
- unique span IDs and resolvable source pointers;
- parent/span relationships to agree with source nodes;
- tool span counts to equal source tool-event counts;
- unknown classes to remain unknown;
- live-only events to remain visibly unmatched;
- deterministic ordering by source node ID, then live sequence;
- no raw transcript mutation or remote transport.

This is an interchange adapter. A future native Eval Lab adapter may map these fields to a target schema, but must preserve `trace_id`, `span_id`, `source_pointer`, and the raw-source reference.

