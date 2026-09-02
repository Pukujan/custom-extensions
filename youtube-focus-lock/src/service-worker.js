import { CONFIG } from "../lib/config.mjs";
import { isAllowedAt, findNextTransition } from "../lib/schedule.mjs";
import { buildBlockingRules, BLOCKING_RULE_IDS } from "../lib/urls.mjs";

const HEARTBEAT_ALARM = "yfl-heartbeat";
const TRANSITION_ALARM = "yfl-transition";
const BURN_IN_KEY = "burnIn";

async function markHealthy() {
  const now = Date.now();
  const current = await chrome.storage.local.get(BURN_IN_KEY);
  const state = current[BURN_IN_KEY] ?? { startedAtMs: now, failureCount: 0 };
  state.lastHealthyAtMs = now;
  await chrome.storage.local.set({ [BURN_IN_KEY]: state });
}

async function markFailure(error) {
  const now = Date.now();
  const current = await chrome.storage.local.get(BURN_IN_KEY);
  const state = current[BURN_IN_KEY] ?? { startedAtMs: now, failureCount: 0 };
  state.failureCount = (state.failureCount ?? 0) + 1;
  state.lastFailureAtMs = now;
  state.lastFailureMessage = String(error?.message ?? error).slice(0, 300);
  await chrome.storage.local.set({ [BURN_IN_KEY]: state });
}

async function setBlockingEnabled(enabled) {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: BLOCKING_RULE_IDS,
    addRules: enabled ? buildBlockingRules() : []
  });
}

async function redirectOpenYouTubeTabs() {
  const tabs = await chrome.tabs.query({
    url: ["*://*.youtube.com/*", "*://youtu.be/*", "*://*.youtube-nocookie.com/*"]
  });
  const blockedUrl = chrome.runtime.getURL("blocked.html");
  await Promise.all(tabs.filter((tab) => typeof tab.id === "number").map((tab) =>
    chrome.tabs.update(tab.id, { url: blockedUrl }).catch(() => undefined)
  ));
}

async function scheduleNextTransition(now = new Date()) {
  const transition = findNextTransition(now, CONFIG);
  await chrome.alarms.clear(TRANSITION_ALARM);
  chrome.alarms.create(TRANSITION_ALARM, { when: transition.getTime() });
}

async function enforce() {
  const now = new Date();
  const allowed = isAllowedAt(now, CONFIG);
  await setBlockingEnabled(!allowed);
  if (!allowed) await redirectOpenYouTubeTabs();
  await scheduleNextTransition(now);
  await markHealthy();
}

async function safelyEnforce() {
  try {
    await enforce();
  } catch (error) {
    console.error("YouTube Focus Lock enforcement failed", error);
    try {
      await setBlockingEnabled(true);
      await redirectOpenYouTubeTabs();
    } finally {
      await markFailure(error);
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(BURN_IN_KEY).then((current) => {
    if (!current[BURN_IN_KEY]) {
      return chrome.storage.local.set({ [BURN_IN_KEY]: { startedAtMs: Date.now(), failureCount: 0 } });
    }
  });
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });
  void safelyEnforce();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });
  void safelyEnforce();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === HEARTBEAT_ALARM || alarm.name === TRANSITION_ALARM) void safelyEnforce();
});

void safelyEnforce();
