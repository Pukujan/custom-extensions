"use strict";

const STATE_KEY = "chatgptProvenanceExporterState";
const button = document.getElementById("capture");
const pauseButton = document.getElementById("pause");
const resetButton = document.getElementById("reset");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const accountStartButton = document.getElementById("account-start");
const accountPauseButton = document.getElementById("account-pause");
const accountResetButton = document.getElementById("account-reset");
const accountStatusEl = document.getElementById("account-status");
const accountDetailsEl = document.getElementById("account-details");
const ACCOUNT_STATE_KEY = "chatgptProvenanceAccountState";

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
  if (state.status === "done") {
    details.push("Raw source: raw/conversation.response.json");
    details.push("Tool records: normalized/tool-events.jsonl");
    details.push("Sources/citations: normalized/citations.jsonl");
    details.push("Reconciliation: validation/reconciliation.json");
  }
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

function renderAccount(state) {
  if (!state) {
    accountStatusEl.textContent = "Ready";
    accountDetailsEl.textContent = "";
    accountStartButton.disabled = false;
    accountPauseButton.disabled = true;
    accountPauseButton.textContent = "Pause export";
    return;
  }
  const status = state.status || "ready";
  accountStatusEl.textContent =
    status === "running" || status === "enumerating" || status === "queued"
      ? "Account export running"
      : status === "paused"
        ? "Account export paused"
        : status === "done"
          ? "Account export complete"
          : status === "error"
            ? "Account export failed"
            : "Ready";

  const details = [];
  if (state.message) details.push(state.message);
  if (state.progress && Number.isFinite(state.progress.next_index) && Number.isFinite(state.progress.total)) {
    details.push(`Conversations: ${state.progress.next_index} / ${state.progress.total}`);
  }
  if (state.enumeration && Array.isArray(state.enumeration.summaries)) {
    details.push(`Unique conversations found: ${state.enumeration.summaries.length}`);
  }
  if (state.account_directory) details.push(`Download folder: ${state.account_directory}`);
  if (state.status === "done") {
    details.push("Manifest: manifest.json");
    details.push("Catalog: catalog/conversations.jsonl");
    details.push("Integrity: integrity/SHA256SUMS.json");
  }
  if (state.error) details.push(`Error: ${state.error}`);
  accountDetailsEl.textContent = details.join("\n");
  const active = ["enumerating", "queued", "running", "paused"].includes(status);
  accountStartButton.disabled = active && status !== "paused";
  accountStartButton.textContent = ["paused", "error"].includes(status) ? "Resume account export" : "Start account export";
  accountPauseButton.disabled = !active;
  accountPauseButton.textContent = status === "paused" ? "Resume export" : "Pause export";
}

async function startAccountExport() {
  try {
    const tab = await activeChatGPTTab();
    const current = await chrome.storage.local.get(ACCOUNT_STATE_KEY);
    const status = current[ACCOUNT_STATE_KEY]?.status;
    const type = ["paused", "error"].includes(status)
      ? "RESUME_PROVENANCE_ACCOUNT_EXPORT"
      : "START_PROVENANCE_ACCOUNT_EXPORT";
    const response = await chrome.tabs.sendMessage(tab.id, { type });
    if (!response?.ok) throw new Error(response?.error || "Account export request was rejected.");
  } catch (error) {
    accountStatusEl.textContent = "Account export failed";
    accountDetailsEl.textContent = error?.message || String(error);
  }
}

async function toggleAccountPause() {
  try {
    const value = await chrome.storage.local.get(ACCOUNT_STATE_KEY);
    const status = value[ACCOUNT_STATE_KEY]?.status;
    const type = status === "paused"
      ? "RESUME_PROVENANCE_ACCOUNT_EXPORT"
      : "PAUSE_PROVENANCE_ACCOUNT_EXPORT";
    const tab = await activeChatGPTTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type });
    if (!response?.ok) throw new Error(response?.error || "Account export control was rejected.");
  } catch (error) {
    accountStatusEl.textContent = "Account export control failed";
    accountDetailsEl.textContent = error?.message || String(error);
  }
}

async function resetAccountExport() {
  try {
    const tab = await activeChatGPTTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type: "RESET_PROVENANCE_ACCOUNT_EXPORT" });
    if (!response?.ok) throw new Error(response?.error || "Account export reset was rejected.");
  } catch (_error) {
    await chrome.storage.local.remove(ACCOUNT_STATE_KEY);
    renderAccount(null);
  }
}

button.addEventListener("click", startCapture);
pauseButton.addEventListener("click", togglePause);
resetButton.addEventListener("click", resetCapture);
accountStartButton.addEventListener("click", startAccountExport);
accountPauseButton.addEventListener("click", toggleAccountPause);
accountResetButton.addEventListener("click", resetAccountExport);

chrome.storage.local.get([STATE_KEY, ACCOUNT_STATE_KEY]).then((value) => {
  render(value[STATE_KEY]);
  renderAccount(value[ACCOUNT_STATE_KEY]);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[STATE_KEY]) render(changes[STATE_KEY].newValue);
  if (changes[ACCOUNT_STATE_KEY]) renderAccount(changes[ACCOUNT_STATE_KEY].newValue);
});
