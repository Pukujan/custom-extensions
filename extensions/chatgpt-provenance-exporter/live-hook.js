(() => {
  "use strict";
  if (globalThis.__CHATGPT_PROVENANCE_LIVE_HOOK_V1__) return;
  globalThis.__CHATGPT_PROVENANCE_LIVE_HOOK_V1__ = true;

  const core = globalThis.ChatGPTProvenanceLiveCore;
  if (!core) throw new Error("Live provenance core is not available.");

  const lifecycle = core.createLifecycle({ origin: location.origin });
  let originalFetch = null;
  let originalOpen = null;
  let originalSend = null;
  let installed = false;
  const xhrMeta = new WeakMap();

  function captureFetchResponse(meta, response) {
    const eligible = core.normalizeUrl(meta.url, location.origin);
    if (!eligible) return;
    let clone;
    try {
      clone = response.clone();
    } catch {
      lifecycle.record({
        ...meta,
        url: meta.url,
        status: response.status,
        response_headers: response.headers,
        response_body: null,
      });
      return;
    }
    clone.text().then((body) => {
      lifecycle.record({
        ...meta,
        url: meta.url,
        status: response.status,
        response_headers: response.headers,
        response_body: body,
      });
    }).catch(() => {
      lifecycle.record({
        ...meta,
        url: meta.url,
        status: response.status,
        response_headers: response.headers,
        response_body: null,
      });
    });
  }

  function installFetch() {
    if (typeof globalThis.fetch !== "function") return;
    originalFetch = globalThis.fetch;
    globalThis.fetch = function provenanceFetch(input, init) {
      const request = input instanceof Request
        ? { url: input.url, request_method: init?.method || input.method, request_body: init?.body || null }
        : { url: String(input || ""), request_method: init?.method || "GET", request_body: init?.body || null };
      const result = originalFetch.apply(this, arguments);
      return Promise.resolve(result).then((response) => {
        captureFetchResponse(request, response);
        return response;
      });
    };
  }

  function headerObject(raw) {
    const output = {};
    for (const line of String(raw || "").split(/\r?\n/)) {
      const index = line.indexOf(":");
      if (index > 0) output[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
    return output;
  }

  function installXhr() {
    if (!globalThis.XMLHttpRequest?.prototype) return;
    originalOpen = globalThis.XMLHttpRequest.prototype.open;
    originalSend = globalThis.XMLHttpRequest.prototype.send;
    globalThis.XMLHttpRequest.prototype.open = function provenanceOpen(method, url) {
      xhrMeta.set(this, { request_method: method, url: String(url) });
      return originalOpen.apply(this, arguments);
    };
    globalThis.XMLHttpRequest.prototype.send = function provenanceSend(body) {
      const xhr = this;
      const meta = xhrMeta.get(xhr);
      if (meta) {
        xhr.addEventListener("loadend", () => {
          let responseBody = null;
          if (xhr.responseType === "" || xhr.responseType === "text") {
            try { responseBody = xhr.responseText; } catch { responseBody = null; }
          }
          lifecycle.record({
            ...meta,
            transport: "xhr",
            request_body: body,
            status: xhr.status,
            response_headers: headerObject(xhr.getAllResponseHeaders()),
            response_body: responseBody,
          });
        }, { once: true });
      }
      return originalSend.apply(this, arguments);
    };
  }

  function install() {
    if (installed) return;
    installFetch();
    installXhr();
    installed = true;
  }

  function restore() {
    if (!installed) return;
    if (originalFetch) globalThis.fetch = originalFetch;
    if (originalOpen) globalThis.XMLHttpRequest.prototype.open = originalOpen;
    if (originalSend) globalThis.XMLHttpRequest.prototype.send = originalSend;
    originalFetch = null;
    originalOpen = null;
    originalSend = null;
    installed = false;
  }

  globalThis.ChatGPTProvenanceLiveCapture = {
    start() {
      install();
      lifecycle.start();
      return lifecycle.getState();
    },
    pause() {
      lifecycle.pause();
      return lifecycle.getState();
    },
    resume() {
      lifecycle.resume();
      return lifecycle.getState();
    },
    stop() {
      lifecycle.stop();
      restore();
      return lifecycle.getState();
    },
    reset() {
      restore();
      lifecycle.reset();
      return lifecycle.getState();
    },
    getState() {
      return lifecycle.getState();
    },
    getEvents() {
      return lifecycle.getEvents();
    },
  };
})();

