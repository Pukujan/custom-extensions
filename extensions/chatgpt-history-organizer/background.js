"use strict";

importScripts("core.js");

const Core = globalThis.ChatHistoryOrganizerCore;
const STATE_KEY = "chatHistoryOrganizerStateV1";
const SETTINGS_KEY = "chatHistoryOrganizerSettingsV1";
const ALARM_NAME = "chat-history-organizer-tick";
const CHATGPT_ORIGIN = "https://chatgpt.com";
const PROFILE_BATCH_SIZE = 20;
const ENUMERATION_PAGES_PER_TICK = 3;
const MAX_FAILURES = 100;
let tickRunning = false;

function defaultSettings() {
  return {
    max_groups: 12,
    byok: {
      enabled: false,
      provider: "openai",
      model: "",
      api_key: ""
    }
  };
}

async function readState() {
  const obj = await chrome.storage.local.get(STATE_KEY);
  return obj[STATE_KEY] || Core.freshState(0);
}

async function writeState(state) {
  const next = { ...state, updated_at: Date.now() };
  await chrome.storage.local.set({ [STATE_KEY]: next });
  return next;
}

async function readSettings() {
  const obj = await chrome.storage.local.get(SETTINGS_KEY);
  const raw = obj[SETTINGS_KEY] || {};
  return {
    ...defaultSettings(),
    ...raw,
    byok: { ...defaultSettings().byok, ...(raw.byok || {}) }
  };
}

async function scheduleTick(delayMs = 1000) {
  await chrome.alarms.create(ALARM_NAME, { when: Date.now() + Math.max(250, delayMs) });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findChatGPTTab() {
  const tabs = await chrome.tabs.query({ url: ["https://chatgpt.com/*"] });
  const usable = tabs.filter((tab) => Number.isInteger(tab.id));
  usable.sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || (a.id - b.id));
  return usable[0] || null;
}

async function ensureChatGPTTab() {
  const existing = await findChatGPTTab();
  if (existing) return existing;
  return chrome.tabs.create({ url: "https://chatgpt.com/", active: false });
}

async function requestTokenFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "GET_CHATGPT_ACCESS_TOKEN" });
  } catch (_) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["session-bridge.js"] });
    return chrome.tabs.sendMessage(tabId, { type: "GET_CHATGPT_ACCESS_TOKEN" });
  }
}

async function getAccessToken() {
  const tab = await findChatGPTTab();
  if (!tab?.id) {
    const error = new Error("No ChatGPT tab is available.");
    error.code = "NO_CHATGPT_TAB";
    throw error;
  }
  const response = await requestTokenFromTab(tab.id);
  if (!response?.ok || !response.accessToken) throw new Error(response?.error || "Unable to read the signed-in ChatGPT session.");
  return response.accessToken;
}

async function fetchChatGPT(path, token, retries = 4) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${CHATGPT_ORIGIN}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (response.ok) return response;
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        await delay(500 * (2 ** attempt));
        continue;
      }
      const body = await response.text().catch(() => "");
      throw new Error(`ChatGPT request failed (${response.status})${body ? `: ${body.slice(0, 180)}` : ""}`);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) throw error;
      await delay(500 * (2 ** attempt));
    }
  }
  throw lastError || new Error("ChatGPT request failed.");
}

async function currentRunGuard(runId, generation, allowedPhase) {
  const current = await readState();
  if (!Core.canCommit(current, runId, generation)) return null;
  if (allowedPhase && current.phase !== allowedPhase) return null;
  return current;
}

async function setWaitingForTab(state, phase) {
  return writeState({
    ...state,
    phase: "waiting_tab",
    resume_phase: phase,
    message: "Waiting for a signed-in ChatGPT tab. The frozen snapshot is preserved.",
    error: null
  });
}

async function setError(state, phase, error) {
  return writeState({
    ...state,
    phase: "error",
    resume_phase: phase,
    message: "Organizer paused because of an error.",
    error: String(error?.message || error).slice(0, 400)
  });
}

async function enumerateSlice(state, token) {
  const runId = state.run_id;
  const generation = state.generation;
  for (let page = 0; page < ENUMERATION_PAGES_PER_TICK; page++) {
    const live = await currentRunGuard(runId, generation, "enumerating");
    if (!live) return;
    const e = live.enumeration;
    if (!e || e.complete) break;
    const path = `/backend-api/conversations?offset=${e.offset}&limit=${e.limit}&order=updated`;
    const response = await fetchChatGPT(path, token);
    const data = await response.json();
    const nextEnumeration = Core.applyEnumerationPage(e, data);
    const next = await currentRunGuard(runId, generation, "enumerating");
    if (!next) return;

    if (nextEnumeration.complete) {
      const frozenQueue = nextEnumeration.queue.map((x) => ({ ...x }));
      await writeState({
        ...next,
        phase: "profiling",
        enumeration: { ...nextEnumeration, queue: [] },
        queue: frozenQueue,
        profile_index: 0,
        message: `Frozen ${frozenQueue.length.toLocaleString()} existing chat(s). Building compact profiles…`,
        error: null
      });
      return;
    }

    await writeState({
      ...next,
      enumeration: nextEnumeration,
      message: `Enumerating existing chats… ${nextEnumeration.queue.length.toLocaleString()} frozen candidate(s) found.`,
      error: null
    });
  }
}

async function fetchConversationProfile(summary, token) {
  try {
    const response = await fetchChatGPT(`/backend-api/conversation/${encodeURIComponent(summary.id)}`, token);
    const conversation = await response.json();
    return { profile: Core.profileConversation(conversation, summary), failure: null };
  } catch (error) {
    return {
      profile: Core.fallbackProfile(summary, error?.message || String(error)),
      failure: { id: summary.id, title: summary.title, error: String(error?.message || error).slice(0, 220) }
    };
  }
}

async function profileSlice(state, token) {
  const runId = state.run_id;
  const generation = state.generation;
  let processed = 0;

  while (processed < PROFILE_BATCH_SIZE) {
    const live = await currentRunGuard(runId, generation, "profiling");
    if (!live) return;
    if (live.profile_index >= live.queue.length) {
      await writeState({ ...live, phase: "organizing", message: "Building deterministic folders…", error: null });
      return;
    }

    const summary = live.queue[live.profile_index];
    const result = await fetchConversationProfile(summary, token);
    const next = await currentRunGuard(runId, generation, "profiling");
    if (!next || next.profile_index !== live.profile_index) return;

    const profiles = { ...next.profiles, [summary.id]: result.profile };
    const failures = result.failure ? [...next.failures, result.failure].slice(-MAX_FAILURES) : next.failures;
    const index = next.profile_index + 1;
    await writeState({
      ...next,
      profiles,
      failures,
      profile_index: index,
      message: `Profiling existing chats… ${index.toLocaleString()} / ${next.queue.length.toLocaleString()}`,
      error: null
    });
    processed += 1;
  }
}

async function organize(state) {
  const settings = await readSettings();
  const profiles = Object.values(state.profiles || {});
  const deterministic = Core.groupConversations(profiles, Number(settings.max_groups) || 12);
  const next = await currentRunGuard(state.run_id, state.generation, "organizing");
  if (!next) return;

  const hasByok = Boolean(settings.byok?.enabled && settings.byok?.api_key && Core.PROVIDERS[settings.byok?.provider]);
  await writeState({
    ...next,
    deterministic_folders: deterministic,
    folders: deterministic,
    phase: hasByok ? "refining" : "done",
    message: hasByok ? "Deterministic folders ready. Asking your BYOK model to refine names/merges…" : `Organized ${profiles.length.toLocaleString()} chat(s) into ${deterministic.length.toLocaleString()} folder(s).`,
    completed_at: hasByok ? null : new Date().toISOString(),
    warning: null,
    error: null
  });
}

async function callByok(settings, folders) {
  const byok = settings.byok || {};
  const provider = Core.PROVIDERS[byok.provider];
  if (!provider) throw new Error("Unknown BYOK provider.");
  if (!byok.api_key) throw new Error("BYOK API key is missing.");
  if (!String(byok.model || "").trim()) throw new Error("BYOK model name is missing.");
  const permitted = await chrome.permissions.contains({ origins: [provider.permission] });
  if (!permitted) throw new Error(`Host permission for ${provider.label} was not granted.`);

  const payload = Core.makeRefinementPayload(folders);
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${byok.api_key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: byok.model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You organize proposed conversation groups. Return ONLY JSON in the exact form {\"groups\":[{\"name\":\"...\",\"source_group_ids\":[\"...\"]}]}. You may rename or merge provided groups. Never invent IDs. Omitted groups remain unchanged."
        },
        { role: "user", content: JSON.stringify(payload) }
      ]
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${provider.label} request failed (${response.status})${body ? `: ${body.slice(0, 180)}` : ""}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("BYOK provider returned no text content.");
  return Core.parseRefinementResponse(content);
}

async function refine(state) {
  const settings = await readSettings();
  const base = Array.isArray(state.deterministic_folders) ? state.deterministic_folders : [];
  let folders = base;
  let warning = null;
  try {
    const response = await callByok(settings, base);
    folders = Core.applyLlmRefinement(base, response);
  } catch (error) {
    warning = `BYOK refinement skipped: ${String(error?.message || error).slice(0, 280)}`;
  }
  const next = await currentRunGuard(state.run_id, state.generation, "refining");
  if (!next) return;
  await writeState({
    ...next,
    phase: "done",
    folders,
    warning,
    error: null,
    message: `Organized ${Object.keys(next.profiles || {}).length.toLocaleString()} chat(s) into ${folders.length.toLocaleString()} folder(s).`,
    completed_at: new Date().toISOString()
  });
}

async function runTick() {
  if (tickRunning) return;
  tickRunning = true;
  try {
    let state = await readState();
    if (!["enumerating", "profiling", "organizing", "refining"].includes(state.phase)) return;

    // Recovery alarm is armed before work begins. If this worker is suspended,
    // the next activation reconstructs progress entirely from storage.
    await scheduleTick(60000);

    if (state.phase === "organizing") {
      await organize(state);
    } else if (state.phase === "refining") {
      await refine(state);
    } else {
      let token;
      try {
        token = await getAccessToken();
      } catch (error) {
        state = await readState();
        if (error?.code === "NO_CHATGPT_TAB") await setWaitingForTab(state, state.phase);
        else await setError(state, state.phase, error);
        return;
      }
      state = await readState();
      if (state.phase === "enumerating") await enumerateSlice(state, token);
      else if (state.phase === "profiling") await profileSlice(state, token);
    }

    const after = await readState();
    if (["enumerating", "profiling", "organizing", "refining"].includes(after.phase)) await scheduleTick(800);
    else await chrome.alarms.clear(ALARM_NAME);
  } catch (error) {
    const state = await readState();
    if (["enumerating", "profiling", "organizing", "refining"].includes(state.phase)) {
      await setError(state, state.phase, error);
    }
  } finally {
    tickRunning = false;
  }
}

async function start() {
  const current = await readState();
  const runId = crypto.randomUUID();
  const cutoff = Date.now();
  const next = Core.startRun(current, cutoff, runId);
  await writeState(next);
  await ensureChatGPTTab();
  await scheduleTick(250);
  return { ok: true, run_id: runId, snapshot_cutoff_ms: cutoff };
}

async function pause() {
  const current = await readState();
  const next = Core.pauseRun(current);
  await writeState(next);
  await chrome.alarms.clear(ALARM_NAME);
  return { ok: true, phase: next.phase };
}

async function resume() {
  const current = await readState();
  const next = Core.resumeRun(current);
  await writeState(next);
  await ensureChatGPTTab();
  await scheduleTick(250);
  return { ok: true, phase: next.phase };
}

async function reset() {
  const current = await readState();
  const next = Core.resetRun(current);
  await chrome.alarms.clear(ALARM_NAME);
  await writeState(next);
  return { ok: true };
}

async function refineAgain() {
  const state = await readState();
  if (state.phase !== "done" || !state.deterministic_folders?.length) throw new Error("Finish a scan before running BYOK refinement.");
  await writeState({ ...state, phase: "refining", message: "Running BYOK refinement…", warning: null, completed_at: null });
  await scheduleTick(250);
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handlers = {
    START_ORGANIZER: start,
    PAUSE_ORGANIZER: pause,
    RESUME_ORGANIZER: resume,
    RESET_ORGANIZER: reset,
    RUN_BYOK_REFINEMENT: refineAgain,
    GET_ORGANIZER_STATE: async () => ({ ok: true, state: await readState() })
  };
  const handler = handlers[message?.type];
  if (!handler) return false;
  Promise.resolve()
    .then(handler)
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === ALARM_NAME) runTick();
});

chrome.runtime.onStartup.addListener(() => scheduleTick(1000));
chrome.runtime.onInstalled.addListener(() => scheduleTick(1500));

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!String(tab?.url || "").startsWith("https://chatgpt.com/")) return;
  readState().then((state) => {
    if (state.phase === "waiting_tab") {
      return writeState(Core.resumeRun(state)).then(() => scheduleTick(250));
    }
    if (["enumerating", "profiling"].includes(state.phase)) return scheduleTick(250);
    return null;
  }).catch(() => {});
});