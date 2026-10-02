"use strict";

const Core = globalThis.ChatHistoryOrganizerCore;
const STATE_KEY = "chatHistoryOrganizerStateV1";
const SETTINGS_KEY = "chatHistoryOrganizerSettingsV1";
const $ = (id) => document.getElementById(id);

const phaseEl = $("phase");
const progressEl = $("progress");
const messageEl = $("message");
const detailEl = $("detail");
const startBtn = $("startBtn");
const pauseBtn = $("pauseBtn");
const resumeBtn = $("resumeBtn");
const resetBtn = $("resetBtn");
const libraryBtn = $("libraryBtn");
const byokEnabled = $("byokEnabled");
const providerEl = $("provider");
const modelEl = $("model");
const apiKeyEl = $("apiKey");
const saveByokBtn = $("saveByokBtn");
const refineBtn = $("refineBtn");
const byokStatus = $("byokStatus");

let state = Core.freshState(0);
let settings = null;

function defaultSettings() {
  return { max_groups: 12, byok: { enabled: false, provider: "openai", model: "", api_key: "" } };
}

async function load() {
  const obj = await chrome.storage.local.get([STATE_KEY, SETTINGS_KEY]);
  state = obj[STATE_KEY] || Core.freshState(0);
  settings = { ...defaultSettings(), ...(obj[SETTINGS_KEY] || {}), byok: { ...defaultSettings().byok, ...(obj[SETTINGS_KEY]?.byok || {}) } };
  render();
}

function progressText(s) {
  if (s.phase === "enumerating") return `${s.enumeration?.queue?.length || 0} found`;
  if (["profiling", "paused", "waiting_tab", "error"].includes(s.phase) && s.queue?.length) return `${s.profile_index || 0} / ${s.queue.length}`;
  if (["organizing", "refining", "done"].includes(s.phase)) return `${Object.keys(s.profiles || {}).length} chats`;
  return "";
}

function render() {
  phaseEl.textContent = state.phase || "idle";
  progressEl.textContent = progressText(state);
  messageEl.textContent = state.message || "";
  const notes = [];
  if (state.snapshot_cutoff_ms) notes.push(`Snapshot: ${new Date(state.snapshot_cutoff_ms).toLocaleString()}`);
  if (state.failures?.length) notes.push(`${state.failures.length} chat(s) used title-only fallback`);
  if (state.warning) notes.push(state.warning);
  if (state.error) notes.push(state.error);
  detailEl.textContent = notes.join(" · ");

  const active = ["enumerating", "profiling", "organizing", "refining"].includes(state.phase);
  startBtn.disabled = state.phase !== "idle";
  pauseBtn.disabled = !active;
  resumeBtn.disabled = !["paused", "waiting_tab", "error"].includes(state.phase);
  resetBtn.disabled = state.phase === "idle";
  libraryBtn.disabled = !(state.folders?.length);
  refineBtn.disabled = state.phase !== "done" || !settings?.byok?.enabled || !settings?.byok?.api_key;

  byokEnabled.checked = Boolean(settings?.byok?.enabled);
  providerEl.value = settings?.byok?.provider || "openai";
  modelEl.value = settings?.byok?.model || Core.PROVIDERS[providerEl.value]?.defaultModel || "";
  byokStatus.textContent = settings?.byok?.api_key ? "API key saved in extension-local storage." : "No API key saved.";
}

async function command(type) {
  const result = await chrome.runtime.sendMessage({ type });
  if (!result?.ok) throw new Error(result?.error || "Extension command failed.");
  await load();
}

for (const [id, provider] of Object.entries(Core.PROVIDERS)) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = provider.label;
  providerEl.appendChild(option);
}

providerEl.addEventListener("change", () => {
  const p = Core.PROVIDERS[providerEl.value];
  if (p) modelEl.value = p.defaultModel;
});

startBtn.addEventListener("click", () => command("START_ORGANIZER").catch((e) => { detailEl.textContent = e.message; }));
pauseBtn.addEventListener("click", () => command("PAUSE_ORGANIZER").catch((e) => { detailEl.textContent = e.message; }));
resumeBtn.addEventListener("click", () => command("RESUME_ORGANIZER").catch((e) => { detailEl.textContent = e.message; }));
resetBtn.addEventListener("click", async () => {
  if (!confirm("Reset the organizer? This clears its local folder/index state but does not change ChatGPT.")) return;
  await command("RESET_ORGANIZER").catch((e) => { detailEl.textContent = e.message; });
});
libraryBtn.addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("library.html") }));
refineBtn.addEventListener("click", () => command("RUN_BYOK_REFINEMENT").catch((e) => { byokStatus.textContent = e.message; }));

saveByokBtn.addEventListener("click", async () => {
  try {
    const provider = Core.PROVIDERS[providerEl.value];
    if (!provider) throw new Error("Choose a supported provider.");
    if (byokEnabled.checked) {
      const granted = await chrome.permissions.request({ origins: [provider.permission] });
      if (!granted) throw new Error(`Permission for ${provider.label} was not granted.`);
    }
    if (byokEnabled.checked && !modelEl.value.trim()) throw new Error("Enter the model name used by this provider.");
    const existingKey = settings?.byok?.api_key || "";
    const next = {
      ...(settings || defaultSettings()),
      byok: {
        enabled: byokEnabled.checked,
        provider: providerEl.value,
        model: modelEl.value.trim() || provider.defaultModel,
        api_key: apiKeyEl.value.trim() || existingKey
      }
    };
    await chrome.storage.local.set({ [SETTINGS_KEY]: next });
    apiKeyEl.value = "";
    settings = next;
    byokStatus.textContent = next.byok.api_key ? "BYOK settings saved." : "Settings saved; add an API key to enable refinement.";
    render();
  } catch (error) {
    byokStatus.textContent = error?.message || String(error);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[STATE_KEY] || changes[SETTINGS_KEY]) load().catch(() => {});
});

load().catch((error) => { detailEl.textContent = error?.message || String(error); });