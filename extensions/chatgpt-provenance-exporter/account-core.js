(function (root, factory) {
  const api = factory(root?.ChatGPTProvenanceCore || null);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ChatGPTProvenanceAccountCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  const ACCOUNT_SCHEMA_VERSION = "custom-extensions.chatgpt-provenance-account.v1";
  const PAGE_LIMIT = 100;
  const MAX_PAGES = 5000;
  const MAX_FAILURES = 100;

  function assertCore() {
    if (!core) throw new Error("ChatGPT provenance core is required.");
    return core;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeSummary(item, ordinal) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id) return null;
    return {
      id: item.id,
      title: typeof item.title === "string" ? item.title : "",
      create_time: item.create_time ?? null,
      update_time: item.update_time ?? null,
      ordinal: Number.isInteger(ordinal) && ordinal >= 0 ? ordinal : null,
    };
  }

  function makeEnumerationState(limit = PAGE_LIMIT) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : PAGE_LIMIT;
    return {
      status: "enumerating",
      limit: safeLimit,
      page: 0,
      offset: 0,
      listedItems: 0,
      reportedTotal: null,
      summaries: [],
      seenIds: [],
      lastPageFingerprint: null,
      complete: false,
      error: null,
    };
  }

  function pageFingerprint(items) {
    const ids = items.map((item) => item?.id ?? null);
    return JSON.stringify(ids);
  }

  function normalizePage(data, limit = PAGE_LIMIT) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Conversation list response was not an object.");
    }
    if (!Array.isArray(data.items)) throw new Error("Conversation list response has no items array.");
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : PAGE_LIMIT;
    if (data.items.length > safeLimit) throw new Error("Conversation list page exceeded the requested limit.");
    const items = data.items.map((item, index) => normalizeSummary(item, index));
    if (items.some((item) => item === null)) throw new Error("Conversation list contained an item without a usable ID.");
    let total = null;
    if (data.total !== undefined && data.total !== null) {
      total = Number(data.total);
      if (!Number.isInteger(total) || total < 0) throw new Error("Conversation list total was invalid.");
    }
    return { items, total };
  }

  function applyPage(previous, data) {
    const current = clone(previous || makeEnumerationState());
    if (current.complete) throw new Error("Conversation enumeration is already complete.");
    if (current.page >= MAX_PAGES) throw new Error("Conversation enumeration exceeded the page limit.");

    const { items, total } = normalizePage(data, current.limit);
    if (current.page === 0 && current.offset !== 0) throw new Error("Initial enumeration offset was not zero.");
    if (total !== null && current.reportedTotal !== null && total !== current.reportedTotal) {
      throw new Error("Conversation list total changed during enumeration.");
    }
    if (total !== null) current.reportedTotal = total;

    const fingerprint = pageFingerprint(items);
    if (items.length === current.limit && fingerprint === current.lastPageFingerprint) {
      throw new Error("Conversation list repeated a full page without progress.");
    }

    const seen = new Set(current.seenIds);
    let newIds = 0;
    for (const item of items) {
      current.listedItems += 1;
      if (!seen.has(item.id)) {
        seen.add(item.id);
        newIds += 1;
        current.summaries.push({ ...item, ordinal: current.summaries.length });
      }
    }

    if (items.length === current.limit && newIds === 0) {
      throw new Error("Conversation list page made no unique progress.");
    }

    current.seenIds = [...seen];
    current.page += 1;
    current.offset += items.length;
    current.lastPageFingerprint = fingerprint;

    const noItems = items.length === 0;
    const shortPage = items.length < current.limit;
    const reachesTotal = current.reportedTotal !== null && current.offset >= current.reportedTotal;
    current.complete = noItems || shortPage || reachesTotal;
    current.status = current.complete ? "complete" : "enumerating";
    if (current.complete) current.error = null;
    return current;
  }

  function queueFromEnumeration(enumeration) {
    if (!enumeration?.complete) throw new Error("Cannot freeze an incomplete conversation enumeration.");
    const queue = Array.isArray(enumeration.summaries) ? enumeration.summaries : [];
    const ids = queue.map((item) => item?.id);
    if (ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) {
      throw new Error("Frozen conversation queue was not unique and usable.");
    }
    return queue.map((item, index) => ({ ...normalizeSummary(item, index), ordinal: index }));
  }

  function queueCanonicalString(queue) {
    const c = assertCore();
    return c.stableStringify((Array.isArray(queue) ? queue : []).map((item, index) => ({
      id: item?.id || null,
      title: item?.title || "",
      create_time: item?.create_time ?? null,
      update_time: item?.update_time ?? null,
      ordinal: Number.isInteger(item?.ordinal) ? item.ordinal : index,
    })));
  }

  function queueFingerprint(queue) {
    const input = queueCanonicalString(queue);
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    const mask = 0xffffffffffffffffn;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= BigInt(input.charCodeAt(index));
      hash = (hash * prime) & mask;
    }
    return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
  }

  function makeProgress(queue, runId) {
    const normalizedQueue = Array.isArray(queue) ? queue : [];
    const ids = normalizedQueue.map((item) => item?.id);
    if (ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) {
      throw new Error("Cannot create progress for a non-unique queue.");
    }
    return {
      schema_version: ACCOUNT_SCHEMA_VERSION,
      run_id: String(runId || ""),
      status: normalizedQueue.length ? "queued" : "done",
      next_index: 0,
      completed_ids: [],
      failures: [],
      total: normalizedQueue.length,
      queue_ids: [...ids],
      last_completed_id: null,
      error: null,
    };
  }

  function assertProgress(progress) {
    const p = progress || {};
    const ids = Array.isArray(p.queue_ids) ? p.queue_ids : [];
    const completed = Array.isArray(p.completed_ids) ? p.completed_ids : [];
    if (!Number.isInteger(p.next_index) || p.next_index < 0 || p.next_index > ids.length) {
      throw new Error("Account progress index is invalid.");
    }
    if (p.total !== ids.length) throw new Error("Account progress total does not match its queue.");
    if (completed.length !== p.next_index) throw new Error("Account progress completion is not conserved.");
    for (let i = 0; i < completed.length; i += 1) {
      if (completed[i] !== ids[i]) throw new Error("Account progress completed IDs are out of order.");
    }
    if (new Set(completed).size !== completed.length) throw new Error("Account progress contains duplicate completions.");
    return true;
  }

  function completeItem(progress, id) {
    const next = clone(progress);
    assertProgress(next);
    if (next.next_index >= next.total) throw new Error("Account queue is already complete.");
    if (next.queue_ids[next.next_index] !== id) throw new Error("Completed conversation is not the queue head.");
    next.completed_ids.push(id);
    next.next_index += 1;
    next.last_completed_id = id;
    next.error = null;
    next.status = next.next_index >= next.total ? "done" : "running";
    assertProgress(next);
    return next;
  }

  function recordFailure(progress, id, error) {
    const next = clone(progress);
    assertProgress(next);
    if (next.next_index >= next.total) throw new Error("Cannot fail an already complete account queue.");
    if (next.queue_ids[next.next_index] !== id) throw new Error("Failed conversation is not the queue head.");
    if (next.failures.length < MAX_FAILURES) {
      next.failures.push({
        id,
        index: next.next_index,
        error: String(error || "Unknown account export failure").slice(0, 400),
      });
    }
    next.status = "error";
    next.error = String(error || "Unknown account export failure").slice(0, 400);
    assertProgress(next);
    return next;
  }

  function makeConversationPaths(runId, conversationId) {
    const c = assertCore();
    const safeRun = c.sanitizePathSegment(runId, "run");
    const safeConversation = c.sanitizePathSegment(conversationId, "conversation");
    const prefix = `chatgpt-provenance-account/${safeRun}/conversations/${safeConversation}`;
    return {
      prefix,
      raw: `${prefix}/raw/conversation.response.json`,
      nodes: `${prefix}/normalized/nodes.jsonl`,
      edges: `${prefix}/normalized/edges.jsonl`,
      messages: `${prefix}/normalized/messages.jsonl`,
      tools: `${prefix}/normalized/tool-events.jsonl`,
      citations: `${prefix}/normalized/citations.jsonl`,
      artifacts: `${prefix}/normalized/artifacts.jsonl`,
      report: `${prefix}/validation/conversation-report.json`,
    };
  }

  function assertReadOnlySource(source) {
    const text = String(source || "");
    if (/method\s*:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i.test(text)) {
      throw new Error("Account exporter source contains a forbidden write method.");
    }
    if (/\/backend-api\/conversation\/[^\n]*["']\s*,?\s*\{[^}]*method/i.test(text)) {
      throw new Error("Account exporter source contains a forbidden conversation mutation.");
    }
    return true;
  }

  return {
    ACCOUNT_SCHEMA_VERSION,
    PAGE_LIMIT,
    MAX_PAGES,
    MAX_FAILURES,
    normalizeSummary,
    makeEnumerationState,
    normalizePage,
    applyPage,
    queueFromEnumeration,
    queueCanonicalString,
    queueFingerprint,
    makeProgress,
    assertProgress,
    completeItem,
    recordFailure,
    makeConversationPaths,
    assertReadOnlySource,
  };
});
