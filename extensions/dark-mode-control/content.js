(() => {
  'use strict';
  let revision = 0;
  let state = { ready: false, enabled: false, error: null };
  let lastTheme = '';
  DarkReader.setFetchMethod(url => fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' }));
  async function refresh() {
    const current = ++revision;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'dark-control:get-settings' });
      if (current !== revision) return;
      if (!response?.settings || response.error) throw new Error(response?.error || 'Settings unavailable.');
      const settings = response.settings;
      const signature = JSON.stringify(settings);
      if (signature !== lastTheme) {
        if (settings.enabled) DarkReader.enable({
          mode: 1, contrast: settings.contrast, brightness: settings.brightness, sepia: settings.sepia
        });
        else DarkReader.disable();
        lastTheme = signature;
      }
      state = { ready: true, enabled: settings.enabled, settings, error: null };
    } catch (error) {
      if (current !== revision) return;
      DarkReader.disable();
      lastTheme = '';
      state = { ready: true, enabled: false, error: error.message };
    }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.keys(changes).some(key => key === 'masterEnabled' || key.startsWith('site:'))) refresh();
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'dark-control:status') return false;
    refresh().then(() => respond(state));
    return true;
  });
  refresh();
})();
