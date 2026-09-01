(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.TranscriptExporterCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function hashString(value) {
    let hash = 0x811c9dc5;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function parseTurnIndex(testId) {
    const match = String(testId || "").match(/conversation-turn-(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function stableTurnKey(record) {
    const role = record.role || "unknown";
    if (record.turnId) return `turn-id:${record.turnId}:${role}`;
    if (record.testId) return `test-id:${record.testId}:${role}`;
    if (record.messageId) return `message-id:${record.messageId}:${role}`;
    const fingerprint = normalizeText(record.markdown || record.plainText || "");
    return `fallback:${role}:${hashString(fingerprint)}`;
  }

  function messageScore(record) {
    return normalizeText(record.markdown).length * 2 + normalizeText(record.plainText).length;
  }

  function mergeHarvest(target, records, firstSeenCounter) {
    let nextCounter = firstSeenCounter;
    for (const raw of records) {
      const record = { ...raw };
      record.turnIndex = Number.isFinite(record.turnIndex)
        ? record.turnIndex
        : parseTurnIndex(record.testId);
      record.key = record.key || stableTurnKey(record);
      const existing = target.get(record.key);
      if (!existing) {
        record.firstSeen = nextCounter;
        nextCounter += 1;
        target.set(record.key, record);
      } else if (messageScore(record) > messageScore(existing)) {
        target.set(record.key, { ...record, firstSeen: existing.firstSeen });
      }
    }
    return nextCounter;
  }

  function sortMessages(records) {
    return [...records].sort((a, b) => {
      const ai = Number.isFinite(a.turnIndex) ? a.turnIndex : null;
      const bi = Number.isFinite(b.turnIndex) ? b.turnIndex : null;
      if (ai !== null && bi !== null && ai !== bi) return ai - bi;
      if (ai !== null && bi === null) return -1;
      if (ai === null && bi !== null) return 1;
      return (a.firstSeen ?? 0) - (b.firstSeen ?? 0);
    });
  }

  function sameKeySet(a, b) {
    if (!a || !b || a.size !== b.size) return false;
    for (const key of a) if (!b.has(key)) return false;
    return true;
  }

  function evaluateSweepCompleteness(passKeySets) {
    if (!Array.isArray(passKeySets) || passKeySets.length < 2) return false;
    const previous = passKeySets[passKeySets.length - 2];
    const latest = passKeySets[passKeySets.length - 1];
    return latest.size > 0 && sameKeySet(previous, latest);
  }

  function sanitizeFilename(value, fallback = "chatgpt-transcript") {
    const cleaned = String(value || "")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim()
      .slice(0, 120);
    return cleaned || fallback;
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

  function markdownRole(role) {
    if (role === "user") return "User";
    if (role === "assistant") return "Assistant";
    return role ? role[0].toUpperCase() + role.slice(1) : "Unknown";
  }

  function buildMarkdown(meta, records, complete) {
    const messages = sortMessages(records);
    const title = normalizeText(meta.title) || "ChatGPT Conversation";
    const lines = [`# ${title}`, ""];
    lines.push(`- Exported: ${meta.exportedAt}`);
    lines.push(`- Source: ${meta.url}`);
    if (meta.conversationId) lines.push(`- Conversation ID: ${meta.conversationId}`);
    lines.push(`- Turns captured: ${messages.length}`);
    lines.push(`- Completeness: ${complete ? "stable full-sweep capture" : "PARTIAL / NOT ESTABLISHED"}`);
    if (!complete) {
      lines.push("");
      lines.push("> WARNING: repeated scroll sweeps did not establish a stable turn set. This export may be incomplete.");
    }
    for (const message of messages) {
      lines.push("");
      lines.push(`## ${markdownRole(message.role)}`);
      lines.push("");
      const body = normalizeText(message.markdown || message.plainText);
      lines.push(body || "[Empty rendered turn]");
    }
    lines.push("");
    return lines.join("\n");
  }

  function buildJson(meta, records, complete) {
    const messages = sortMessages(records).map((message, index) => ({
      index,
      role: message.role,
      turn_id: message.turnId || null,
      message_id: message.messageId || null,
      test_id: message.testId || null,
      turn_index: Number.isFinite(message.turnIndex) ? message.turnIndex : null,
      markdown: normalizeText(message.markdown),
      plain_text: normalizeText(message.plainText),
    }));
    return JSON.stringify(
      {
        schema_version: "custom-extensions.chatgpt-transcript.v1",
        exported_at: meta.exportedAt,
        source_url: meta.url,
        title: normalizeText(meta.title) || "ChatGPT Conversation",
        conversation_id: meta.conversationId || null,
        completeness: complete ? "stable_full_sweep" : "partial_not_established",
        message_count: messages.length,
        messages,
      },
      null,
      2,
    );
  }

  return {
    normalizeText,
    hashString,
    parseTurnIndex,
    stableTurnKey,
    mergeHarvest,
    sortMessages,
    sameKeySet,
    evaluateSweepCompleteness,
    sanitizeFilename,
    conversationIdFromUrl,
    buildMarkdown,
    buildJson,
  };
});
