(function (root, factory) {
  const api = factory(root?.ChatGPTProvenanceCore || null);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ChatGPTProvenanceLiveCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  const LIVE_SCHEMA_VERSION = "custom-extensions.chatgpt-provenance-live-event.v1";
  const DEFAULT_MAX_BODY_CHARS = 16 * 1024 * 1024;
  const SAFE_RESPONSE_HEADERS = new Set(["accept", "content-type", "x-request-id", "x-trace-id"]);
  const CONVERSATION_PATHS = [
    /^\/backend-api\/conversation(?:\/|$)/,
    /^\/backend-api\/conversations(?:\/|$|\?)/,
    /^\/backend-api\/f\/conversation(?:\/|$)/,
  ];

  function normalizeUrl(input, origin) {
    let parsed;
    try {
      parsed = new URL(String(input || ""), origin || "https://chatgpt.com");
    } catch {
      return null;
    }
    const expectedOrigin = origin || "https://chatgpt.com";
    if (parsed.origin !== expectedOrigin) return null;
    if (!CONVERSATION_PATHS.some((pattern) => pattern.test(parsed.pathname + parsed.search))) return null;
    parsed.hash = "";
    return { href: parsed.href, origin: parsed.origin, path: parsed.pathname, query: parsed.search };
  }

  function safeHeaders(input) {
    const output = {};
    const add = (key, value) => {
      const normalized = String(key || "").toLowerCase();
      if (!SAFE_RESPONSE_HEADERS.has(normalized)) return;
      output[normalized] = String(value);
    };
    if (input && typeof input.forEach === "function") input.forEach((value, key) => add(key, value));
    else if (input && typeof input === "object") for (const [key, value] of Object.entries(input)) add(key, value);
    return Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b)));
  }

  function requestBodyText(body) {
    if (typeof body === "string") return body;
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return body.toString();
    return null;
  }

  function boundedText(value, maxChars = DEFAULT_MAX_BODY_CHARS) {
    if (value === null || value === undefined) return { text: null, omitted_reason: "not_available" };
    const text = String(value);
    if (text.length > maxChars) {
      return { text: null, omitted_reason: "body_limit", original_chars: text.length };
    }
    return { text, omitted_reason: null };
  }

  function parseSse(text) {
    const raw = String(text ?? "");
    const frames = [];
    let data = [];
    let fields = {};
    const flush = () => {
      if (!data.length && !Object.keys(fields).length) return;
      const joined = data.join("\n");
      let parsed = null;
      let parseError = null;
      if (joined && joined !== "[DONE]") {
        try {
          parsed = JSON.parse(joined);
        } catch (error) {
          parseError = String(error?.message || error);
        }
      }
      frames.push({ fields, data: joined, parsed, parse_error: parseError });
      data = [];
      fields = {};
    };
    for (const line of raw.split(/\n/)) {
      const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;
      if (!normalized) {
        flush();
        continue;
      }
      if (normalized.startsWith(":")) continue;
      const separator = normalized.indexOf(":");
      const field = separator < 0 ? normalized : normalized.slice(0, separator);
      const value = separator < 0 ? "" : normalized.slice(separator + 1).replace(/^ /, "");
      if (field === "data") data.push(value);
      else fields[field] = value;
    }
    flush();
    return { frame_count: frames.length, frames };
  }

  function classifyHint(path, requestBody, responseBody, contentType) {
    const haystack = `${path}\n${requestBody || ""}\n${responseBody || ""}\n${contentType || ""}`.toLowerCase();
    const hints = [];
    if (/tool|function|computer|python|browser/.test(haystack)) hints.push("tool_or_client_activity_marker");
    if (/event-stream|^data:|\n data:/.test(haystack)) hints.push("streaming_or_sse");
    if (/citation|source|reference|url/.test(haystack)) hints.push("source_or_reference_marker");
    return hints;
  }

  function makeEvent(input, sequence, options = {}) {
    const url = normalizeUrl(input.url, options.origin);
    if (!url) return { accepted: false, reason: "outside_same_origin_conversation_boundary" };
    const request = boundedText(requestBodyText(input.request_body), options.maxBodyChars);
    const response = boundedText(input.response_body, options.maxBodyChars);
    const responseHeaders = safeHeaders(input.response_headers);
    const contentType = responseHeaders["content-type"] || input.content_type || null;
    const rawResponse = response.text;
    return {
      accepted: true,
      schema_version: LIVE_SCHEMA_VERSION,
      sequence,
      observed_at: input.observed_at || new Date().toISOString(),
      transport: input.transport || "fetch",
      request_method: String(input.request_method || "GET").toUpperCase(),
      url: url.href,
      path: url.path,
      query: url.query,
      status: Number.isFinite(input.status) ? input.status : null,
      request_body: request.text,
      request_body_omitted_reason: request.omitted_reason,
      response_headers: responseHeaders,
      response_body: rawResponse,
      response_body_omitted_reason: response.omitted_reason,
      response_body_chars: typeof rawResponse === "string" ? rawResponse.length : null,
      sse: contentType && /event-stream/i.test(contentType) && rawResponse !== null ? parseSse(rawResponse) : null,
      source_hints: classifyHint(url.path, request.text, rawResponse, contentType),
    };
  }

  function createLifecycle(options = {}) {
    const config = { origin: options.origin || "https://chatgpt.com", maxBodyChars: options.maxBodyChars || DEFAULT_MAX_BODY_CHARS };
    let state = "ready";
    let sequence = 0;
    const events = [];

    return {
      start() {
        if (state === "running") return false;
        state = "running";
        return true;
      },
      pause() {
        if (state !== "running") return false;
        state = "paused";
        return true;
      },
      resume() {
        if (state !== "paused") return false;
        state = "running";
        return true;
      },
      stop() {
        if (state === "ready" || state === "stopped") return false;
        state = "stopped";
        return true;
      },
      reset() {
        state = "ready";
        sequence = 0;
        events.length = 0;
        return true;
      },
      record(input) {
        if (state !== "running") return { accepted: false, reason: `lifecycle_${state}` };
        const event = makeEvent(input, sequence + 1, config);
        if (!event.accepted) return event;
        sequence += 1;
        events.push(event);
        return event;
      },
      getState() {
        return { status: state, event_count: events.length, next_sequence: sequence + 1 };
      },
      getEvents() {
        return events.map((event) => ({ ...event }));
      },
    };
  }

  return {
    LIVE_SCHEMA_VERSION,
    DEFAULT_MAX_BODY_CHARS,
    normalizeUrl,
    safeHeaders,
    requestBodyText,
    boundedText,
    parseSse,
    makeEvent,
    createLifecycle,
  };
});

