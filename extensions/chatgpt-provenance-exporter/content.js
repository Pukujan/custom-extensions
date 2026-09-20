(() => {
  "use strict";
  if (globalThis.__CHATGPT_PROVENANCE_EXPORTER_V1__) return;
  globalThis.__CHATGPT_PROVENANCE_EXPORTER_V1__ = true;

  const core = globalThis.ChatGPTProvenanceCore;
  const STATE_KEY = "chatgptProvenanceExporterState";
  const MAX_PASSES = 5;
  const MAX_TOP_PRIME_ROUNDS = 10;
  const STEP_FRACTION = 0.55;
  const SETTLE_MS = 300;
  let running = false;
  let lastProgressWrite = 0;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function setState(patch) {
    const previous = (await chrome.storage.local.get(STATE_KEY))[STATE_KEY] || {};
    const next = { ...previous, ...patch, updatedAt: new Date().toISOString() };
    await chrome.storage.local.set({ [STATE_KEY]: next });
    return next;
  }

  async function publishProgress(patch, force = false) {
    const now = Date.now();
    if (!force && now - lastProgressWrite < 500) return;
    lastProgressWrite = now;
    await setState(patch);
  }

  function isStreaming() {
    return Boolean(document.querySelector('[data-testid="stop-button"]'));
  }

  async function getAccessToken() {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Session request failed (${response.status}).`);
    const data = await response.json();
    if (!data?.accessToken) throw new Error("No ChatGPT access token found. Make sure you are signed in.");
    return data.accessToken;
  }

  async function fetchWithRetry(url, options = {}, retries = 4) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          ...options,
        });
        if (response.ok) return response;
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          await sleep(700 * (attempt + 1));
          continue;
        }
        const body = await response.text().catch(() => "");
        throw new Error(
          `ChatGPT read request failed (${response.status})${body ? `: ${body.slice(0, 160)}` : ""}`,
        );
      } catch (error) {
        lastError = error;
        if (attempt >= retries) throw error;
        await sleep(700 * (attempt + 1));
      }
    }
    throw lastError || new Error("ChatGPT read request failed.");
  }

  async function acquireConversation(conversationId) {
    const token = await getAccessToken();
    const response = await fetchWithRetry(
      `/backend-api/conversation/${encodeURIComponent(conversationId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    // Preserve the returned text before any JSON parsing/normalization.
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

  function candidateTurns() {
    const seen = new Set();
    const turns = [];
    document
      .querySelectorAll('article[data-testid^="conversation-turn-"], article[data-turn]')
      .forEach((node) => {
        if (!seen.has(node)) {
          seen.add(node);
          turns.push(node);
        }
      });
    if (turns.length) return turns;

    document.querySelectorAll("[data-message-author-role]").forEach((roleNode) => {
      const wrapper = roleNode.closest('[data-testid^="conversation-turn-"], article') || roleNode;
      if (!seen.has(wrapper)) {
        seen.add(wrapper);
        turns.push(wrapper);
      }
    });
    return turns;
  }

  function roleNodeFor(turn) {
    if (turn.matches?.("[data-message-author-role]")) return turn;
    return turn.querySelector?.("[data-message-author-role]") || null;
  }

  function roleFor(turn, roleNode) {
    return turn.getAttribute?.("data-turn") || roleNode?.getAttribute("data-message-author-role") || null;
  }

  function contentRootFor(turn, roleNode, role) {
    if (!roleNode) return turn;
    if (role === "assistant") {
      return roleNode.querySelector(".markdown, .prose, [class*='markdown'], [class*='prose']") || roleNode;
    }
    if (role === "user") {
      return (
        roleNode.querySelector(
          '[data-testid="collapsible-user-message-content"], .whitespace-pre-wrap, [class*="whitespace-pre-wrap"]',
        ) || roleNode
      );
    }
    return roleNode;
  }

  function cloneWithoutUi(root) {
    const clone = root.cloneNode(true);
    clone
      .querySelectorAll(
        "script, style, noscript, button, [role='button'], svg, [aria-hidden='true'], [data-testid*='copy'], [data-testid*='edit']",
      )
      .forEach((node) => node.remove());
    return clone;
  }

  function parseTurnIndex(testId) {
    const match = String(testId || "").match(/conversation-turn-(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function extractRenderedTurn(turn) {
    const roleNode = roleNodeFor(turn);
    const role = roleFor(turn, roleNode);
    if (role !== "user" && role !== "assistant") return null;

    const root = contentRootFor(turn, roleNode, role);
    const cleaned = cloneWithoutUi(root);
    const plainText = core.normalizeText(cleaned.innerText || cleaned.textContent || "");
    if (!plainText && !cleaned.querySelector("img")) return null;

    const testId = turn.getAttribute?.("data-testid") || "";
    const turnId = turn.getAttribute?.("data-turn-id") || null;
    const idHolder =
      roleNode?.closest?.("[data-message-id],[data-message-uuid]") ||
      roleNode;
    const messageId =
      roleNode?.getAttribute?.("data-message-id") ||
      roleNode?.getAttribute?.("data-message-uuid") ||
      idHolder?.getAttribute?.("data-message-id") ||
      idHolder?.getAttribute?.("data-message-uuid") ||
      null;

    return {
      role,
      turnId,
      messageId,
      testId,
      turnIndex: parseTurnIndex(testId),
      plainText,
    };
  }

  function harvestVisible() {
    return candidateTurns().map(extractRenderedTurn).filter(Boolean);
  }

  function scrollableAncestor(node) {
    for (let current = node?.parentElement; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (/(auto|scroll|overlay)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 120) {
        return current;
      }
    }
    return null;
  }

  function findScrollContainer() {
    const firstTurn = candidateTurns()[0];
    const ancestor = scrollableAncestor(firstTurn);
    if (ancestor) return ancestor;

    const candidates = [...document.querySelectorAll("main, main *")].filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = getComputedStyle(node);
      return /(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 200;
    });
    candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);
    return candidates[0] || document.scrollingElement || document.documentElement;
  }

  function scrollTopOf(container) {
    if (container === document.scrollingElement || container === document.documentElement) {
      return window.scrollY || document.documentElement.scrollTop || 0;
    }
    return container.scrollTop;
  }

  function setScrollTop(container, value) {
    if (container === document.scrollingElement || container === document.documentElement) {
      window.scrollTo(0, value);
    } else {
      container.scrollTop = value;
    }
  }

  function viewportHeight(container) {
    if (container === document.scrollingElement || container === document.documentElement) {
      return window.innerHeight || document.documentElement.clientHeight || 800;
    }
    return container.clientHeight || 800;
  }

  function scrollHeightOf(container) {
    if (container === document.scrollingElement || container === document.documentElement) {
      return Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
    }
    return container.scrollHeight;
  }

  async function primeLazyTop(container, collected, counterRef) {
    let previousSignature = null;
    let stableRounds = 0;

    for (let round = 0; round < MAX_TOP_PRIME_ROUNDS; round += 1) {
      setScrollTop(container, 0);
      await sleep(SETTLE_MS);
      const visible = harvestVisible();
      counterRef.value = core.mergeRenderedRecords(collected, visible, counterRef.value);
      const keys = visible.map(core.renderedStableKey).sort().join("|");
      const signature = `${scrollHeightOf(container)}:${keys}`;

      if (signature === previousSignature) stableRounds += 1;
      else stableRounds = 0;

      previousSignature = signature;
      if (stableRounds >= 1) break;
    }
  }

  async function harvestPass(container, collected, counterRef, passNumber) {
    await primeLazyTop(container, collected, counterRef);

    const passKeys = new Set();
    let lastTop = -1;
    let safety = 0;

    while (safety < 20000) {
      safety += 1;
      const visible = harvestVisible();
      for (const record of visible) passKeys.add(core.renderedStableKey(record));
      counterRef.value = core.mergeRenderedRecords(collected, visible, counterRef.value);

      await publishProgress({
        status: "running",
        phase: "rendered-sweep",
        pass: passNumber,
        renderedTurns: collected.size,
      });

      const top = scrollTopOf(container);
      const height = scrollHeightOf(container);
      const viewport = viewportHeight(container);
      if (top + viewport >= height - 8) break;

      const next = Math.min(height - viewport, top + Math.max(120, viewport * STEP_FRACTION));
      if (Math.abs(next - top) < 2 || top === lastTop) break;
      lastTop = top;
      setScrollTop(container, next);
      await sleep(SETTLE_MS);
    }

    await sleep(SETTLE_MS);
    const finalVisible = harvestVisible();
    for (const record of finalVisible) passKeys.add(core.renderedStableKey(record));
    counterRef.value = core.mergeRenderedRecords(collected, finalVisible, counterRef.value);
    return passKeys;
  }

  async function captureRendered() {
    if (!candidateTurns().length) {
      return { records: [], stable: false, warning: "No rendered user/assistant turns found." };
    }

    const container = findScrollContainer();
    const originalScroll = scrollTopOf(container);
    const collected = new Map();
    const counterRef = { value: 0 };
    const passSets = [];
    let stable = false;

    try {
      for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
        const passKeys = await harvestPass(container, collected, counterRef, pass);
        passSets.push(passKeys);
        stable = core.evaluateRenderedStability(passSets);
        await publishProgress(
          {
            status: "running",
            phase: stable ? "rendered-stable" : "rendered-pass-complete",
            pass,
            renderedTurns: collected.size,
            renderedStable: stable,
          },
          true,
        );
        if (stable) break;
      }
    } finally {
      setScrollTop(container, originalScroll);
    }

    return {
      records: core.sortRendered(collected.values()),
      stable,
      warning: stable ? null : "Repeated rendered sweeps did not establish a stable turn set.",
    };
  }

  async function sha256Text(content) {
    const bytes = new TextEncoder().encode(String(content));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return { algorithm: "sha256", digest: hex, bytes: bytes.byteLength };
  }

  function pageTitle() {
    const raw = document.title.replace(/\s*[-–—]\s*ChatGPT\s*$/i, "");
    return core.normalizeText(raw) || "ChatGPT Conversation";
  }

  function dateStamp(iso) {
    return String(iso).slice(0, 10).replace(/-/g, "");
  }

  async function buildBundle(rawText, conversation, renderedCapture, meta) {
    const graph = core.normalizeConversation(conversation);
    const messages = core.deriveMessages(graph.nodes);
    if (!messages.length) throw new Error("Conversation source contained no message records.");

    const tools = core.deriveToolEvents(graph.nodes);
    const citations = core.deriveCitations(graph.nodes);
    const artifacts = core.deriveArtifacts(graph.nodes);
    const reconciliation = core.reconciliationReport(
      graph.nodes,
      renderedCapture.records,
      renderedCapture.stable,
    );

    const report = core.captureReport(
      meta,
      graph,
      messages,
      tools,
      citations,
      artifacts,
      reconciliation,
    );

    const manifest = {
      schema_version: core.SCHEMA_VERSION,
      capture_id: meta.captureId,
      captured_at: meta.capturedAt,
      conversation_id: meta.conversationId,
      title: meta.title,
      source_url: meta.url,
      primary_evidence: "raw/conversation.response.json",
      classifier_version: core.CLASSIFIER_VERSION,
      current_node: conversation.current_node ?? null,
      files: [
        "raw/conversation.response.json",
        "normalized/nodes.jsonl",
        "normalized/edges.jsonl",
        "normalized/messages.jsonl",
        "normalized/tool-events.jsonl",
        "normalized/citations.jsonl",
        "normalized/artifacts.jsonl",
        "rendered/rendered-turns.jsonl",
        "rendered/transcript.md",
        "validation/reconciliation.json",
        "validation/capture-report.json",
        "integrity/SHA256SUMS.json"
      ],
      evidence_model: {
        raw: "immutable captured source representation",
        normalized: "deterministic derived views",
        rendered: "independent UI verification view",
        validation: "comparison/reporting; does not mutate evidence"
      }
    };

    const files = [
      {
        path: "manifest.json",
        mime: "application/json",
        content: core.stableStringify(manifest, 2) + "\n",
      },
      {
        path: "raw/conversation.response.json",
        mime: "application/json",
        content: rawText,
      },
      {
        path: "normalized/nodes.jsonl",
        mime: "application/x-ndjson",
        content: core.toJsonl(graph.nodes),
      },
      {
        path: "normalized/edges.jsonl",
        mime: "application/x-ndjson",
        content: core.toJsonl(graph.edges),
      },
      {
        path: "normalized/messages.jsonl",
        mime: "application/x-ndjson",
        content: core.toJsonl(messages),
      },
      {
        path: "normalized/tool-events.jsonl",
        mime: "application/x-ndjson",
        content: core.toJsonl(tools),
      },
      {
        path: "normalized/citations.jsonl",
        mime: "application/x-ndjson",
        content: core.toJsonl(citations),
      },
      {
        path: "normalized/artifacts.jsonl",
        mime: "application/x-ndjson",
        content: core.toJsonl(artifacts),
      },
      {
        path: "rendered/rendered-turns.jsonl",
        mime: "application/x-ndjson",
        content: core.toJsonl(renderedCapture.records),
      },
      {
        path: "rendered/transcript.md",
        mime: "text/markdown",
        content: core.buildRenderedTranscript(meta, renderedCapture.records, renderedCapture.stable),
      },
      {
        path: "validation/reconciliation.json",
        mime: "application/json",
        content: core.stableStringify(reconciliation, 2) + "\n",
      },
      {
        path: "validation/capture-report.json",
        mime: "application/json",
        content: core.stableStringify(
          {
            ...report,
            rendered_warning: renderedCapture.warning,
          },
          2,
        ) + "\n",
      },
    ];

    const sums = {};
    for (const file of files) sums[file.path] = await sha256Text(file.content);
    files.push({
      path: "integrity/SHA256SUMS.json",
      mime: "application/json",
      content: core.stableStringify(
        {
          schema_version: core.SCHEMA_VERSION,
          capture_id: meta.captureId,
          hashes: sums,
        },
        2,
      ) + "\n",
    });

    return { files, graph, tools, reconciliation };
  }

  async function runCapture() {
    if (running) return;
    running = true;
    try {
      if (location.hostname !== "chatgpt.com") throw new Error("Open a chatgpt.com conversation first.");
      const conversationId = core.conversationIdFromUrl(location.href);
      if (!conversationId) throw new Error("Open a specific ChatGPT /c/<conversation-id> conversation first.");
      if (isStreaming()) throw new Error("Wait for the current ChatGPT response to finish streaming before capture.");

      await setState({
        status: "running",
        phase: "acquiring-source",
        conversationId,
        sourceNodes: 0,
        toolEvents: 0,
        renderedTurns: 0,
        renderedStable: false,
        error: null,
        startedAt: new Date().toISOString(),
      });

      const { rawText, parsed } = await acquireConversation(conversationId);
      const mappingCount = Object.keys(core.mappingFromConversation(parsed)).length;
      await publishProgress({ status: "running", phase: "source-acquired", sourceNodes: mappingCount }, true);

      const renderedCapture = await captureRendered();
      const capturedAt = new Date().toISOString();
      const captureId = crypto.randomUUID();
      const meta = {
        captureId,
        capturedAt,
        conversationId,
        title: pageTitle(),
        url: location.href,
      };

      const bundle = await buildBundle(rawText, parsed, renderedCapture, meta);
      const baseDirectory = [
        "chatgpt-provenance",
        `${dateStamp(capturedAt)}-${core.sanitizePathSegment(meta.title, conversationId)}-${conversationId}`,
      ].join("/");

      await publishProgress({
        status: "running",
        phase: "downloading",
        sourceNodes: bundle.graph.nodes.length,
        toolEvents: bundle.tools.length,
        renderedTurns: renderedCapture.records.length,
        renderedStable: renderedCapture.stable,
        baseDirectory,
      }, true);

      const response = await chrome.runtime.sendMessage({
        type: "DOWNLOAD_PROVENANCE_FILES",
        baseDirectory,
        files: bundle.files,
      });
      if (!response?.ok) throw new Error(response?.error || "Browser download failed.");

      await setState({
        status: "done",
        phase: "downloaded",
        captureId,
        conversationId,
        sourceNodes: bundle.graph.nodes.length,
        toolEvents: bundle.tools.length,
        renderedTurns: renderedCapture.records.length,
        renderedStable: renderedCapture.stable,
        reconciliationStatus: bundle.reconciliation.status,
        baseDirectory,
        fileCount: bundle.files.length,
        completedAt: new Date().toISOString(),
        error: null,
      });
    } catch (error) {
      await setState({
        status: "error",
        phase: "failed",
        error: error?.message || String(error),
        completedAt: new Date().toISOString(),
      });
    } finally {
      running = false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "START_PROVENANCE_CAPTURE") return false;
    if (running) {
      sendResponse({ ok: false, error: "A provenance capture is already running in this tab." });
      return false;
    }
    setTimeout(() => runCapture(), 0);
    sendResponse({ ok: true, accepted: true });
    return false;
  });
})();
