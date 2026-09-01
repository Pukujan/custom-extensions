"use strict";

const STATE_KEY = "chatgptTranscriptExporterState";
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const mdButton = document.getElementById("export-md");
const jsonButton = document.getElementById("export-json");

function humanState(state) {
  if (!state || !state.status) return ["Ready", "Open a ChatGPT conversation and choose an export format."];
  if (state.status === "running") {
    return [
      `Exporting… ${state.capturedTurns || 0} turns captured`,
      `Sweep ${state.pass || 0}${state.phase ? ` · ${state.phase}` : ""}. You may close this popup; the tab runner continues.`,
    ];
  }
  if (state.status === "done") {
    return [
      state.complete ? "Export downloaded" : "Export downloaded with partial warning",
      `${state.capturedTurns || 0} turns · ${state.filename || "file"}${state.warning ? ` · ${state.warning}` : ""}`,
    ];
  }
  if (state.status === "error") return ["Export failed", state.error || "Unknown error"];
  return [state.status, state.phase || ""];
}

async function render() {
  const state = (await chrome.storage.local.get(STATE_KEY))[STATE_KEY];
  const [title, details] = humanState(state);
  statusEl.textContent = title;
  detailsEl.textContent = details;
}

async function activeChatGptTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !String(tab.url || "").startsWith("https://chatgpt.com/")) {
    throw new Error("The active tab must be a chatgpt.com conversation.");
  }
  return tab;
}

async function start(format) {
  try {
    const tab = await activeChatGptTab();
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "START_TRANSCRIPT_EXPORT",
      format,
    });
    if (!response?.ok) throw new Error(response?.error || "Could not start export.");
    await render();
  } catch (error) {
    statusEl.textContent = "Could not start export";
    detailsEl.textContent = error.message || String(error);
  }
}

mdButton.addEventListener("click", () => start("markdown"));
jsonButton.addEventListener("click", () => start("json"));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STATE_KEY]) render();
});
render();
