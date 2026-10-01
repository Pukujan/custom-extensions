(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let host = null;
  let tabId;
  let site = DarkControl.normalize();
  let masterEnabled = true;
  let writes = Promise.resolve();
  function status(text, error = false) {
    $('status').textContent = text;
    $('status').dataset.error = String(error);
  }
  function render() {
    $('master').checked = masterEnabled;
    $('enabled').checked = site.enabled;
    $('adjustments').disabled = !host || !masterEnabled || !site.enabled;
    for (const key of ['contrast', 'brightness', 'sepia']) {
      $(key).value = site[key];
      $(`${key}-value`).textContent = `${site[key]}%`;
    }
  }
  async function probe() {
    if (!host) { status('Open a normal website to adjust its appearance. Browser pages, stores and PDFs are restricted.'); return; }
    try {
      const result = await chrome.tabs.sendMessage(tabId, { type: 'dark-control:status' }, { frameId: 0 });
      if (result?.error) status(result.error, true);
      else if (!result?.ready) status('Page is still loading. Reopen this panel in a moment.');
      else status(result.enabled ? 'Dark mode is on. Changes are saved for this site.' : 'Original appearance is on. Your settings are saved.');
    } catch { status('Settings saved. Reload this tab to apply dark mode. Some pages are restricted by Brave.'); }
  }
  function enqueue(operation) {
    status('Saving…');
    writes = writes.then(operation).then(probe).catch(() => status('Could not save settings. Close and reopen this panel to retry.', true));
  }
  $('master').addEventListener('change', () => {
    masterEnabled = $('master').checked;
    render();
    const snapshot = masterEnabled;
    enqueue(() => chrome.storage.local.set({ masterEnabled: snapshot }));
  });
  function saveSite() {
    const snapshot = { ...site };
    enqueue(() => chrome.storage.local.set({ [DarkControl.siteKey(host)]: snapshot }));
  }
  $('enabled').addEventListener('change', () => {
    site.enabled = $('enabled').checked;
    render();
    saveSite();
  });
  for (const key of ['contrast', 'brightness', 'sepia']) {
    $(key).addEventListener('input', () => {
      site[key] = Number($(key).value);
      $(`${key}-value`).textContent = `${site[key]}%`;
      saveSite();
    });
  }
  $('reset').addEventListener('click', () => {
    site = DarkControl.normalize();
    render();
    enqueue(() => chrome.storage.local.remove(DarkControl.siteKey(host)));
  });
  async function init() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id;
      host = DarkControl.hostname(tab?.url);
      const stored = await chrome.storage.local.get(['masterEnabled', DarkControl.siteKey(host)]);
      site = DarkControl.normalize(stored[DarkControl.siteKey(host)]);
      masterEnabled = stored.masterEnabled !== false;
      $('hostname').textContent = host || 'Unavailable on this page';
      $('master').disabled = false;
      $('enabled').disabled = !host;
      $('reset').disabled = !host;
      render();
      await probe();
    } catch { status('Could not load settings. Close and reopen this panel to retry.', true); }
  }
  init();
})();
