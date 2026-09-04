const $ = id => document.getElementById(id);

async function sendBg(msg) {
  return chrome.runtime.sendMessage(msg);
}

async function activeLinkedInTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !tab.url?.startsWith("https://www.linkedin.com/")) {
    throw new Error("Open a linkedin.com connection-list page in the active tab.");
  }
  return tab;
}

async function ensureContentScript(tabId) {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    if (pong?.ok) return;
  } catch {}

  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  const pong = await chrome.tabs.sendMessage(tabId, { type: "PING" });
  if (!pong?.ok) throw new Error("Could not initialize the LinkedIn page helper.");
}

async function refresh() {
  const r = await sendBg({ type: "GET_STATE" });
  const state = r?.state || {};
  $("count").textContent = Object.keys(state.rows || {}).length;
  $("page").textContent = state.currentPage || 0;
  $("statusText").textContent = state.lastStatus || (state.running ? "Running…" : "Idle");
  if (state.config) {
    $("maxPages").value = state.config.maxPages || 99;
    $("delayMs").value = state.config.delayMs || 2500;
  }
}


$("validate").addEventListener("click", async () => {
  try {
    const tab = await activeLinkedInTab();
    await ensureContentScript(tab.id);
    const r = await chrome.tabs.sendMessage(tab.id, { type: "VALIDATE_PAGE" });
    if (!r?.ok) throw new Error("Page validation failed.");
    const samples = (r.sample || []).map(x =>
      [x.name, x.headline, x.location].filter(Boolean).join(" — ")
    );
    const sampleText = samples.length ? ` Sample: ${samples.join(" | ")}` : "";
    $("statusText").textContent =
      `Validation: ${r.count} connection rows from ${r.rawProfileLinks} visible /in/ links.${sampleText}`;
  } catch (e) {
    $("statusText").textContent = `Validation error: ${e.message}`;
  }
});

$("start").addEventListener("click", async () => {
  try {
    const tab = await activeLinkedInTab();
    await ensureContentScript(tab.id);
    const config = {
      maxPages: Number($("maxPages").value) || 99,
      delayMs: Number($("delayMs").value) || 2500
    };
    await sendBg({ type: "START_STATE", config, reset: false });
    await chrome.tabs.sendMessage(tab.id, { type: "START", config });
    await refresh();
  } catch (e) {
    $("statusText").textContent = e.message;
  }
});

$("stop").addEventListener("click", async () => {
  try {
    const tab = await activeLinkedInTab();
    try { await chrome.tabs.sendMessage(tab.id, { type: "STOP" }); } catch {}
    await sendBg({ type: "STOP_STATE", status: "Stopped by user" });
  } finally {
    await refresh();
  }
});

function quoteDelimited(value, delimiter) {
  let s = String(value ?? "").replace(/\r?\n/g, " ");
  // Prevent spreadsheet applications from interpreting profile-controlled text
  // as a formula when the exported CSV/TSV is opened.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (s.includes('"') || s.includes(delimiter) || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function exportRows(delimiter, extension) {
  const r = await sendBg({ type: "GET_STATE" });
  const rows = Object.values(r?.state?.rows || {});
  if (!rows.length) {
    $("statusText").textContent = "No collected rows to export.";
    return;
  }

  // Preserve the connection-list order: page first, then row within page.
  rows.sort((a, b) =>
    (Number(a.sourcePage) || 0) - (Number(b.sourcePage) || 0) ||
    (Number(a.rowOnPage) || 0) - (Number(b.rowOnPage) || 0) ||
    (a.name || "").localeCompare(b.name || "")
  );

  const headers = [
    "name", "connectionDegree", "headline", "location",
    "mutualConnections", "details", "url", "sourcePage",
    "rowOnPage", "capturedAt", "visibleText"
  ];

  const text = "\uFEFF" + [
    headers.join(delimiter),
    ...rows.map(row => headers.map(h => quoteDelimited(row[h], delimiter)).join(delimiter))
  ].join("\r\n");

  const mime = extension === "csv" ? "text/csv;charset=utf-8" : "text/tab-separated-values;charset=utf-8";
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `linkedin_connections_${new Date().toISOString().slice(0,10)}.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("csv").addEventListener("click", () => exportRows(",", "csv"));
$("tsv").addEventListener("click", () => exportRows("\t", "tsv"));

$("clear").addEventListener("click", async () => {
  await sendBg({ type: "CLEAR" });
  await refresh();
});

refresh();
setInterval(refresh, 1000);
