(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ChatHistoryOrganizerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_PROFILE_CHARS = 20000;
  const MAX_KEYWORDS = 18;
  const DEFAULT_MAX_GROUPS = 12;
  const OVERLAP = 20;

  const PROVIDERS = Object.freeze({
    openai: {
      label: "OpenAI",
      endpoint: "https://api.openai.com/v1/chat/completions",
      permission: "https://api.openai.com/*",
      defaultModel: ""
    },
    openrouter: {
      label: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      permission: "https://openrouter.ai/*",
      defaultModel: ""
    },
    groq: {
      label: "Groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      permission: "https://api.groq.com/*",
      defaultModel: ""
    },
    together: {
      label: "Together",
      endpoint: "https://api.together.xyz/v1/chat/completions",
      permission: "https://api.together.xyz/*",
      defaultModel: ""
    },
    mistral: {
      label: "Mistral",
      endpoint: "https://api.mistral.ai/v1/chat/completions",
      permission: "https://api.mistral.ai/*",
      defaultModel: ""
    },
    deepseek: {
      label: "DeepSeek",
      endpoint: "https://api.deepseek.com/chat/completions",
      permission: "https://api.deepseek.com/*",
      defaultModel: ""
    },
    xai: {
      label: "xAI",
      endpoint: "https://api.x.ai/v1/chat/completions",
      permission: "https://api.x.ai/*",
      defaultModel: ""
    }
  });

  const STOPWORDS = new Set([
    "the","a","an","and","or","but","if","then","else","for","to","of","in","on","at","by","with","from","into","about","as","is","are","was","were","be","been","being","it","its","this","that","these","those","i","me","my","mine","we","our","ours","you","your","yours","he","she","they","them","their","what","which","who","whom","when","where","why","how","can","could","would","should","will","just","do","does","did","done","have","has","had","having","not","no","yes","so","than","too","very","more","most","some","any","all","each","other","another","same","new","old","make","get","use","using","used","want","need","help","please","like","chat","conversation","chatgpt","assistant","user","thing","things","way","ways","really","also","now","here","there","out","up","down","over","under","again","only","own","such","because","while","through","during","before","after","above","below","between","both","few","many","much","am","im","ive","dont","doesnt","cant","wont","thats","whats","lets"
  ]);

  function parseTime(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value < 1e12 ? value * 1000 : value;
    }
    if (typeof value !== "string" || !value.trim()) return null;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && String(numeric) === value.trim()) return numeric < 1e12 ? numeric * 1000 : numeric;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }

  function normalizeTitle(value) {
    const s = typeof value === "string" ? value.trim() : "";
    return s || "Untitled chat";
  }

  function normalizeSummary(item, snapshotCutoffMs) {
    if (!item || typeof item.id !== "string" || !item.id) return null;
    const createdMs = parseTime(item.create_time);
    if (createdMs !== null && Number.isFinite(snapshotCutoffMs) && createdMs > snapshotCutoffMs) return null;
    return {
      id: item.id,
      title: normalizeTitle(item.title),
      create_time: item.create_time ?? null,
      update_time: item.update_time ?? null
    };
  }

  function makeEnumerationState(snapshotCutoffMs) {
    if (!Number.isFinite(snapshotCutoffMs)) throw new Error("Snapshot cutoff must be finite.");
    return {
      snapshot_cutoff_ms: snapshotCutoffMs,
      offset: 0,
      limit: 100,
      pages: 0,
      listed_items: 0,
      reported_total: null,
      complete: false,
      queue: []
    };
  }

  function applyEnumerationPage(state, data) {
    if (!state || !Array.isArray(state.queue)) throw new Error("Invalid enumeration state.");
    if (!data || !Array.isArray(data.items)) throw new Error("Conversation list response is missing items array.");
    const next = {
      ...state,
      queue: state.queue.map((x) => ({ ...x }))
    };
    const seen = new Set(next.queue.map((x) => x.id));
    const items = data.items;
    next.pages += 1;
    next.listed_items += items.length;
    if (Number.isFinite(data.total) && data.total >= 0) next.reported_total = data.total;

    for (const item of items) {
      const normalized = normalizeSummary(item, next.snapshot_cutoff_ms);
      if (!normalized || seen.has(normalized.id)) continue;
      seen.add(normalized.id);
      next.queue.push(normalized);
    }

    const reachesReportedTail = Number.isFinite(next.reported_total) && next.offset + items.length >= next.reported_total;
    if (items.length === 0 || items.length < next.limit || reachesReportedTail) {
      next.complete = true;
    } else {
      next.offset += Math.max(1, next.limit - OVERLAP);
    }
    if (next.pages > 1000) throw new Error("Conversation enumeration exceeded the page safety limit.");
    return next;
  }

  function words(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .match(/[a-z0-9][a-z0-9+.#_-]{1,39}/g) || [];
  }

  function cleanToken(token) {
    return String(token || "").replace(/^[-_.#]+|[-_.#]+$/g, "");
  }

  function validToken(token) {
    if (!token || token.length < 3 || token.length > 40) return false;
    if (STOPWORDS.has(token)) return false;
    if (/^\d+$/.test(token)) return false;
    return true;
  }

  function addTokens(score, text, weight, includeBigrams) {
    const toks = words(text).map(cleanToken).filter(validToken);
    for (const token of toks) score.set(token, (score.get(token) || 0) + weight);
    if (includeBigrams) {
      for (let i = 0; i + 1 < toks.length; i++) {
        const bigram = `${toks[i]}_${toks[i + 1]}`;
        if (bigram.length <= 60) score.set(bigram, (score.get(bigram) || 0) + weight * 1.5);
      }
    }
  }

  function extractConversationText(conversation) {
    const mapping = conversation && conversation.mapping;
    if (!mapping || typeof mapping !== "object") throw new Error("Conversation mapping is missing.");
    const chunks = [];
    let chars = 0;
    let messageCount = 0;
    for (const node of Object.values(mapping)) {
      const message = node && node.message;
      if (!message || !message.content) continue;
      const role = message.author && message.author.role;
      if (role !== "user" && role !== "assistant") continue;
      const parts = Array.isArray(message.content.parts) ? message.content.parts : [];
      let added = false;
      for (const part of parts) {
        if (typeof part !== "string" || !part.trim()) continue;
        const remaining = MAX_PROFILE_CHARS - chars;
        if (remaining <= 0) break;
        const piece = part.slice(0, remaining);
        chunks.push(piece);
        chars += piece.length;
        added = true;
      }
      if (added) messageCount += 1;
      if (chars >= MAX_PROFILE_CHARS) break;
    }
    return { text: chunks.join("\n"), messageCount };
  }

  function rankedKeywords(title, bodyText) {
    const score = new Map();
    addTokens(score, title, 4, true);
    addTokens(score, bodyText, 1, false);
    return [...score.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_KEYWORDS)
      .map(([token]) => token);
  }

  function profileConversation(conversation, summary) {
    const normalized = normalizeSummary(summary, Number.POSITIVE_INFINITY);
    if (!normalized) throw new Error("Conversation summary is invalid.");
    const { text, messageCount } = extractConversationText(conversation);
    return {
      ...normalized,
      message_count: messageCount,
      keywords: rankedKeywords(normalized.title, text)
    };
  }

  function fallbackProfile(summary, warning) {
    const normalized = normalizeSummary(summary, Number.POSITIVE_INFINITY);
    if (!normalized) throw new Error("Conversation summary is invalid.");
    return {
      ...normalized,
      message_count: 0,
      keywords: rankedKeywords(normalized.title, ""),
      profile_warning: String(warning || "detail unavailable").slice(0, 160)
    };
  }

  function titleCaseAnchor(anchor) {
    if (anchor === "other") return "Other";
    return String(anchor)
      .split("_")
      .filter(Boolean)
      .map((part) => part.length <= 4 && /^[a-z0-9+#.]+$/.test(part) ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1))
      .join(" ");
  }

  function slug(value) {
    return String(value || "topic")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "topic";
  }

  function groupConversations(inputProfiles, maxGroups = DEFAULT_MAX_GROUPS) {
    const deduped = new Map();
    for (const p of Array.isArray(inputProfiles) ? inputProfiles : []) {
      if (!p || typeof p.id !== "string" || !p.id || deduped.has(p.id)) continue;
      deduped.set(p.id, { ...p, title: normalizeTitle(p.title), keywords: [...new Set(Array.isArray(p.keywords) ? p.keywords.filter(validToken) : [])].slice(0, MAX_KEYWORDS) });
    }
    const profiles = [...deduped.values()].sort((a, b) => a.id.localeCompare(b.id));
    if (!profiles.length) return [];
    if (profiles.length === 1) {
      const p = profiles[0];
      return [{ id: "topic-other", name: "Other", conversation_ids: [p.id], keywords: p.keywords.slice(0, 8), representative_titles: [p.title] }];
    }

    const df = new Map();
    const postings = new Map();
    for (const p of profiles) {
      for (const k of new Set(p.keywords)) {
        df.set(k, (df.get(k) || 0) + 1);
        if (!postings.has(k)) postings.set(k, new Set());
        postings.get(k).add(p.id);
      }
    }
    const n = profiles.length;
    const targetGroups = Math.max(2, Math.min(Number.isInteger(maxGroups) ? maxGroups : DEFAULT_MAX_GROUPS, Math.max(2, Math.round(Math.sqrt(n)) + 2)));

    const anchorCandidates = [...df.entries()]
      .filter(([, count]) => count >= 2 && count / n <= 0.55)
      .map(([token, count]) => ({ token, count, score: count * Math.log((n + 1) / (count + 0.5)) }))
      .sort((a, b) => b.score - a.score || b.count - a.count || a.token.localeCompare(b.token));

    const anchors = [];
    for (const candidate of anchorCandidates) {
      if (anchors.length >= Math.max(1, targetGroups - 1)) break;
      const cSet = postings.get(candidate.token) || new Set();
      let redundant = false;
      for (const selected of anchors) {
        const sSet = postings.get(selected) || new Set();
        let intersection = 0;
        for (const id of cSet) if (sSet.has(id)) intersection += 1;
        const overlapCoefficient = intersection / Math.max(1, Math.min(cSet.size, sSet.size));
        if (overlapCoefficient >= 0.8) {
          redundant = true;
          break;
        }
      }
      if (!redundant) anchors.push(candidate.token);
    }
    const anchorSet = new Set(anchors);
    const buckets = new Map(anchors.map((a) => [a, []]));
    buckets.set("other", []);

    for (const p of profiles) {
      let best = null;
      let bestScore = -Infinity;
      for (let rank = 0; rank < p.keywords.length; rank++) {
        const k = p.keywords[rank];
        if (!anchorSet.has(k)) continue;
        const count = df.get(k) || 1;
        const idf = Math.log((n + 1) / (count + 0.5));
        const score = idf + 1 / (rank + 1);
        if (score > bestScore || (score === bestScore && k.localeCompare(best || "") < 0)) {
          best = k;
          bestScore = score;
        }
      }
      buckets.get(best || "other").push(p);
    }

    const minGroup = n >= 20 ? 2 : 1;
    const other = buckets.get("other");
    for (const anchor of anchors) {
      const items = buckets.get(anchor);
      if (items.length > 0 && items.length < minGroup) {
        other.push(...items);
        buckets.set(anchor, []);
      }
    }

    const folders = [];
    for (const [anchor, items] of buckets.entries()) {
      if (!items.length) continue;
      items.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
      const keywordCounts = new Map();
      for (const item of items) for (const k of item.keywords.slice(0, 8)) keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1);
      const topKeywords = [...keywordCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([k]) => k);
      folders.push({
        id: `topic-${slug(anchor)}`,
        name: titleCaseAnchor(anchor),
        conversation_ids: items.map((x) => x.id),
        keywords: topKeywords,
        representative_titles: items.slice(0, 12).map((x) => x.title)
      });
    }
    folders.sort((a, b) => b.conversation_ids.length - a.conversation_ids.length || a.id.localeCompare(b.id));
    return folders;
  }

  function makeRefinementPayload(folders) {
    return {
      instruction: "Rename or merge the proposed groups. Use only source_group_ids that are provided. Do not invent groups or conversation IDs.",
      groups: (Array.isArray(folders) ? folders : []).map((g) => ({
        id: g.id,
        current_name: g.name,
        size: Array.isArray(g.conversation_ids) ? g.conversation_ids.length : 0,
        keywords: Array.isArray(g.keywords) ? g.keywords.slice(0, 8) : [],
        representative_titles: Array.isArray(g.representative_titles) ? g.representative_titles.slice(0, 12) : []
      }))
    };
  }

  function parseRefinementResponse(text) {
    let s = String(text || "").trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let value;
    try { value = JSON.parse(s); }
    catch (_) { throw new Error("LLM response is not valid JSON."); }
    if (!value || !Array.isArray(value.groups)) throw new Error("LLM JSON must contain a groups array.");
    return value;
  }

  function applyLlmRefinement(baseFolders, response) {
    const base = Array.isArray(baseFolders) ? baseFolders.map((g) => ({ ...g, conversation_ids: [...g.conversation_ids], keywords: [...(g.keywords || [])], representative_titles: [...(g.representative_titles || [])] })) : [];
    const byId = new Map(base.map((g) => [g.id, g]));
    const used = new Set();
    const out = [];
    const groups = response && Array.isArray(response.groups) ? response.groups : null;
    if (!groups) throw new Error("LLM refinement is missing groups.");

    for (let i = 0; i < groups.length; i++) {
      const item = groups[i];
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const sourceIds = Array.isArray(item?.source_group_ids) ? item.source_group_ids : [];
      if (!name || name.length > 80) throw new Error("LLM group name is invalid.");
      if (!sourceIds.length) throw new Error("LLM group has no source_group_ids.");
      const members = [];
      const keywords = [];
      const titles = [];
      for (const id of sourceIds) {
        if (!byId.has(id)) throw new Error(`LLM referenced unknown source group: ${id}`);
        if (used.has(id)) throw new Error(`Source group used more than once: ${id}`);
        used.add(id);
        const g = byId.get(id);
        members.push(...g.conversation_ids);
        keywords.push(...(g.keywords || []));
        titles.push(...(g.representative_titles || []));
      }
      out.push({
        id: `ai-${i + 1}-${slug(name)}`,
        name,
        conversation_ids: [...new Set(members)].sort(),
        keywords: [...new Set(keywords)].slice(0, 8),
        representative_titles: [...new Set(titles)].slice(0, 12),
        source_group_ids: [...sourceIds]
      });
    }

    for (const g of base) if (!used.has(g.id)) out.push(g);
    const allIds = out.flatMap((g) => g.conversation_ids);
    if (new Set(allIds).size !== allIds.length) throw new Error("LLM refinement duplicated conversation membership.");
    return out.sort((a, b) => b.conversation_ids.length - a.conversation_ids.length || a.id.localeCompare(b.id));
  }

  function freshState(generation = 0) {
    return {
      schema_version: 1,
      generation: Number.isInteger(generation) && generation >= 0 ? generation : 0,
      run_id: null,
      phase: "idle",
      resume_phase: null,
      snapshot_cutoff_ms: null,
      enumeration: null,
      queue: [],
      profile_index: 0,
      profiles: {},
      deterministic_folders: [],
      folders: [],
      failures: [],
      warning: null,
      error: null,
      message: "Ready to scan existing chats.",
      started_at: null,
      updated_at: null,
      completed_at: null
    };
  }

  function startRun(current, cutoffMs, runId) {
    if (!current || current.phase !== "idle") throw new Error("Reset the current organizer state before starting a new snapshot.");
    if (!Number.isFinite(cutoffMs)) throw new Error("Invalid snapshot time.");
    if (typeof runId !== "string" || !runId) throw new Error("Invalid run ID.");
    return {
      ...freshState(current.generation),
      run_id: runId,
      phase: "enumerating",
      snapshot_cutoff_ms: cutoffMs,
      enumeration: makeEnumerationState(cutoffMs),
      message: "Enumerating existing conversations…",
      started_at: new Date(cutoffMs).toISOString(),
      updated_at: Date.now()
    };
  }

  function pauseRun(state) {
    if (!state || !["enumerating","profiling","organizing","refining","waiting_tab","error"].includes(state.phase)) return state;
    const resume = state.phase === "waiting_tab" || state.phase === "error" ? (state.resume_phase || "enumerating") : state.phase;
    return { ...state, phase: "paused", resume_phase: resume, message: "Paused. Resume continues the same frozen snapshot.", updated_at: Date.now() };
  }

  function resumeRun(state) {
    if (!state || !["paused","waiting_tab","error"].includes(state.phase)) throw new Error("No paused organizer run is available.");
    const phase = state.resume_phase || (state.enumeration?.complete ? "profiling" : "enumerating");
    return { ...state, phase, resume_phase: null, error: null, message: "Resuming frozen snapshot…", updated_at: Date.now() };
  }

  function resetRun(state) {
    const generation = (Number.isInteger(state?.generation) ? state.generation : 0) + 1;
    return freshState(generation);
  }

  function canCommit(state, runId, generation) {
    return Boolean(state && state.run_id === runId && state.generation === generation);
  }

  return {
    PROVIDERS,
    parseTime,
    normalizeSummary,
    makeEnumerationState,
    applyEnumerationPage,
    profileConversation,
    fallbackProfile,
    groupConversations,
    makeRefinementPayload,
    parseRefinementResponse,
    applyLlmRefinement,
    freshState,
    startRun,
    pauseRun,
    resumeRun,
    resetRun,
    canCommit
  };
});