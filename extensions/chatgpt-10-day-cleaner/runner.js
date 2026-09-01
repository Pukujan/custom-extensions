(() => {
  "use strict";
  if (globalThis.__CHATGPT_CLEANER_RUNNER_V2__) return;
  globalThis.__CHATGPT_CLEANER_RUNNER_V2__ = true;

  const Core = globalThis.CleanerCore;
  const STATE_KEY = "cleanerStateV2";
  const LIMIT = 100;
  const MAX_PAGES = 500;
  let operationRunning = false;
  let cancelRequested = false;

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function freshState() {
    return {
      version: 2,
      status: "idle",
      settings: { days: 10, basis: "updated" },
      scan: null,
      deletion: null,
      message: "Ready. Run a dry scan first.",
      lastError: null,
      updatedAt: Date.now()
    };
  }

  async function readState() {
    const obj = await chrome.storage.local.get(STATE_KEY);
    return obj[STATE_KEY] || freshState();
  }

  async function writeState(next) {
    next.updatedAt = Date.now();
    await chrome.storage.local.set({ [STATE_KEY]: next });
    return next;
  }

  async function patchState(mutator) {
    const current = await readState();
    const next = mutator(structuredClone(current)) || current;
    return writeState(next);
  }

  async function getAccessToken() {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (!res.ok) throw new Error(`Session request failed (${res.status}).`);
    const data = await res.json();
    if (!data?.accessToken) {
      throw new Error("No ChatGPT access token found. Make sure you are signed in.");
    }
    return data.accessToken;
  }

  async function fetchWithRetry(url, options = {}, retries = 4) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (cancelRequested) throw new Error("__CANCELLED__");

      try {
        const res = await fetch(url, { credentials: "include", ...options });
        if (res.ok) return res;

        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          await delay(700 * (attempt + 1));
          continue;
        }

        const body = await res.text().catch(() => "");
        throw new Error(
          `ChatGPT request failed (${res.status})${body ? `: ${body.slice(0, 160)}` : ""}`
        );
      } catch (err) {
        lastError = err;
        if (err?.message === "__CANCELLED__") throw err;
        if (attempt >= retries) throw err;
        await delay(700 * (attempt + 1));
      }
    }

    throw lastError || new Error("Request failed.");
  }

  async function listAllConversations(token, scanId) {
    const headers = { Authorization: `Bearer ${token}` };
    const all = [];
    const seen = new Set();
    let offset = 0;
    let reportedTotal = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      if (cancelRequested) throw new Error("__CANCELLED__");

      const url = `/backend-api/conversations?offset=${offset}&limit=${LIMIT}&order=updated`;
      const res = await fetchWithRetry(url, { headers });
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      if (Number.isFinite(data?.total)) reportedTotal = data.total;

      for (const chat of items) {
        if (chat?.id && !seen.has(chat.id)) {
          seen.add(chat.id);
          all.push(chat);
        }
      }

      if (page % 2 === 0 || items.length < LIMIT) {
        await patchState((state) => {
          if (state.status === "scanning" && state.scan?.id === scanId) {
            state.scan.scanned = all.length;
            state.scan.pages = page + 1;
            state.message = `Scanning… ${all.length.toLocaleString()} chat(s) read.`;
          }
          return state;
        });
      }

      if (items.length === 0) break;
      offset += items.length;
      if (reportedTotal !== null && offset >= reportedTotal) break;
      if (items.length < LIMIT) break;

      await delay(250);
    }

    return all;
  }

  async function runScan({ days, basis, cutoffMs }) {
    if (operationRunning) throw new Error("Another cleaner operation is already running.");
    operationRunning = true;
    cancelRequested = false;

    const scanId = crypto.randomUUID();
    const normalizedBasis = Core.normalizeBasis(basis);

    await writeState({
      version: 2,
      status: "scanning",
      settings: { days, basis: normalizedBasis },
      scan: {
        id: scanId,
        days,
        basis: normalizedBasis,
        cutoffMs,
        scanned: 0,
        pages: 0,
        total: 0,
        eligible: 0,
        candidates: [],
        preview: [],
        shown: 0
      },
      deletion: null,
      message: "Scanning your ChatGPT conversation list…",
      lastError: null,
      updatedAt: Date.now()
    });

    try {
      const token = await getAccessToken();
      const all = await listAllConversations(token, scanId);

      if (cancelRequested) throw new Error("__CANCELLED__");

      const snapshot = Core.makeScanSnapshot(
        all,
        cutoffMs,
        normalizedBasis,
        days,
        scanId
      );

      await patchState((state) => {
        if (state.scan?.id !== scanId) return state;
        state.status = "ready";
        state.scan = { ...snapshot, scanned: snapshot.total };
        state.deletion = null;
        state.message = snapshot.eligible
          ? `Dry run complete: ${snapshot.eligible.toLocaleString()} chat(s) eligible.`
          : "Dry run complete: nothing is old enough to delete.";
        state.lastError = null;
        return state;
      });
    } catch (err) {
      if (err?.message === "__CANCELLED__") {
        await patchState((state) => {
          if (state.scan?.id === scanId) {
            state.status = "cancelled";
            state.message = "Scan cancelled.";
            state.lastError = null;
          }
          return state;
        });
      } else {
        await patchState((state) => {
          if (state.scan?.id === scanId) {
            state.status = "error";
            state.message = "Scan failed.";
            state.lastError = err?.message || String(err);
          }
          return state;
        });
      }
    } finally {
      operationRunning = false;
      cancelRequested = false;
    }
  }

  async function continueDeletion() {
    if (operationRunning) return;
    operationRunning = true;
    cancelRequested = false;

    try {
      let state = await readState();
      if (state.status !== "deleting" || !state.scan || !state.deletion) return;

      // Critical invariant: the delete queue is the exact frozen candidate set
      // produced by the dry scan. We do NOT recalculate age here.
      const queue = Array.isArray(state.scan.candidates) ? state.scan.candidates : [];
      if (state.deletion.scanId !== state.scan.id || state.deletion.total !== queue.length) {
        throw new Error("Candidate-set invariant failed. Run a fresh dry scan.");
      }

      const token = await getAccessToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      while (true) {
        if (cancelRequested) throw new Error("__CANCELLED__");

        state = await readState();
        if (state.status !== "deleting") return;

        const progress = state.deletion;
        if (progress.index >= progress.total) {
          state.status = "complete";
          state.message = progress.failed
            ? `Finished: ${progress.deleted} deleted, ${progress.failed} failed.`
            : `Finished: ${progress.deleted} chat(s) deleted.`;
          state.lastError = null;
          await writeState(state);
          return;
        }

        const chat = queue[progress.index];
        let success = false;
        let failure = null;

        try {
          await fetchWithRetry(`/backend-api/conversation/${encodeURIComponent(chat.id)}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ is_visible: false })
          });
          success = true;
        } catch (err) {
          if (err?.message === "__CANCELLED__") throw err;
          failure = {
            id: chat.id,
            title: chat.title || "Untitled chat",
            error: err?.message || String(err)
          };
        }

        state = await readState();
        if (state.status !== "deleting") return;

        state.deletion = Core.advanceDeletionProgress(state.deletion, success, failure);
        state.deletion.currentTitle =
          state.deletion.index < queue.length ? queue[state.deletion.index].title : null;
        state.message =
          `Deleting… ${state.deletion.index.toLocaleString()} / ${state.deletion.total.toLocaleString()} processed.`;
        state.lastError = null;
        await writeState(state);

        await delay(450);
      }
    } catch (err) {
      const state = await readState();

      if (err?.message === "__CANCELLED__") {
        state.status = "cancelled";
        state.message = "Deletion stopped. Already processed chats remain deleted.";
        state.lastError = null;
      } else {
        state.status = "error";
        state.message = "Deletion paused because of an error.";
        state.lastError = err?.message || String(err);
      }
      await writeState(state);
    } finally {
      operationRunning = false;
      cancelRequested = false;
    }
  }

  async function startDelete(scanId) {
    const state = await readState();

    if (state.status !== "ready") {
      throw new Error("Run a successful dry scan before deleting.");
    }
    if (!state.scan || state.scan.id !== scanId) {
      throw new Error("The dry-scan snapshot changed. Run the scan again.");
    }

    const queue = Array.isArray(state.scan.candidates) ? state.scan.candidates : [];
    state.status = "deleting";
    state.deletion = {
      ...Core.makeDeletionProgress(queue.length, state.scan.id),
      startedAt: Date.now(),
      currentTitle: queue[0]?.title || null
    };
    state.message = queue.length
      ? `Deleting… 0 / ${queue.length.toLocaleString()} processed.`
      : "Nothing to delete.";
    state.lastError = null;
    await writeState(state);

    // Start independently of the popup message lifecycle.
    setTimeout(() => continueDeletion(), 0);
  }

  async function cancel() {
    cancelRequested = true;
    await patchState((state) => {
      if (state.status === "scanning" || state.status === "deleting") {
        state.message = "Stopping after the current request…";
      }
      return state;
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.target !== "chatgpt-cleaner-runner-v2") return;

    (async () => {
      try {
        if (message.type === "PING") {
          sendResponse({ ok: true, version: 2 });
          return;
        }

        if (message.type === "START_SCAN") {
          const days = Number(message.days);
          const cutoffMs = Number(message.cutoffMs);

          if (!Number.isFinite(days) || days < 1 || days > 3650) {
            throw new Error("Days must be between 1 and 3650.");
          }
          if (!Number.isFinite(cutoffMs)) {
            throw new Error("Invalid cutoff time.");
          }

          const current = await readState();
          if (current.status === "scanning" || current.status === "deleting") {
            throw new Error("A cleaner operation is already running.");
          }

          sendResponse({ ok: true, accepted: true });
          setTimeout(() => runScan({
            days,
            basis: message.basis,
            cutoffMs
          }), 0);
          return;
        }

        if (message.type === "START_DELETE") {
          if (message.confirmation !== "DELETE") {
            throw new Error("Deletion confirmation is missing.");
          }
          await startDelete(message.scanId);
          sendResponse({ ok: true, accepted: true });
          return;
        }

        if (message.type === "CANCEL") {
          await cancel();
          sendResponse({ ok: true });
          return;
        }

        throw new Error("Unknown cleaner message.");
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || String(err) });
      }
    })();

    return true;
  });

  // Recovery invariant:
  // - Closing/reopening the extension popup has no effect on this runner.
  // - If the ChatGPT page itself reloads during deletion, continue from the
  //   persisted queue/index. If a scan was interrupted by a page reload,
  //   fail closed and require a fresh scan rather than using partial data.
  (async () => {
    const state = await readState();

    if (state.status === "deleting" && state.deletion?.index < state.deletion?.total) {
      setTimeout(() => continueDeletion(), 150);
    } else if (state.status === "scanning") {
      state.status = "error";
      state.message = "The ChatGPT page reloaded during the scan. Run the dry scan again.";
      state.lastError = "Interrupted scan was discarded to preserve candidate-set integrity.";
      await writeState(state);
    }
  })();
})();
