"use strict";

const STATE_KEY = "chatHistoryOrganizerStateV1";
const searchEl = document.getElementById("search");
const foldersEl = document.getElementById("folders");
const metaEl = document.getElementById("meta");
const noticeEl = document.getElementById("notice");
let state = null;

function chatMatches(profile, query) {
  if (!query) return true;
  const haystack = `${profile?.title || ""} ${(profile?.keywords || []).join(" ")}`.toLowerCase();
  return query.split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

function render() {
  foldersEl.innerHTML = "";
  if (!state?.folders?.length) {
    foldersEl.innerHTML = '<div class="empty">No organized library yet. Run the extension scan first.</div>';
    metaEl.textContent = "";
    return;
  }
  const query = searchEl.value.trim().toLowerCase();
  const profiles = state.profiles || {};
  const total = Object.keys(profiles).length;
  metaEl.textContent = `${total.toLocaleString()} existing chat(s) · ${state.folders.length.toLocaleString()} folder(s) · snapshot ${new Date(state.snapshot_cutoff_ms).toLocaleString()}`;
  noticeEl.textContent = state.warning || "";

  let visibleFolders = 0;
  for (const folder of state.folders) {
    const members = (folder.conversation_ids || [])
      .map((id) => profiles[id])
      .filter(Boolean)
      .filter((p) => chatMatches(p, query));
    if (!members.length) continue;
    visibleFolders += 1;

    const details = document.createElement("details");
    details.className = "folder";
    details.open = Boolean(query) || visibleFolders <= 2;
    const summary = document.createElement("summary");
    const name = document.createElement("span");
    name.textContent = folder.name;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${members.length} chat${members.length === 1 ? "" : "s"}`;
    summary.append(name, count);

    const list = document.createElement("div");
    list.className = "chats";
    members.sort((a, b) => (b.update_time || "").localeCompare(a.update_time || "") || a.title.localeCompare(b.title));
    for (const chat of members) {
      const link = document.createElement("a");
      link.className = "chat";
      link.href = `https://chatgpt.com/c/${encodeURIComponent(chat.id)}`;
      link.target = "_blank";
      link.rel = "noreferrer";
      const title = document.createElement("span");
      title.textContent = chat.title || "Untitled chat";
      const tags = document.createElement("span");
      tags.className = "tags";
      tags.textContent = (chat.keywords || []).slice(0, 4).join(" · ");
      link.append(title, tags);
      list.appendChild(link);
    }
    details.append(summary, list);
    foldersEl.appendChild(details);
  }
  if (!visibleFolders) foldersEl.innerHTML = '<div class="empty">No chats match that search.</div>';
}

async function load() {
  const obj = await chrome.storage.local.get(STATE_KEY);
  state = obj[STATE_KEY] || null;
  render();
}

searchEl.addEventListener("input", render);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STATE_KEY]) load().catch(() => {});
});
load().catch((error) => { noticeEl.textContent = error?.message || String(error); });