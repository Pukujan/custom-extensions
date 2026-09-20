(() => {
  "use strict";

  const STATE_KEY = "chatgptProvenanceExporterState";
  const values = new Map();
  const storageListeners = new Set();
  const runtimeListeners = new Set();
  let bundle = null;

  function change(oldValue, newValue) {
    return { oldValue, newValue };
  }

  const storage = {
    local: {
      async get(key) {
        if (typeof key === "string") return { [key]: values.get(key) };
        return Object.fromEntries(values.entries());
      },
      async set(input) {
        const changes = {};
        for (const [key, value] of Object.entries(input || {})) {
          const oldValue = values.get(key);
          values.set(key, value);
          changes[key] = change(oldValue, value);
        }
        if (Object.keys(changes).length) {
          for (const listener of storageListeners) listener(changes, "local");
        }
      },
      async remove(key) {
        const oldValue = values.get(key);
        values.delete(key);
        if (oldValue !== undefined) {
          const changes = { [key]: change(oldValue, undefined) };
          for (const listener of storageListeners) listener(changes, "local");
        }
      },
    },
    onChanged: {
      addListener(listener) {
        storageListeners.add(listener);
      },
    },
  };

  function dispatch(message) {
    return new Promise((resolve) => {
      let settled = false;
      const respond = (value) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };
      for (const listener of runtimeListeners) {
        const result = listener(message, {}, respond);
        if (result !== true && result !== undefined && !settled) respond(result);
      }
      if (!settled) respond(undefined);
    });
  }

  const runtime = {
    onMessage: {
      addListener(listener) {
        runtimeListeners.add(listener);
      },
    },
    async sendMessage(message) {
      if (message?.type === "DOWNLOAD_PROVENANCE_FILES") {
        bundle = {
          baseDirectory: message.baseDirectory,
          files: message.files,
          capturedAt: new Date().toISOString(),
        };
        globalThis.__CHATGPT_PROVENANCE_BUNDLE__ = bundle;
        return { ok: true, downloads: message.files.map((file, index) => ({ path: file.path, downloadId: index + 1 })) };
      }
      return dispatch(message);
    },
  };

  globalThis.__CHATGPT_PROVENANCE_EXPORTER_RUNTIME__ = { storage, runtime };
  globalThis.ChatGPTProvenanceStandalone = {
    start() {
      return globalThis.ChatGPTProvenanceRunner.start();
    },
    pause() {
      return globalThis.ChatGPTProvenanceRunner.pause();
    },
    resume() {
      return globalThis.ChatGPTProvenanceRunner.resume();
    },
    reset() {
      return globalThis.ChatGPTProvenanceRunner.reset();
    },
    getState() {
      return globalThis.ChatGPTProvenanceRunner.getState();
    },
    getBundle() {
      return bundle || globalThis.__CHATGPT_PROVENANCE_BUNDLE__ || null;
    },
    clearBundle() {
      bundle = null;
      delete globalThis.__CHATGPT_PROVENANCE_BUNDLE__;
    },
    stateKey: STATE_KEY,
  };
})();
