"use strict";

const STATE_KEY = "chatgptProvenanceExporterState";
const button = document.getElementById("capture");
const pauseButton = document.getElementById("pause");
const resetButton = document.getElementById("reset");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");

function render(state) {
  if (!state) {
    statusEl.textContent = "Ready";
    detailsEl.textContent = "";
    return;
  }
  statusEl.textContent =
    state.status === "running"
      ? `Capturing… ${state.phase || ""}`
      : state.status === "paused"
        ? "Capture paused"
      : state.status === "done"
        ? "Capture complete"
        : state.status === "error"
          ? "Capture failed"
          : "Ready";

  const details = [];
  if (Number.isFinite(state.sourceNodes)) details.push(`Source nodes: ${state.sourceNodes}`);
  if (Number.isFinite(state.toolEvents)) details.push(`Tool events: ${state.toolEvents}`);
  if (Number.isFinite(state.citationRecords)) details.push(`Citation records: ${state.citationRecords}`);
  if (Number.isFinite(state.renderedTurns)) details.push(`Rendered turns: ${state.renderedTurns}`);
  if (typeof state.renderedStable === "boolean") details.push(`Rendered stable: ${state.renderedStable}`);
  if (state.baseDirectory) details.push(`Download folder: ${state.baseDirectory}`);
  if (state.error) details.push(`Error: ${state.error}`);
  detailsEl.textContent = details.join("\n");
  const active = state.status === "running" || state.status === "paused";
  button.disabled = active;
  pauseButton.disabled = !active;
  pauseButton.textContent = state.status === "paused" ? "Resume capture" : "Pause capture";
}

async function activeChatGPTTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error("No active tab.");
  const url = new URL(tab.url);
  if (url.hostname !== "chatgpt.com") throw new Error("Open a chatgpt.com conversation first.");
  return tab;
}

async function startCapture() {
  try {
    const tab = await activeChatGPTTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type: "START_PROVENANCE_CAPTURE" });
    if (!response?.ok) throw new Error(response?.error || "Capture request was rejected.");
  } catch (error) {
    statusEl.textContent = "Capture failed";
    detailsEl.textContent = error?.message || String(error);
  }
}

async function sendControl(type) {
  const tab = await activeChatGPTTab();
  const response = await chrome.tabs.sendMessage(tab.id, { type });
  if (!response?.ok) throw new Error(response?.error || "Capture control request was rejected.");
}

async function togglePause() {
  try {
    const value = await chrome.storage.local.get(STATE_KEY);
    await sendControl(value[STATE_KEY]?.status === "paused" ? "RESUME_PROVENANCE_CAPTURE" : "PAUSE_PROVENANCE_CAPTURE");
  } catch (error) {
    statusEl.textContent = "Capture control failed";
    detailsEl.textContent = error?.message || String(error);
  }
}

async function resetCapture() {
  try {
    await sendControl("RESET_PROVENANCE_CAPTURE");
  } catch (_error) {
    await chrome.storage.local.remove(STATE_KEY);
    render(null);
  }
}

button.addEventListener("click", startCapture);
pauseButton.addEventListener("click", togglePause);
resetButton.addEventListener("click", resetCapture);

chrome.storage.local.get(STATE_KEY).then((value) => render(value[STATE_KEY]));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STATE_KEY]) render(changes[STATE_KEY].newValue);
});
