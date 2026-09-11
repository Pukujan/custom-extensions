import { UNLOCK_MS, STORAGE_KEYS } from "./lib/config.mjs";
import { BLOCK_RULE_IDS, buildBlockingRules, computeUnlockUntil, isUnlockActive, isUnlockExpired } from "./lib/lock.mjs";

const EXPIRY_ALARM = "youtube-dsa-unlock-expiry";

async function setLocked(locked) {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [...BLOCK_RULE_IDS],
    addRules: locked ? buildBlockingRules() : []
  });
}

async function status() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.unlockUntil);
  const unlockUntil = stored[STORAGE_KEYS.unlockUntil];
  const now = Date.now();
  return {
    unlocked: isUnlockActive(unlockUntil, now),
    expired: isUnlockExpired(unlockUntil, now),
    unlockUntil: isUnlockActive(unlockUntil, now) ? unlockUntil : null
  };
}

async function lockAndResetChallenge() {
  await chrome.storage.local.remove([STORAGE_KEYS.unlockUntil, STORAGE_KEYS.challenge]);
  await chrome.alarms.clear(EXPIRY_ALARM);
  await setLocked(true);
}

async function reconcile() {
  const current = await status();
  if (current.unlocked) {
    await setLocked(false);
    chrome.alarms.create(EXPIRY_ALARM, { when: current.unlockUntil });
    return current;
  }

  if (current.expired) {
    await lockAndResetChallenge();
  } else {
    await chrome.alarms.clear(EXPIRY_ALARM);
    await setLocked(true);
  }
  return { unlocked: false, expired: current.expired, unlockUntil: null };
}

async function unlock() {
  const unlockUntil = computeUnlockUntil(Date.now(), UNLOCK_MS);
  await chrome.storage.local.set({ [STORAGE_KEYS.unlockUntil]: unlockUntil });
  await setLocked(false);
  chrome.alarms.create(EXPIRY_ALARM, { when: unlockUntil });
  return { unlocked: true, unlockUntil };
}

chrome.runtime.onInstalled.addListener(() => void reconcile());
chrome.runtime.onStartup.addListener(() => void reconcile());
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === EXPIRY_ALARM) void lockAndResetChallenge();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "get-status") {
    reconcile().then(sendResponse, (error) => sendResponse({ error: String(error) }));
    return true;
  }
  if (message?.type === "unlock") {
    unlock().then(sendResponse, (error) => sendResponse({ error: String(error) }));
    return true;
  }
  return false;
});

void reconcile();
