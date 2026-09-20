(() => {
  "use strict";
  if (globalThis.__CHATGPT_PROVENANCE_ACCOUNT_RUNNER_V1__) return;
  globalThis.__CHATGPT_PROVENANCE_ACCOUNT_RUNNER_V1__ = true;

  const core = globalThis.ChatGPTProvenanceCore;
  const accountCore = globalThis.ChatGPTProvenanceAccountCore;
  const extensionApi = globalThis.__CHATGPT_PROVENANCE_EXPORTER_RUNTIME__ || globalThis.chrome;
  if (!core || !accountCore || !extensionApi) {
    throw new Error("ChatGPT provenance account runtime is not available.");
  }

  const STATE_KEY = "chatgptProvenanceAccountState";
  const MAX_RETRIES = 4;
  const RETRY_BASE_MS = 700;
  let activeRun = null;
  let stateWrite = Promise.resolve();

  class AccountRunCancelledError extends Error {
    constructor() {
      super("Account export was reset or stopped before it completed.");
      this.name = "AccountRunCancelledError";
    }
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function freshState() {
    return {
      schema_version: accountCore.ACCOUNT_SCHEMA_VERSION,
      status: "ready",
      run_id: null,
      message: "Ready. Account-wide export has not started.",
      error: null,
      enumeration: null,
      queue: [],
      progress: null,
      account_directory: null,
      started_at: null,
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
  }

  async function readState() {
    const value = await extensionApi.storage.local.get(STATE_KEY);
    return value[STATE_KEY] || freshState();
  }

  function ensureActive(run) {
    if (!run || activeRun !== run || run.cancelled) throw new AccountRunCancelledError();
  }

  async function setState(patch, run = null) {
    const write = stateWrite.then(async () => {
      if (run) ensureActive(run);
      const previous = await readState();
      if (run) ensureActive(run);
      const next = { ...previous, ...patch, updated_at: new Date().toISOString() };
      await extensionApi.storage.local.set({ [STATE_KEY]: next });
      return next;
    });
    stateWrite = write.catch(() => undefined);
    return write;
  }

  async function waitUntilResumed(run) {
    ensureActive(run);
    while (run.paused) {
      await sleep(100);
      ensureActive(run);
    }
  }

  async function getAccessToken(run) {
    await waitUntilResumed(run);
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
      signal: run.abortController.signal,
    });
    if (!response.ok) throw new Error(`Session request failed (${response.status}).`);
    const data = await response.json();
    if (!data?.accessToken) throw new Error("No ChatGPT access token found. Make sure you are signed in.");
    return data.accessToken;
  }

  async function fetchWithRetry(url, options, run) {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        await waitUntilResumed(run);
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          ...options,
          signal: run.abortController.signal,
        });
        if (response.ok) return response;
        if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_MS * (attempt + 1));
          continue;
        }
        const body = await response.text().catch(() => "");
        throw new Error(
          `ChatGPT read request failed (${response.status})${body ? `: ${body.slice(0, 160)}` : ""}`,
        );
      } catch (error) {
        ensureActive(run);
        lastError = error;
        if (attempt >= MAX_RETRIES) throw error;
        await sleep(RETRY_BASE_MS * (attempt + 1));
      }
    }
    throw lastError || new Error("ChatGPT read request failed.");
  }

  async function enumerateConversations(token, run, state) {
    let enumeration = state.enumeration || accountCore.makeEnumerationState();
    while (!enumeration.complete) {
      await waitUntilResumed(run);
      const url = `/backend-api/conversations?offset=${enumeration.offset}&limit=${enumeration.limit}&order=updated`;
      const response = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${token}` } }, run);
      const data = await response.json();
      enumeration = accountCore.applyPage(enumeration, data);
      await setState({
        status: enumeration.complete ? "queued" : "enumerating",
        message: enumeration.complete
          ? `Conversation queue frozen: ${enumeration.summaries.length.toLocaleString()} unique chat(s).`
          : `Enumerating conversations… ${enumeration.summaries.length.toLocaleString()} unique chat(s) found.`,
        enumeration,
        queue: enumeration.complete ? accountCore.queueFromEnumeration(enumeration) : [],
        error: null,
      }, run);
    }
    return accountCore.queueFromEnumeration(enumeration);
  }

  async function acquireConversation(conversationId, token, run) {
    const response = await fetchWithRetry(
      `/backend-api/conversation/${encodeURIComponent(conversationId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
      run,
    );
    await waitUntilResumed(run);
    // Preserve the exact response text before JSON.parse or any derivation.
    const rawText = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw new Error(`Conversation response was not valid JSON: ${error?.message || error}`);
    }
    core.mappingFromConversation(parsed);
    return { rawText, parsed };
  }

  async function sha256Text(content) {
    const bytes = new TextEncoder().encode(String(content));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return { algorithm: "sha256", digest: hex, bytes: bytes.byteLength };
  }

  function relativeConversationPaths(runId, conversationId) {
    const full = accountCore.makeConversationPaths(runId, conversationId);
    const root = `chatgpt-provenance-account/${full.prefix.split("/")[1]}/`;
    const relative = {};
    for (const [key, value] of Object.entries(full)) {
      if (key === "prefix") continue;
      if (!String(value).startsWith(root)) throw new Error("Conversation path escaped the account directory.");
      relative[key] = String(value).slice(root.length);
    }
    return { root: root.slice(0, -1), full, relative };
  }

  async function buildConversationFiles(rawText, conversation, summary, runId) {
    const graph = core.normalizeConversation(conversation);
    const messages = core.deriveMessages(graph.nodes);
    const tools = core.deriveToolEvents(graph.nodes);
    const citations = core.deriveCitations(graph.nodes);
    const artifacts = core.deriveArtifacts(graph.nodes);
    const paths = relativeConversationPaths(runId, summary.id);
    const reportPath = paths.relative.report;
    const files = [
      { path: paths.relative.raw, mime: "application/json", content: rawText },
      { path: paths.relative.nodes, mime: "application/x-ndjson", content: core.toJsonl(graph.nodes) },
      { path: paths.relative.edges, mime: "application/x-ndjson", content: core.toJsonl(graph.edges) },
      { path: paths.relative.messages, mime: "application/x-ndjson", content: core.toJsonl(messages) },
      { path: paths.relative.tools, mime: "application/x-ndjson", content: core.toJsonl(tools) },
      { path: paths.relative.citations, mime: "application/x-ndjson", content: core.toJsonl(citations) },
      { path: paths.relative.artifacts, mime: "application/x-ndjson", content: core.toJsonl(artifacts) },
    ];
    const hashes = {};
    for (const file of files) hashes[file.path] = await sha256Text(file.content);
    const report = {
      schema_version: accountCore.ACCOUNT_SCHEMA_VERSION,
      provenance_schema_version: core.SCHEMA_VERSION,
      conversation_id: summary.id,
      title: summary.title || "",
      source: "authenticated_chatgpt_conversation_get",
      primary_evidence: paths.relative.raw,
      raw_response_preserved_before_parse: true,
      counts: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        messages: messages.length,
        tool_events: tools.length,
        citations: citations.length,
        artifacts: artifacts.length,
      },
      integrity: hashes,
    };
    files.push({
      path: reportPath,
      mime: "application/json",
      content: `${core.stableStringify(report, 2)}\n`,
    });
    return {
      files,
      report,
      paths,
      counts: report.counts,
      reportPath,
    };
  }

  async function downloadConversationFiles(baseDirectory, files, run) {
    await waitUntilResumed(run);
    const response = await extensionApi.runtime.sendMessage({
      type: "DOWNLOAD_PROVENANCE_FILES",
      baseDirectory,
      conflictAction: "overwrite",
      files,
    });
    if (!response?.ok) throw new Error(response?.error || "Account evidence download failed.");
    return response;
  }

  async function finalizeAccount(state, run) {
    const queue = Array.isArray(state.queue) ? state.queue : [];
    const progress = state.progress;
    accountCore.assertProgress(progress);
    const runId = state.run_id;
    const baseDirectory = `chatgpt-provenance-account/${runId}`;
    const catalog = queue.map((summary, index) => ({
      ...summary,
      index,
      completed: index < progress.next_index,
      report_path: accountCore.makeConversationPaths(runId, summary.id).report,
    }));
    const manifest = {
      schema_version: accountCore.ACCOUNT_SCHEMA_VERSION,
      run_id: runId,
      created_at: state.started_at,
      completed_at: new Date().toISOString(),
      source: "authenticated_chatgpt_conversation_get",
      queue: {
        total: queue.length,
        completed: progress.next_index,
        failed_attempts_recorded: progress.failures.length,
        enumeration_pages: state.enumeration?.page || 0,
        listed_items: state.enumeration?.listedItems || 0,
        unique_ids: queue.length,
        reported_total: state.enumeration?.reportedTotal ?? null,
        queue_fingerprint: accountCore.queueFingerprint(queue),
      },
      files: [
        "manifest.json",
        "catalog/conversations.jsonl",
        "integrity/SHA256SUMS.json",
        "conversations/<id>/raw/conversation.response.json",
        "conversations/<id>/normalized/*.jsonl",
        "conversations/<id>/validation/conversation-report.json",
      ],
      limitations: [
        "Account-wide output is based on authenticated conversation responses and does not include a rendered DOM sweep for every conversation.",
        "Completeness is relative to the frozen conversation list observed during this run.",
        "The exporter does not claim access to hidden reasoning, private server-side execution, or transient events not present in the response.",
      ],
    };
    const manifestContent = `${core.stableStringify(manifest, 2)}\n`;
    const catalogContent = core.toJsonl(catalog);
    const accountHashes = {
      "manifest.json": await sha256Text(manifestContent),
      "catalog/conversations.jsonl": await sha256Text(catalogContent),
      conversation_reports: catalog.map((item) => item.report_path),
    };
    const sumsContent = `${core.stableStringify({
      schema_version: accountCore.ACCOUNT_SCHEMA_VERSION,
      run_id: runId,
      hashes: accountHashes,
      note: "Each conversation report carries hashes for its raw and derived files; this index intentionally excludes itself.",
    }, 2)}\n`;
    await downloadConversationFiles(baseDirectory, [
      { path: "manifest.json", mime: "application/json", content: manifestContent },
      { path: "catalog/conversations.jsonl", mime: "application/x-ndjson", content: catalogContent },
      { path: "integrity/SHA256SUMS.json", mime: "application/json", content: sumsContent },
    ], run);
    return { baseDirectory, fileCount: queue.length * 8 + 3 };
  }

  async function runAccount(run) {
    try {
      ensureActive(run);
      let state = await readState();
      const token = await getAccessToken(run);
      let queue = state.queue;

      if (!state.enumeration?.complete) {
        await setState({ status: "enumerating", message: "Enumerating conversations…", error: null }, run);
        queue = await enumerateConversations(token, run, state);
        state = await readState();
      }

      queue = Array.isArray(queue) && queue.length ? queue : accountCore.queueFromEnumeration(state.enumeration);
      if (!state.progress) {
        state.progress = accountCore.makeProgress(queue, state.run_id);
        await setState({ queue, progress: state.progress, status: queue.length ? "queued" : "done" }, run);
        state = await readState();
      }

      accountCore.assertProgress(state.progress);
      if (state.progress.next_index >= state.progress.total) {
        const final = await finalizeAccount(state, run);
        await setState({ status: "done", message: "Account export complete.", error: null, ...final, completed_at: new Date().toISOString() }, run);
        return;
      }

      await setState({ status: "running", message: `Exporting conversation ${state.progress.next_index + 1} of ${state.progress.total}…`, error: null }, run);
      while (true) {
        await waitUntilResumed(run);
        state = await readState();
        accountCore.assertProgress(state.progress);
        if (state.progress.next_index >= state.progress.total) break;
        const summary = state.queue[state.progress.next_index];
        await setState({
          status: "running",
          message: `Exporting ${summary.title || summary.id} (${state.progress.next_index + 1} / ${state.progress.total})…`,
          current_id: summary.id,
          error: null,
        }, run);
        const acquired = await acquireConversation(summary.id, token, run);
        const built = await buildConversationFiles(acquired.rawText, acquired.parsed, summary, state.run_id);
        await downloadConversationFiles(`chatgpt-provenance-account/${state.run_id}`, built.files, run);
        const nextProgress = accountCore.completeItem(state.progress, summary.id);
        await setState({
          status: nextProgress.status,
          progress: nextProgress,
          message: nextProgress.status === "done"
            ? "All conversation evidence downloaded; writing account manifest…"
            : `Exported ${nextProgress.next_index} of ${nextProgress.total} conversation(s).`,
          error: null,
        }, run);
      }

      state = await readState();
      const final = await finalizeAccount(state, run);
      await setState({ status: "done", message: "Account export complete.", error: null, ...final, completed_at: new Date().toISOString() }, run);
    } catch (error) {
      if (error instanceof AccountRunCancelledError || error?.name === "AbortError") return;
      if (activeRun !== run || run.cancelled) return;
      const state = await readState();
      let nextProgress = state.progress;
      if (nextProgress && state.current_id) {
        try {
          nextProgress = accountCore.recordFailure(nextProgress, state.current_id, error?.message || error);
        } catch (_) {
          // Preserve the original error if progress cannot be reconciled.
        }
      }
      await setState({
        status: "error",
        progress: nextProgress,
        message: "Account export paused because of an error.",
        error: String(error?.message || error).slice(0, 400),
      }, run);
    } finally {
      if (activeRun === run) activeRun = null;
    }
  }

  function launch(run) {
    activeRun = run;
    setTimeout(() => runAccount(run), 0);
  }

  async function startAccount() {
    if (activeRun) return { ok: false, error: "An account export is already running." };
    const current = await readState();
    if (["enumerating", "queued", "running", "paused"].includes(current.status)) {
      return { ok: false, error: "An account export is already in progress. Resume or reset it first." };
    }
    const runId = crypto.randomUUID();
    const next = {
      ...freshState(),
      run_id: runId,
      status: "enumerating",
      message: "Enumerating conversations…",
      enumeration: accountCore.makeEnumerationState(),
      queue: [],
      progress: null,
      account_directory: `chatgpt-provenance-account/${runId}`,
      started_at: new Date().toISOString(),
    };
    await setState(next);
    launch({ id: runId, paused: false, cancelled: false, abortController: new AbortController() });
    return { ok: true, accepted: true, run_id: runId };
  }

  async function resumeAccount() {
    if (activeRun) {
      activeRun.paused = false;
      await setState({ status: "running", message: "Resuming account export…", error: null }, activeRun);
      return { ok: true, resumed: true };
    }
    const state = await readState();
    if (!["paused", "error", "queued", "enumerating"].includes(state.status)) {
      return { ok: false, error: "No paused account export is available." };
    }
    const run = { id: state.run_id, paused: false, cancelled: false, abortController: new AbortController() };
    activeRun = run;
    await setState({ status: state.enumeration?.complete ? "running" : "enumerating", error: null }, run);
    setTimeout(() => runAccount(run), 0);
    return { ok: true, resumed: true };
  }

  async function pauseAccount() {
    if (!activeRun) return { ok: false, error: "No account export is running." };
    activeRun.paused = true;
    await setState({ status: "paused", message: "Account export paused; resume continues the same frozen queue." }, activeRun);
    return { ok: true, paused: true };
  }

  async function resetAccount() {
    const run = activeRun;
    if (run) {
      run.cancelled = true;
      run.paused = false;
      run.abortController.abort();
      activeRun = null;
    }
    await setState(freshState());
    return { ok: true, reset: true };
  }

  globalThis.ChatGPTProvenanceAccountRunner = {
    start: startAccount,
    pause: pauseAccount,
    resume: resumeAccount,
    reset: resetAccount,
    getState: async () => readState(),
  };

  extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const handlers = {
      START_PROVENANCE_ACCOUNT_EXPORT: startAccount,
      PAUSE_PROVENANCE_ACCOUNT_EXPORT: pauseAccount,
      RESUME_PROVENANCE_ACCOUNT_EXPORT: resumeAccount,
      RESET_PROVENANCE_ACCOUNT_EXPORT: resetAccount,
    };
    const handler = handlers[message?.type];
    if (!handler) return false;
    handler().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  });

  (async () => {
    const state = await readState();
    if (["enumerating", "running", "queued"].includes(state.status)) {
      await setState({
        status: "paused",
        message: "Account export was interrupted by a page reload; resume continues from the checkpoint.",
        error: null,
      });
    }
  })();
})();
