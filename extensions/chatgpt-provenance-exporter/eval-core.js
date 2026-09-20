(function (root, factory) {
  const api = factory(root?.ChatGPTProvenanceCore || null);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ChatGPTProvenanceEvalCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  const TRACE_SCHEMA_VERSION = "custom-extensions.chatgpt-provenance-eval-trace.v1";

  function assertCore() {
    if (!core) throw new Error("ChatGPT provenance core is required.");
    return core;
  }

  function spanId(nodeId) {
    return `node:${String(nodeId)}`;
  }

  function contentOf(node) {
    return node?.raw_node?.message?.content ?? null;
  }

  function sourceSpan(node) {
    const role = String(node.author_role || "").toLowerCase();
    const input = node.class === "tool.call" || role === "user" ? contentOf(node) : null;
    const output = node.class === "tool.result" || node.class === "message.assistant" || role === "assistant"
      ? contentOf(node)
      : null;
    return {
      span_id: spanId(node.node_id),
      parent_span_id: node.parent ? spanId(node.parent) : null,
      kind: node.class,
      name: node.class,
      input,
      output,
      attributes: {
        author_role: node.author_role,
        author_name: node.author_name,
        content_type: node.content_type,
        message_id: node.message_id,
      },
      source_pointer: node.source_pointer,
      raw_source: {
        file: "raw/conversation.response.json",
        pointer: node.source_pointer,
      },
    };
  }

  function liveSpan(event) {
    const sequence = Number(event?.sequence);
    if (!Number.isInteger(sequence) || sequence < 1) throw new Error("Live event sequence is invalid.");
    return {
      span_id: `live:${sequence}`,
      parent_span_id: null,
      kind: "event",
      name: `live.${event.transport || "unknown"}`,
      input: event.request_body ?? null,
      output: event.response_body ?? null,
      attributes: {
        path: event.path || null,
        request_method: event.request_method || null,
        status: event.status ?? null,
        source_hints: Array.isArray(event.source_hints) ? [...event.source_hints] : [],
        unmatched_live_event: true,
      },
      source_pointer: null,
      raw_source: null,
    };
  }

  function buildTrace(input) {
    const c = assertCore();
    const graph = input?.graph || { nodes: [], edges: [] };
    const nodes = [...(graph.nodes || [])].sort((a, b) => String(a.node_id).localeCompare(String(b.node_id)));
    const liveEvents = [...(input?.liveEvents || [])].sort((a, b) => Number(a.sequence) - Number(b.sequence));
    const spans = [...nodes.map(sourceSpan), ...liveEvents.map(liveSpan)];
    return {
      schema_version: TRACE_SCHEMA_VERSION,
      trace_id: String(input?.traceId || "unknown-trace"),
      source_schema_version: c.SCHEMA_VERSION,
      source_node_count: nodes.length,
      source_tool_event_count: Array.isArray(input?.tools) ? input.tools.length : 0,
      live_event_count: liveEvents.length,
      spans,
    };
  }

  function validateTrace(trace, graph, tools) {
    const sourceNodes = [...(graph?.nodes || [])].sort((a, b) => String(a.node_id).localeCompare(String(b.node_id)));
    const sourceTools = Array.isArray(tools) ? tools : [];
    const spans = Array.isArray(trace?.spans) ? trace.spans : [];
    const sourceSpans = spans.filter((span) => span.raw_source);
    const liveSpans = spans.filter((span) => !span.raw_source);
    const expectedIds = sourceNodes.map((node) => spanId(node.node_id));
    const actualIds = sourceSpans.map((span) => span.span_id);
    const sourceIdSet = new Set(expectedIds);
    const duplicateSpanIds = actualIds.filter((id, index) => actualIds.indexOf(id) !== index);
    const missingSpans = expectedIds.filter((id) => !actualIds.includes(id));
    const extraSpans = actualIds.filter((id) => !sourceIdSet.has(id));
    const parentDiscrepancies = [];
    for (const node of sourceNodes) {
      const span = sourceSpans.find((candidate) => candidate.span_id === spanId(node.node_id));
      if (!span) continue;
      if (span.source_pointer !== node.source_pointer) parentDiscrepancies.push({ type: "source_pointer_mismatch", node_id: node.node_id });
      const expectedParent = node.parent ? spanId(node.parent) : null;
      if (span.parent_span_id !== expectedParent) parentDiscrepancies.push({ type: "parent_mismatch", node_id: node.node_id });
      if (node.parent && !sourceIdSet.has(expectedParent)) parentDiscrepancies.push({ type: "missing_parent_span", node_id: node.node_id, parent: node.parent });
    }
    const expectedToolIds = new Set(sourceTools.map((tool) => spanId(tool.node_id)));
    const actualToolSpans = sourceSpans.filter((span) => expectedToolIds.has(span.span_id));
    const liveSequence = liveSpans.map((span) => Number(String(span.span_id).slice(5)));
    const liveSequenceUnique = new Set(liveSequence).size === liveSequence.length;
    const discrepancies = [];
    if (duplicateSpanIds.length) discrepancies.push({ type: "duplicate_source_spans", ids: duplicateSpanIds });
    if (missingSpans.length) discrepancies.push({ type: "missing_source_spans", ids: missingSpans });
    if (extraSpans.length) discrepancies.push({ type: "extra_source_spans", ids: extraSpans });
    discrepancies.push(...parentDiscrepancies);
    if (actualToolSpans.length !== sourceTools.length) {
      discrepancies.push({ type: "tool_span_count_mismatch", source: sourceTools.length, trace: actualToolSpans.length });
    }
    if (!liveSequenceUnique) discrepancies.push({ type: "duplicate_live_sequences" });
    for (const span of liveSpans) {
      if (span.attributes?.unmatched_live_event !== true || span.source_pointer !== null) {
        discrepancies.push({ type: "live_span_not_explicitly_unmatched", span_id: span.span_id });
      }
    }
    return {
      schema_version: TRACE_SCHEMA_VERSION,
      source_nodes: sourceNodes.length,
      trace_source_spans: sourceSpans.length,
      source_tools: sourceTools.length,
      trace_tool_spans: actualToolSpans.length,
      live_events: liveSpans.length,
      discrepancies,
      status: discrepancies.length ? "differences_observed" : "no_differences_observed",
    };
  }

  return { TRACE_SCHEMA_VERSION, spanId, buildTrace, validateTrace };
});

