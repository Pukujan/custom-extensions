(function (root, factory) {
  const api = factory(root?.ChatGPTProvenanceCore || null);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ChatGPTProvenanceOfficialCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  const OFFICIAL_SCHEMA_VERSION = "custom-extensions.chatgpt-provenance-official-import.v1";

  function assertCore() {
    if (!core) throw new Error("ChatGPT provenance core is required.");
    return core;
  }

  function safeEntryName(name) {
    const normalized = String(name || "").replace(/\\/g, "/");
    if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
      throw new Error(`Unsafe ZIP entry name: ${name}`);
    }
    const parts = normalized.split("/");
    if (parts.some((part) => part === ".." || /[\u0000-\u001f]/.test(part))) {
      throw new Error(`Unsafe ZIP entry name: ${name}`);
    }
    return normalized;
  }

  function pointerEscape(value) {
    return String(value).replace(/~/g, "~0").replace(/\//g, "~1");
  }

  function sourcePointer(entryName, kind, index = null) {
    const suffix = kind === "array" ? `/items/${index}` : "/conversation";
    return `zip-entry:${pointerEscape(safeEntryName(entryName))}#${suffix}`;
  }

  function isMappingObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value) && value.mapping &&
      typeof value.mapping === "object" && !Array.isArray(value.mapping));
  }

  function parseJsonEntry(entry) {
    const name = safeEntryName(entry.name);
    if (!/\.json$/i.test(name)) return null;
    const text = typeof entry.text === "string" ? entry.text : Buffer.from(entry.bytes || []).toString("utf8");
    try {
      return { name, text, value: JSON.parse(text) };
    } catch (error) {
      return { name, text, value: null, error: `invalid JSON: ${error?.message || error}` };
    }
  }

  function discoverConversations(entries) {
    const conversations = [];
    const documents = [];
    const unrecognizedJson = [];
    const invalidDocuments = [];
    const duplicateIds = [];
    const seenIds = new Set();

    for (const rawEntry of Array.isArray(entries) ? entries : []) {
      const parsed = parseJsonEntry(rawEntry);
      if (!parsed) continue;
      if (parsed.error) {
        invalidDocuments.push({ entry: parsed.name, error: parsed.error });
        continue;
      }

      const candidates = [];
      let kind = "ignored";
      if (Array.isArray(parsed.value)) {
        kind = "array";
        parsed.value.forEach((value, index) => {
          if (isMappingObject(value)) candidates.push({ value, index, pointer: sourcePointer(parsed.name, "array", index) });
        });
      } else if (isMappingObject(parsed.value)) {
        kind = "object";
        candidates.push({ value: parsed.value, index: null, pointer: sourcePointer(parsed.name, "object") });
      } else if (Array.isArray(parsed.value?.conversations)) {
        kind = "conversations-property";
        parsed.value.conversations.forEach((value, index) => {
          if (isMappingObject(value)) candidates.push({ value, index, pointer: sourcePointer(parsed.name, "array", index) });
        });
      }

      if (!candidates.length) {
        if (kind !== "ignored") unrecognizedJson.push({ entry: parsed.name, reason: "no conversation mapping objects found" });
        else unrecognizedJson.push({ entry: parsed.name, reason: "JSON entry is not a conversation document" });
        continue;
      }

      documents.push({ entry: parsed.name, kind, candidate_count: candidates.length });
      for (const candidate of candidates) {
        const id = typeof candidate.value.id === "string" && candidate.value.id
          ? candidate.value.id
          : `${parsed.name}#${candidate.index ?? "conversation"}`;
        if (seenIds.has(id)) duplicateIds.push({ id, source_pointer: candidate.pointer });
        seenIds.add(id);
        conversations.push({
          id,
          title: typeof candidate.value.title === "string" ? candidate.value.title : "",
          create_time: candidate.value.create_time ?? null,
          update_time: candidate.value.update_time ?? null,
          source_pointer: candidate.pointer,
          source_entry: parsed.name,
          source_index: candidate.index,
          conversation: candidate.value,
        });
      }
    }

    return { conversations, documents, unrecognizedJson, invalidDocuments, duplicateIds };
  }

  function deriveConversation(record) {
    const c = assertCore();
    try {
      const graph = c.normalizeConversation(record.conversation);
      const messages = c.deriveMessages(graph.nodes);
      const tools = c.deriveToolEvents(graph.nodes);
      const citations = c.deriveCitations(graph.nodes);
      const artifacts = c.deriveArtifacts(graph.nodes);
      return {
        ok: true,
        id: record.id,
        title: record.title,
        create_time: record.create_time,
        update_time: record.update_time,
        source_pointer: record.source_pointer,
        source_entry: record.source_entry,
        source_index: record.source_index,
        graph,
        messages,
        tools,
        citations,
        artifacts,
        counts: {
          nodes: graph.nodes.length,
          edges: graph.edges.length,
          messages: messages.length,
          tool_events: tools.length,
          citations: citations.length,
          artifacts: artifacts.length,
        },
      };
    } catch (error) {
      return {
        ok: false,
        id: record.id,
        title: record.title,
        source_pointer: record.source_pointer,
        source_entry: record.source_entry,
        source_index: record.source_index,
        error: String(error?.message || error).slice(0, 400),
      };
    }
  }

  function normalizeCatalog(catalog) {
    const values = Array.isArray(catalog) ? catalog : Array.isArray(catalog?.conversations) ? catalog.conversations : [];
    return values
      .filter((item) => item && typeof item.id === "string" && item.id)
      .map((item) => ({
        id: item.id,
        title: typeof item.title === "string" ? item.title : "",
        create_time: item.create_time ?? null,
        update_time: item.update_time ?? null,
      }));
  }

  function reconciliation(records, catalog) {
    const official = Array.isArray(records) ? records : [];
    if (catalog === undefined || catalog === null) {
      return {
        schema_version: OFFICIAL_SCHEMA_VERSION,
        official_count: official.length,
        account_count: null,
        matched_count: null,
        official_only: [],
        account_only: [],
        duplicate_official_ids: [],
        duplicate_account_ids: [],
        metadata_mismatches: [],
        discrepancies: [],
        status: "not_comparable",
      };
    }
    const live = normalizeCatalog(catalog);
    const officialById = new Map();
    const liveById = new Map();
    const duplicateOfficial = [];
    const duplicateLive = [];
    for (const item of official) {
      if (officialById.has(item.id)) duplicateOfficial.push(item.id);
      else officialById.set(item.id, item);
    }
    for (const item of live) {
      if (liveById.has(item.id)) duplicateLive.push(item.id);
      else liveById.set(item.id, item);
    }

    const officialOnly = [];
    const liveOnly = [];
    const metadataMismatches = [];
    const matched = [];
    for (const [id, item] of officialById) {
      const counterpart = liveById.get(id);
      if (!counterpart) {
        officialOnly.push(id);
        continue;
      }
      const fields = {};
      for (const field of ["title", "create_time", "update_time"]) {
        if (item[field] !== null && counterpart[field] !== null && item[field] !== counterpart[field]) {
          fields[field] = { official: item[field], account: counterpart[field] };
        }
      }
      if (Object.keys(fields).length) metadataMismatches.push({ id, fields });
      else matched.push(id);
    }
    for (const id of liveById.keys()) if (!officialById.has(id)) liveOnly.push(id);

    const discrepancies = [];
    if (duplicateOfficial.length) discrepancies.push({ type: "duplicate_official_ids", ids: [...duplicateOfficial] });
    if (duplicateLive.length) discrepancies.push({ type: "duplicate_account_ids", ids: [...duplicateLive] });
    if (officialOnly.length) discrepancies.push({ type: "official_only", ids: [...officialOnly] });
    if (liveOnly.length) discrepancies.push({ type: "account_only", ids: [...liveOnly] });
    if (metadataMismatches.length) discrepancies.push({ type: "metadata_mismatch", items: metadataMismatches });

    return {
      schema_version: OFFICIAL_SCHEMA_VERSION,
      official_count: official.length,
      account_count: live.length,
      matched_count: matched.length,
      official_only: officialOnly,
      account_only: liveOnly,
      duplicate_official_ids: [...duplicateOfficial],
      duplicate_account_ids: [...duplicateLive],
      metadata_mismatches: metadataMismatches,
      discrepancies,
      status: discrepancies.length ? "differences_observed" : "no_differences_observed",
    };
  }

  return {
    OFFICIAL_SCHEMA_VERSION,
    safeEntryName,
    sourcePointer,
    isMappingObject,
    parseJsonEntry,
    discoverConversations,
    deriveConversation,
    normalizeCatalog,
    reconciliation,
  };
});
