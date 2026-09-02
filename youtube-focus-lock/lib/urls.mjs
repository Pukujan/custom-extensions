const BLOCKED_HOSTS = ["youtube.com", "youtu.be", "youtube-nocookie.com"];

export function isYouTubeHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return BLOCKED_HOSTS.some((base) => host === base || host.endsWith(`.${base}`));
}

export function shouldBlockUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return (url.protocol === "http:" || url.protocol === "https:") && isYouTubeHost(url.hostname);
  } catch {
    return false;
  }
}

export function buildBlockingRules(blockedPagePath = "/blocked.html") {
  return [
    {
      id: 1001,
      priority: 100,
      action: { type: "redirect", redirect: { extensionPath: blockedPagePath } },
      condition: {
        regexFilter: "^https?://([^/]+\\.)?youtube\\.com/.*",
        resourceTypes: ["main_frame", "sub_frame"]
      }
    },
    {
      id: 1002,
      priority: 100,
      action: { type: "redirect", redirect: { extensionPath: blockedPagePath } },
      condition: {
        regexFilter: "^https?://youtu\\.be/.*",
        resourceTypes: ["main_frame", "sub_frame"]
      }
    },
    {
      id: 1003,
      priority: 100,
      action: { type: "redirect", redirect: { extensionPath: blockedPagePath } },
      condition: {
        regexFilter: "^https?://([^/]+\\.)?youtube-nocookie\\.com/.*",
        resourceTypes: ["main_frame", "sub_frame"]
      }
    }
  ];
}

export const BLOCKING_RULE_IDS = Object.freeze([1001, 1002, 1003]);
