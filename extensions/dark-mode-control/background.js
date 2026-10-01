importScripts('core.js');
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'dark-control:get-settings') return false;
  const host = DarkControl.hostname(sender.tab?.url);
  chrome.storage.local.get(['masterEnabled', DarkControl.siteKey(host)])
    .then(stored => respond({ settings: DarkControl.resolve(stored, host) }))
    .catch(() => respond({ error: 'Could not read dark mode settings.' }));
  return true;
});
