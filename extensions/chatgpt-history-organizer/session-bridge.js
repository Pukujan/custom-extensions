(() => {
  "use strict";
  if (globalThis.__CHAT_HISTORY_ORGANIZER_SESSION_BRIDGE__) return;
  globalThis.__CHAT_HISTORY_ORGANIZER_SESSION_BRIDGE__ = true;

  async function getAccessToken() {
    const response = await fetch("/api/auth/session", { credentials: "include" });
    if (!response.ok) throw new Error(`Session request failed (${response.status}).`);
    const data = await response.json();
    if (!data?.accessToken) throw new Error("No ChatGPT access token found. Sign in to ChatGPT first.");
    return data.accessToken;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "GET_CHATGPT_ACCESS_TOKEN") return false;
    getAccessToken()
      .then((accessToken) => sendResponse({ ok: true, accessToken }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  });
})();