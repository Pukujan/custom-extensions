export const BLOCK_RULE_IDS = Object.freeze([1001, 1002, 1003, 1101, 1102, 1103]);

const HOST_REGEXES = Object.freeze([
  "^https?://([^/]+\\.)?youtube\\.com/.*",
  "^https?://youtu\\.be/.*",
  "^https?://([^/]+\\.)?youtube-nocookie\\.com/.*"
]);

export function isUnlockActive(unlockUntil, now = Date.now()) {
  return Number.isFinite(unlockUntil) && unlockUntil > now;
}

export function computeUnlockUntil(now, durationMs) {
  if (!Number.isFinite(now) || !Number.isFinite(durationMs) || durationMs <= 0) {
    throw new TypeError("now and positive durationMs are required");
  }
  return now + durationMs;
}

export function buildBlockingRules(blockedPagePath = "/blocked.html") {
  const rules = [];
  HOST_REGEXES.forEach((regexFilter, index) => {
    rules.push({
      id: 1001 + index,
      priority: 100,
      action: { type: "redirect", redirect: { extensionPath: blockedPagePath } },
      condition: { regexFilter, resourceTypes: ["main_frame"] }
    });
    rules.push({
      id: 1101 + index,
      priority: 100,
      action: { type: "block" },
      condition: { regexFilter, resourceTypes: ["sub_frame"] }
    });
  });
  return rules;
}
