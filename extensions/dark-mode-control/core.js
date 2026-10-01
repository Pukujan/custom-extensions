(function (root) {
  'use strict';
  const defaults = Object.freeze({ enabled: true, contrast: 100, brightness: 100, sepia: 0 });
  function number(value, fallback, min, max) {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
  }
  function normalize(value) {
    const input = value && typeof value === 'object' ? value : {};
    const own = key => Object.hasOwn(input, key) ? input[key] : undefined;
    return {
      enabled: typeof own('enabled') === 'boolean' ? own('enabled') : defaults.enabled,
      contrast: number(own('contrast'), 100, 50, 150),
      brightness: number(own('brightness'), 100, 50, 150),
      sepia: number(own('sepia'), 0, 0, 100)
    };
  }
  function hostname(url) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
      if (parsed.hostname === 'chromewebstore.google.com' ||
          (parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore'))) return null;
      return parsed.hostname;
    } catch { return null; }
  }
  const siteKey = host => `site:${host}`;
  function resolve(stored, host) {
    const key = siteKey(host);
    const settings = normalize(Object.hasOwn(stored, key) ? stored[key] : undefined);
    const masterEnabled = !Object.hasOwn(stored, 'masterEnabled') || stored.masterEnabled !== false;
    return { ...settings, masterEnabled, enabled: Boolean(host) && masterEnabled && settings.enabled };
  }
  const api = { defaults, normalize, hostname, siteKey, resolve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DarkControl = api;
})(globalThis);
