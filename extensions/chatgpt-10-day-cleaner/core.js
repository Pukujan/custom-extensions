(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.CleanerCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizeBasis(basis) {
    return basis === "created" ? "created" : "updated";
  }

  function fieldForBasis(basis) {
    return normalizeBasis(basis) === "created" ? "create_time" : "update_time";
  }

  function parseTime(value) {
    if (typeof value !== "string" || !value) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }

  function isEligible(chat, cutoffMs, basis) {
    if (!chat || !Number.isFinite(cutoffMs)) return false;
    const ms = parseTime(chat[fieldForBasis(basis)]);
    return ms !== null && ms < cutoffMs;
  }

  function buildCandidates(chats, cutoffMs, basis) {
    const field = fieldForBasis(basis);
    const byId = new Map();

    for (const chat of Array.isArray(chats) ? chats : []) {
      if (!chat || typeof chat.id !== "string" || !chat.id) continue;
      if (byId.has(chat.id)) continue;
      if (!isEligible(chat, cutoffMs, basis)) continue;

      byId.set(chat.id, {
        id: chat.id,
        title: typeof chat.title === "string" && chat.title ? chat.title : "Untitled chat",
        time: chat[field],
        timeMs: parseTime(chat[field]),
        create_time: chat.create_time || null,
        update_time: chat.update_time || null
      });
    }

    return [...byId.values()].sort((a, b) => {
      if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
      return a.id.localeCompare(b.id);
    });
  }

  function makeScanSnapshot(chats, cutoffMs, basis, days, scanId) {
    const candidates = buildCandidates(chats, cutoffMs, basis);
    return {
      id: scanId,
      days,
      basis: normalizeBasis(basis),
      cutoffMs,
      total: Array.isArray(chats) ? new Set(chats.filter(x => x && x.id).map(x => x.id)).size : 0,
      eligible: candidates.length,
      candidates,
      preview: candidates.slice(0, 60),
      shown: Math.min(60, candidates.length)
    };
  }

  function makeDeletionProgress(total, scanId) {
    const safeTotal = Number.isInteger(total) && total >= 0 ? total : 0;
    return {
      scanId,
      total: safeTotal,
      index: 0,
      deleted: 0,
      failed: 0,
      failures: []
    };
  }

  function advanceDeletionProgress(progress, success, failureEntry) {
    const p = {
      scanId: progress.scanId,
      total: progress.total,
      index: progress.index,
      deleted: progress.deleted,
      failed: progress.failed,
      failures: Array.isArray(progress.failures) ? [...progress.failures] : []
    };

    if (p.index >= p.total) return p;

    p.index += 1;
    if (success) {
      p.deleted += 1;
    } else {
      p.failed += 1;
      if (failureEntry && p.failures.length < 50) p.failures.push(failureEntry);
    }
    return p;
  }

  return {
    normalizeBasis,
    fieldForBasis,
    parseTime,
    isEligible,
    buildCandidates,
    makeScanSnapshot,
    makeDeletionProgress,
    advanceDeletionProgress
  };
});
