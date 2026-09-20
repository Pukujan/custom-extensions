"use strict";

function textDataUrl(content, mime) {
  return `data:${mime || "text/plain"};charset=utf-8,${encodeURIComponent(String(content ?? ""))}`;
}

async function downloadFiles(baseDirectory, files) {
  const downloadIds = [];
  for (const file of files) {
    const path = String(file.path || "").replace(/^\/+/, "");
    if (!path || path.includes("..")) throw new Error(`Unsafe download path: ${path}`);
    const filename = `${baseDirectory}/${path}`;
    const downloadId = await chrome.downloads.download({
      url: textDataUrl(file.content, file.mime),
      filename,
      saveAs: false,
      conflictAction: "uniquify",
    });
    downloadIds.push({ path, downloadId });
  }
  return downloadIds;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "DOWNLOAD_PROVENANCE_FILES") return false;

  (async () => {
    try {
      const baseDirectory = String(message.baseDirectory || "chatgpt-provenance");
      const files = Array.isArray(message.files) ? message.files : [];
      if (!files.length) throw new Error("No provenance files supplied.");
      const downloads = await downloadFiles(baseDirectory, files);
      sendResponse({ ok: true, downloads });
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || String(error) });
    }
  })();

  return true;
});
