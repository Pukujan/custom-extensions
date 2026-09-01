function freshState() {
  return {
    rows: {},
    running: false,
    currentPage: 0,
    lastSignature: "",
    config: { maxPages: 99, delayMs: 2500 },
    lastStatus: "Idle"
  };
}

async function getState() {
  const obj = await chrome.storage.local.get("state");
  const base = freshState();
  const saved = obj.state || {};
  return {
    ...base,
    ...saved,
    rows: { ...(saved.rows || {}) },
    config: { ...base.config, ...(saved.config || {}) }
  };
}

async function setState(state) {
  await chrome.storage.local.set({ state });
  return state;
}

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  await setState(state);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const state = await getState();

    if (msg.type === "GET_STATE") {
      sendResponse({ ok: true, state });
      return;
    }

    if (msg.type === "START_STATE") {
      state.running = true;
      if (msg.reset === true) {
        state.currentPage = 0;
        state.lastSignature = "";
      }
      state.config = {
        maxPages: Math.max(1, Math.min(999, Number(msg.config?.maxPages) || 99)),
        delayMs: Math.max(800, Math.min(60000, Number(msg.config?.delayMs) || 2500))
      };
      state.lastStatus = state.currentPage > 0 ? "Resuming…" : "Starting…";
      await setState(state);
      sendResponse({ ok: true, state });
      return;
    }

    if (msg.type === "STOP_STATE") {
      state.running = false;
      state.lastStatus = msg.status || "Stopped";
      await setState(state);
      sendResponse({ ok: true, state });
      return;
    }

    if (msg.type === "UPSERT_ROWS") {
      for (const row of (msg.rows || [])) {
        if (!row?.url) continue;
        const old = state.rows[row.url] || {};
        state.rows[row.url] = { ...old, ...row };
      }
      if (Number.isFinite(msg.currentPage)) state.currentPage = msg.currentPage;
      if (typeof msg.lastSignature === "string") state.lastSignature = msg.lastSignature;
      if (msg.status) state.lastStatus = msg.status;
      await setState(state);
      sendResponse({ ok: true, count: Object.keys(state.rows).length, state });
      return;
    }

    if (msg.type === "SET_STATUS") {
      if (typeof msg.running === "boolean") state.running = msg.running;
      if (Number.isFinite(msg.currentPage)) state.currentPage = msg.currentPage;
      if (typeof msg.lastSignature === "string") state.lastSignature = msg.lastSignature;
      if (msg.status) state.lastStatus = msg.status;
      await setState(state);
      sendResponse({ ok: true, state });
      return;
    }

    if (msg.type === "CLEAR") {
      const next = freshState();
      await setState(next);
      sendResponse({ ok: true, state: next });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message" });
  })().catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
  return true;
});
