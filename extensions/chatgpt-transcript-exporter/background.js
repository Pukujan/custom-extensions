"use strict";

function textDataUrl(content, mime) {
  return `data:${mime || "text/plain"};charset=utf-8,${encodeURIComponent(content)}`;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "DOWNLOAD_TEXT_EXPORT") return false;

  chrome.downloads
    .download({
      url: textDataUrl(String(message.content || ""), message.mime),
      filename: String(message.filename || "chatgpt-transcript.txt"),
      saveAs: true,
    })
    .then((downloadId) => sendResponse({ ok: true, downloadId }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});
