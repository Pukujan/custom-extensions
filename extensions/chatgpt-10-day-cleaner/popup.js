"use strict";

const STATE_KEY = "cleanerStateV2";
const TARGET = "chatgpt-cleaner-runner-v2";
const $ = (id) => document.getElementById(id);

const daysEl = $("days");
const basisEl = $("basis");
const scanBtn = $("scanBtn");
const cancelBtn = $("cancelBtn");
const statusEl = $("status");
const progressWrapEl = $("progressWrap");
const progressBarEl = $("progressBar");
const progressTextEl = $("progressText");
const resultsCard = $("resultsCard");
const totalCountEl = $("totalCount");
const eligibleCountEl = $("eligibleCount");
const cutoffTextEl = $("cutoffText");
const previewListEl = $("previewList");
const previewMetaEl = $("previewMeta");
const dangerZoneEl = $("dangerZone");
const confirmTextEl = $("confirmText");
const deleteBtn = $("deleteBtn");

let currentState = null;

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`.trim();
}

async function getActiveChatGPTTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url) {
    throw new Error("No active browser tab found.");
  }

  let host;
  try {
    host = new URL(tab.url).hostname;
  } catch {
    throw new Error("Open https://chatgpt.com first.");
  }

  if (host !== "chatgpt.com" && !host.endsWith(".chatgpt.com")) {
    throw new Error("Make a chatgpt.com tab active, then open this extension.");
  }

  return tab;
}

async function sendToRunner(message) {
  const tab = await getActiveChatGPTTab();

  async function pingOrSend() {
    return chrome.tabs.sendMessage(tab.id, { target: TARGET, ...message });
  }

  try {
    return await pingOrSend();
  } catch (_) {
    // Handles an already-open ChatGPT tab after installing/updating the
    // unpacked extension. Inject the persistent runner without requiring
    // the user to manually refresh first.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["core.js", "runner.js"]
    });
    return await pingOrSend();
  }
}

function renderPreview(scan) {
  totalCountEl.textContent = Number(scan.total || 0).toLocaleString();
  eligibleCountEl.textContent = Number(scan.eligible || 0).toLocaleString();

  const fieldName = scan.basis === "created" ? "created" : "last updated";
  cutoffTextEl.textContent =
    `Frozen cutoff: chats ${fieldName} before ${new Date(scan.cutoffMs).toLocaleString()} are eligible.`;

  previewListEl.innerHTML = "";
  const preview = Array.isArray(scan.preview) ? scan.preview : [];

  if (!preview.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No chats match this dry-run snapshot.";
    previewListEl.appendChild(li);
  } else {
    for (const chat of preview) {
      const li = document.createElement("li");

      const title = document.createElement("span");
      title.className = "title";
      title.textContent = chat.title || "Untitled chat";

      const date = document.createElement("span");
      date.className = "date";
      date.textContent = chat.time
        ? new Date(chat.time).toLocaleString()
        : "Unknown date";

      li.append(title, date);
      previewListEl.appendChild(li);
    }
  }

  previewMetaEl.textContent =
    scan.eligible > scan.shown
      ? `showing oldest ${scan.shown} of ${scan.eligible}`
      : `${scan.shown || 0} shown`;
}

function render(state) {
  currentState = state || null;

  const status = state?.status || "idle";
  const isRunning = status === "scanning" || status === "deleting";
  const hasSnapshot = Boolean(state?.scan?.id) &&
    ["ready", "deleting", "complete", "cancelled", "error"].includes(status);

  if (state?.settings) {
    if (document.activeElement !== daysEl) daysEl.value = state.settings.days ?? 10;
    if (document.activeElement !== basisEl) basisEl.value = state.settings.basis || "updated";
  }

  scanBtn.disabled = isRunning;
  daysEl.disabled = isRunning;
  basisEl.disabled = isRunning;
  cancelBtn.classList.toggle("hidden", !isRunning);

  if (state?.message) {
    const kind = status === "error" ? "error" :
      (status === "ready" || status === "complete") ? "success" : "";
    setStatus(state.lastError ? `${state.message} ${state.lastError}` : state.message, kind);
  } else {
    setStatus("Open chatgpt.com, sign in, then scan.");
  }

  if (status === "deleting" && state.deletion) {
    const done = Number(state.deletion.index || 0);
    const total = Number(state.deletion.total || 0);
    const pct = total ? Math.min(100, Math.max(0, done / total * 100)) : 100;
    progressWrapEl.classList.remove("hidden");
    progressBarEl.style.width = `${pct}%`;
    progressTextEl.textContent =
      `${done.toLocaleString()} / ${total.toLocaleString()} processed · ` +
      `${Number(state.deletion.deleted || 0).toLocaleString()} deleted · ` +
      `${Number(state.deletion.failed || 0).toLocaleString()} failed`;
  } else if (status === "scanning" && state.scan) {
    progressWrapEl.classList.remove("hidden");
    progressBarEl.style.width = "12%";
    progressTextEl.textContent =
      `${Number(state.scan.scanned || 0).toLocaleString()} chat(s) read so far`;
  } else {
    progressWrapEl.classList.add("hidden");
  }

  if (hasSnapshot && state.scan) {
    resultsCard.classList.remove("hidden");
    renderPreview(state.scan);
  } else {
    resultsCard.classList.add("hidden");
  }

  dangerZoneEl.classList.toggle("hidden", status !== "ready");

  const canDelete =
    status === "ready" &&
    Number(state?.scan?.eligible || 0) > 0 &&
    confirmTextEl.value.trim() === "DELETE";
  deleteBtn.disabled = !canDelete;
}

async function loadState() {
  const obj = await chrome.storage.local.get(STATE_KEY);
  render(obj[STATE_KEY] || null);
}

confirmTextEl.addEventListener("input", () => render(currentState));

scanBtn.addEventListener("click", async () => {
  const days = Number(daysEl.value);
  const basis = basisEl.value === "created" ? "created" : "updated";

  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    setStatus("Enter a number of days between 1 and 3650.", "error");
    return;
  }

  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  setStatus("Starting persistent dry scan…");
  scanBtn.disabled = true;

  try {
    const response = await sendToRunner({
      type: "START_SCAN",
      days,
      basis,
      cutoffMs
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Runner rejected the scan.");
    }

    confirmTextEl.value = "";
    await loadState();
  } catch (err) {
    setStatus(err?.message || String(err), "error");
    scanBtn.disabled = false;
  }
});

deleteBtn.addEventListener("click", async () => {
  if (
    currentState?.status !== "ready" ||
    !currentState?.scan?.id ||
    confirmTextEl.value.trim() !== "DELETE"
  ) return;

  const okay = confirm(
    `Delete the ${currentState.scan.eligible.toLocaleString()} chat(s) captured by this dry-run snapshot?\n\n` +
    `The cutoff will NOT be recalculated.`
  );
  if (!okay) return;

  deleteBtn.disabled = true;

  try {
    const response = await sendToRunner({
      type: "START_DELETE",
      scanId: currentState.scan.id,
      confirmation: "DELETE"
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Runner rejected the delete request.");
    }

    confirmTextEl.value = "";
    await loadState();
  } catch (err) {
    setStatus(err?.message || String(err), "error");
    render(currentState);
  }
});

cancelBtn.addEventListener("click", async () => {
  try {
    const response = await sendToRunner({ type: "CANCEL" });
    if (!response?.ok) throw new Error(response?.error || "Could not stop the operation.");
    await loadState();
  } catch (err) {
    setStatus(err?.message || String(err), "error");
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[STATE_KEY]) {
    render(changes[STATE_KEY].newValue);
  }
});

loadState().catch((err) => setStatus(err?.message || String(err), "error"));
