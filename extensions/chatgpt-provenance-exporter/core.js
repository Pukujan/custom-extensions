(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ChatGPTProvenanceCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = "custom-extensions.chatgpt-provenance.v1";
  const EVENT_SCHEMA_VERSION = "custom-extensions.chatgpt-provenance-event.v1";
  const CLASSIFIER_VERSION = "0.1.0";

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      return Object.keys(value)
        .sort()
        .reduce((out, key) => {
          out[key] = canonicalize(value[key]);
          return out;
        }, {});
    }
    return value;
  }

  function stableStringify(value, space = 0) {
    return JSON.stringify(canonicalize(value), null, space);
  }

  function toJsonl(records) {
    return [...records].map((record) => stableStringify(record)).join("\n") + (records.length ? "\n" : "");
  }

  function escapePointer(value) {
    return String(value).replace(/~/g, "~0").replace(/\//g, "~1");
  }

  function unescapePointer(value) {
    return String(value).replace(/~1/g, "/").replace(/~0/g, "~");
  }

  function sourcePointer(nodeId) {
    return `/mapping/${escapePointer(nodeId)}`;
  }

  function pointerNodeId(pointer) {
    const prefix = "/mapping/";
    if (!String(pointer).startsWith(prefix)) return null;
    return unescapePointer(String(pointer).slice(prefix.length));
  }

  function conversationIdFromUrl(url) {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/\/c\/([^/?#]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  function sanitizePathSegment(value, fallback = "chatgpt-conversation") {
    const cleaned = String(value || "")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim()
      .slice(0, 100);
    return cleaned || fallback;
  }

  function mappingFromConversation(conversation) {
    const mapping = conversation?.mapping;
    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
      throw new Error("Conversation payload does not contain an object mapping.");
    }
    const keys = Object.keys(mapping);
    if (!keys.length) throw new Error("Conversation mapping is empty.");
    return mapping;
  }

  function messageOf(node) {
    return node && typeof node === "object" && node.message && typeof node.message === "object"
      ? node.message
      : null;
  }

  function contentTypeOf(message) {
    const type = message?.content?.content_type;
    return typeof type === "string" ? type : null;
  }

  function textFromContent(content) {
    if (!content || typeof content !== "object") return "";
    if (Array.isArray(content.parts)) {
      return normalizeText(
        content.parts
          .map((part) => {
            if (typeof part === "string") return part;
            if (part === null || part === undefined) return "";
            return stableStringify(part);
          })
          .join("\n"),
      );
    }
    if (typeof content.text === "string") return normalizeText(content.text);
    return "";
  }

  function containsKey(value, candidates) {
    if (!value || typeof value !== "object") return false;
    const wanted = new Set(candidates.map((x) => String(x).toLowerCase()));
    const stack = [value];
    const seen = new Set();
    while (stack.length) {
      const current = stack.pop();
      if (!current || typeof current !== "object" || seen.has(current)) continue;
      seen.add(current);
      for (const [key, child] of Object.entries(current)) {
        if (wanted.has(String(key).toLowerCase())) return true;
        if (child && typeof child === "object") stack.push(child);
      }
    }
    return false;
  }

  function classifyNode(node) {
    const message = messageOf(node);
    if (!message) {
      if (containsKey(node, ["status", "progress", "execution_status"])) return "execution.status";
      return "unknown";
    }

    const role = String(message?.author?.role || "").toLowerCase();
    const authorName = String(message?.author?.name || "").toLowerCase();
    const recipient = String(message?.recipient || "").toLowerCase();
    const contentType = String(contentTypeOf(message) || "").toLowerCase();
    const metadata = message?.metadata || {};

    const toolCallMarker =
      (role === "assistant" && recipient && recipient !== "all" && recipient !== "none") ||
      /tool.*call|function.*call|computer.*call/.test(contentType) ||
      containsKey(message, ["tool_call_id", "function_call", "tool_calls"]);

    const toolResultMarker =
      role === "tool" ||
      /tool.*result|tool.*output|computer.*output|function.*result/.test(contentType) ||
      containsKey(message, ["tool_result", "tool_output"]);

    if (toolCallMarker) return "tool.call";
    if (toolResultMarker) return "tool.result";
    if (/browser|computer/.test(authorName) || /browser|computer/.test(contentType)) {
      return "browser.activity";
    }
    if (
      containsKey(metadata, ["citations", "citation", "content_references"]) ||
      /citation|reference/.test(contentType)
    ) {
      return "citation";
    }
    if (
      containsKey(message, ["attachment", "attachments"]) ||
      /attachment/.test(contentType)
    ) {
      return "attachment";
    }
    if (
      containsKey(message, ["artifact", "artifact_id", "file_id"]) ||
      /artifact|file/.test(contentType)
    ) {
      return "artifact";
    }
    if (/status|progress/.test(contentType) || containsKey(message, ["execution_status", "progress"])) {
      return "execution.status";
    }
    if (role === "user") return "message.user";
    if (role === "assistant") return "message.assistant";
    if (role === "system") return "message.system";
    if (role === "tool") return "message.tool";
    return "unknown";
  }

  function normalizeConversation(conversation) {
    const mapping = mappingFromConversation(conversation);
    const nodeIds = Object.keys(mapping).sort();
    const nodes = nodeIds.map((nodeId) => {
      const rawNode = mapping[nodeId];
      const message = messageOf(rawNode);
      return {
        schema_version: EVENT_SCHEMA_VERSION,
        classifier_version: CLASSIFIER_VERSION,
        node_id: nodeId,
        parent: rawNode?.parent ?? null,
        children: Array.isArray(rawNode?.children) ? [...rawNode.children] : [],
        class: classifyNode(rawNode),
        message_id: message?.id ?? null,
        author_role: message?.author?.role ?? null,
        author_name: message?.author?.name ?? null,
        recipient: message?.recipient ?? null,
        content_type: contentTypeOf(message),
        create_time: message?.create_time ?? rawNode?.create_time ?? null,
        update_time: message?.update_time ?? rawNode?.update_time ?? null,
        source_pointer: sourcePointer(nodeId),
        raw_node: rawNode,
      };
    });

    const edgeSet = new Set();
    const edges = [];
    function addEdge(from, to, evidence) {
      if (!from || !to) return;
      const key = `${from}\u0000${to}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      edges.push({
        from: String(from),
        to: String(to),
        evidence,
      });
    }

    for (const record of nodes) {
      if (record.parent) addEdge(record.parent, record.node_id, "parent");
      for (const child of record.children) addEdge(record.node_id, child, "children");
    }
    edges.sort((a, b) => {
      const from = a.from.localeCompare(b.from);
      return from || a.to.localeCompare(b.to);
    });

    return { nodes, edges };
  }

  function deriveMessages(nodes) {
    return nodes
      .filter((node) => node.raw_node?.message)
      .map((node) => {
        const message = node.raw_node.message;
        return {
          schema_version: EVENT_SCHEMA_VERSION,
          node_id: node.node_id,
          message_id: node.message_id,
          class: node.class,
          author_role: node.author_role,
          author_name: node.author_name,
          recipient: node.recipient,
          content_type: node.content_type,
          create_time: node.create_time,
          update_time: node.update_time,
          text: textFromContent(message.content),
          source_pointer: node.source_pointer,
          raw_message: message,
        };
      });
  }

  function deriveToolEvents(nodes) {
    return nodes
      .filter((node) => ["tool.call", "tool.result", "message.tool"].includes(node.class))
      .map((node) => {
        const message = node.raw_node?.message || {};
        return {
          schema_version: EVENT_SCHEMA_VERSION,
          classifier_version: CLASSIFIER_VERSION,
          event_class: node.class,
          node_id: node.node_id,
          message_id: node.message_id,
          parent: node.parent,
          children: node.children,
          author_role: node.author_role,
          author_name: node.author_name,
          recipient: node.recipient,
          content_type: node.content_type,
          create_time: node.create_time,
          source_pointer: node.source_pointer,
          content: message.content ?? null,
          metadata: message.metadata ?? null,
          raw_node: node.raw_node,
        };
      });
  }

  function deriveCitations(nodes) {
    const out = [];
    for (const node of nodes) {
      const metadata = node.raw_node?.message?.metadata;
      if (!metadata || typeof metadata !== "object") continue;
      for (const key of ["citations", "content_references", "citation"]) {
        if (!(key in metadata)) continue;
        out.push({
          schema_version: EVENT_SCHEMA_VERSION,
          node_id: node.node_id,
          message_id: node.message_id,
          source_pointer: node.source_pointer,
          field: key,
          value: metadata[key],
        });
      }
    }
    return out;
  }

  function deriveArtifacts(nodes) {
    const out = [];
    for (const node of nodes) {
      const message = node.raw_node?.message;
      if (!message) continue;
      const candidates = [];
      for (const [owner, value] of [
        ["metadata", message.metadata],
        ["content", message.content],
      ]) {
        if (!value || typeof value !== "object") continue;
        for (const key of ["attachments", "attachment", "artifact", "artifacts", "file_id", "files"]) {
          if (key in value) candidates.push({ owner, key, value: value[key] });
        }
      }
      for (const item of candidates) {
        out.push({
          schema_version: EVENT_SCHEMA_VERSION,
          node_id: node.node_id,
          message_id: node.message_id,
          source_pointer: node.source_pointer,
          ...item,
        });
      }
    }
    return out;
  }

  function renderedStableKey(record) {
    const role = record.role || "unknown";
    if (record.turnId) return `turn-id:${record.turnId}:${role}`;
    if (record.messageId) return `message-id:${record.messageId}:${role}`;
    if (record.testId) return `test-id:${record.testId}:${role}`;
    return `fallback:${role}:${simpleHash(record.plainText || "")}`;
  }

  function simpleHash(value) {
    let hash = 0x811c9dc5;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function mergeRenderedRecords(target, records, firstSeenCounter = 0) {
    let next = firstSeenCounter;
    for (const raw of records) {
      const record = { ...raw };
      record.key = record.key || renderedStableKey(record);
      const existing = target.get(record.key);
      if (!existing) {
        record.firstSeen = next++;
        target.set(record.key, record);
      } else if (normalizeText(record.plainText).length > normalizeText(existing.plainText).length) {
        target.set(record.key, { ...record, firstSeen: existing.firstSeen });
      }
    }
    return next;
  }

  function sameKeySet(a, b) {
    if (!a || !b || a.size !== b.size) return false;
    for (const key of a) if (!b.has(key)) return false;
    return true;
  }

  function evaluateRenderedStability(passSets) {
    if (!Array.isArray(passSets) || passSets.length < 2) return false;
    const previous = passSets[passSets.length - 2];
    const latest = passSets[passSets.length - 1];
    return latest.size > 0 && sameKeySet(previous, latest);
  }

  function sortRendered(records) {
    return [...records].sort((a, b) => {
      const ai = Number.isFinite(a.turnIndex) ? a.turnIndex : null;
      const bi = Number.isFinite(b.turnIndex) ? b.turnIndex : null;
      if (ai !== null && bi !== null && ai !== bi) return ai - bi;
      if (ai !== null && bi === null) return -1;
      if (ai === null && bi !== null) return 1;
      return (a.firstSeen ?? 0) - (b.firstSeen ?? 0);
    });
  }

  function sourceRoleCounts(nodes) {
    const counts = {};
    for (const node of nodes) {
      const role = node.author_role || "none";
      counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
  }

  function reconciliationReport(nodes, renderedRecords, renderedStable) {
    const rendered = sortRendered(renderedRecords);
    const sourceMessages = nodes.filter((node) =>
      ["user", "assistant"].includes(String(node.author_role || "").toLowerCase()),
    );
    const sourceIds = new Set(sourceMessages.map((x) => x.message_id).filter(Boolean));
    const renderedIds = new Set(rendered.map((x) => x.messageId).filter(Boolean));
    let idOverlap = 0;
    for (const id of renderedIds) if (sourceIds.has(id)) idOverlap += 1;

    const sourceRoleCount = { user: 0, assistant: 0 };
    for (const node of sourceMessages) {
      const role = String(node.author_role).toLowerCase();
      sourceRoleCount[role] += 1;
    }
    const renderedRoleCount = { user: 0, assistant: 0 };
    for (const item of rendered) {
      if (item.role in renderedRoleCount) renderedRoleCount[item.role] += 1;
    }

    const discrepancies = [];
    for (const role of ["user", "assistant"]) {
      if (sourceRoleCount[role] !== renderedRoleCount[role]) {
        discrepancies.push({
          type: "role_count_mismatch",
          role,
          source: sourceRoleCount[role],
          rendered: renderedRoleCount[role],
        });
      }
    }
    if (!renderedStable) {
      discrepancies.push({ type: "rendered_sweep_not_stable" });
    }

    return {
      schema_version: SCHEMA_VERSION,
      source_node_count: nodes.length,
      source_role_counts: sourceRoleCounts(nodes),
      source_user_assistant_counts: sourceRoleCount,
      rendered_turn_count: rendered.length,
      rendered_user_assistant_counts: renderedRoleCount,
      rendered_stable: Boolean(renderedStable),
      comparable_source_message_ids: sourceIds.size,
      comparable_rendered_message_ids: renderedIds.size,
      message_id_overlap: idOverlap,
      discrepancies,
      status: discrepancies.length ? "differences_observed" : "no_differences_observed",
    };
  }

  function buildRenderedTranscript(meta, renderedRecords, stable) {
    const rendered = sortRendered(renderedRecords);
    const lines = [
      `# ${normalizeText(meta.title) || "ChatGPT Conversation"}`,
      "",
      `- Conversation ID: ${meta.conversationId || "unknown"}`,
      `- Source: ${meta.url || ""}`,
      `- Captured: ${meta.capturedAt || ""}`,
      `- Rendered turns captured: ${rendered.length}`,
      `- Rendered sweep: ${stable ? "stable" : "PARTIAL / NOT ESTABLISHED"}`,
    ];
    if (!stable) {
      lines.push("", "> WARNING: the rendered DOM sweep did not establish a stable turn set.");
    }
    for (const item of rendered) {
      lines.push("", `## ${item.role === "user" ? "User" : "Assistant"}`, "", normalizeText(item.plainText));
    }
    lines.push("");
    return lines.join("\n");
  }

  function captureReport(meta, graph, messages, tools, citations, artifacts, reconciliation) {
    return {
      schema_version: SCHEMA_VERSION,
      capture_id: meta.captureId,
      captured_at: meta.capturedAt,
      conversation_id: meta.conversationId,
      source_url: meta.url,
      title: meta.title,
      source_adapter: "authenticated_chatgpt_conversation_get",
      classifier_version: CLASSIFIER_VERSION,
      counts: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        messages: messages.length,
        tool_events: tools.length,
        citations: citations.length,
        artifacts: artifacts.length,
      },
      reconciliation_status: reconciliation.status,
      rendered_stable: reconciliation.rendered_stable,
      limitations: [
        "Completeness is asserted only relative to the acquired ChatGPT conversation representation and verifier checks.",
        "The bundle does not claim access to private server-side execution, hidden chain-of-thought, or transient events not persisted/exposed to the browser session.",
        "Broad event classifications are interpretations over immutable raw evidence and may evolve in later ontology versions.",
      ],
    };
  }

  return {
    SCHEMA_VERSION,
    EVENT_SCHEMA_VERSION,
    CLASSIFIER_VERSION,
    normalizeText,
    canonicalize,
    stableStringify,
    toJsonl,
    sourcePointer,
    pointerNodeId,
    conversationIdFromUrl,
    sanitizePathSegment,
    mappingFromConversation,
    textFromContent,
    classifyNode,
    normalizeConversation,
    deriveMessages,
    deriveToolEvents,
    deriveCitations,
    deriveArtifacts,
    renderedStableKey,
    mergeRenderedRecords,
    sameKeySet,
    evaluateRenderedStability,
    sortRendered,
    reconciliationReport,
    buildRenderedTranscript,
    captureReport,
  };
});
