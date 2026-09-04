(() => {
  "use strict";

  const core = globalThis.TranscriptExporterCore;
  const STATE_KEY = "chatgptTranscriptExporterState";
  const MAX_PASSES = 4;
  const STEP_FRACTION = 0.55;
  const SETTLE_MS = 260;
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
      return (
        roleNode.querySelector(".markdown, .prose, [class*='markdown'], [class*='prose']") ||
        roleNode
      );
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

  function textContent(node) {
    return core.normalizeText(node?.innerText || node?.textContent || "");
  }

  function fenceFor(text) {
    const runs = String(text).match(/`+/g) || [];
    const longest = runs.reduce((max, run) => Math.max(max, run.length), 0);
    return "`".repeat(Math.max(3, longest + 1));
  }

  function languageFor(code) {
    const classes = [...(code?.classList || [])];
    const match = classes.map((name) => name.match(/language-([\w+-]+)/)).find(Boolean);
    return match ? match[1] : "";
  }

  function childrenMarkdown(node, context) {
    return [...node.childNodes].map((child) => nodeToMarkdown(child, context)).join("");
  }

  function listMarkdown(node, ordered, depth) {
    let index = 1;
    const lines = [];
    for (const child of [...node.children]) {
      if (child.tagName !== "LI") continue;
      const prefix = ordered ? `${index}. ` : "- ";
      index += 1;
      const body = core.normalizeText(childrenMarkdown(child, { listDepth: depth + 1 }));
      const indent = "  ".repeat(depth);
      const bodyLines = body.split("\n");
      lines.push(`${indent}${prefix}${bodyLines[0] || ""}`);
      for (const continuation of bodyLines.slice(1)) {
        lines.push(`${indent}  ${continuation}`);
      }
    }
    return `${lines.join("\n")}\n\n`;
  }

  function tableMarkdown(table) {
    const rows = [...table.querySelectorAll("tr")].map((row) =>
      [...row.querySelectorAll("th,td")].map((cell) =>
        core.normalizeText(cell.innerText || cell.textContent).replace(/\|/g, "\\|"),
      ),
    );
    if (!rows.length) return "";
    const width = Math.max(...rows.map((row) => row.length));
    for (const row of rows) while (row.length < width) row.push("");
    const header = rows[0];
    const body = rows.slice(1);
    return [
      `| ${header.join(" | ")} |`,
      `| ${header.map(() => "---").join(" | ")} |`,
      ...body.map((row) => `| ${row.join(" | ")} |`),
      "",
      "",
    ].join("\n");
  }

  function nodeToMarkdown(node, context = { listDepth: 0 }) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName;

    if (tag === "BR") return "\n";
    if (/^H[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      return `\n\n${"#".repeat(level)} ${core.normalizeText(childrenMarkdown(node, context))}\n\n`;
    }
    if (tag === "P") return `${childrenMarkdown(node, context)}\n\n`;
    if (tag === "STRONG" || tag === "B") return `**${childrenMarkdown(node, context)}**`;
    if (tag === "EM" || tag === "I") return `*${childrenMarkdown(node, context)}*`;
    if (tag === "S" || tag === "DEL") return `~~${childrenMarkdown(node, context)}~~`;
    if (tag === "CODE" && node.parentElement?.tagName !== "PRE") {
      const value = node.textContent || "";
      const fence = value.includes("`") ? "``" : "`";
      return `${fence}${value}${fence}`;
    }
    if (tag === "PRE") {
      const code = node.querySelector("code") || node;
      const value = (code.textContent || "").replace(/\n$/, "");
      const fence = fenceFor(value);
      return `\n\n${fence}${languageFor(code)}\n${value}\n${fence}\n\n`;
    }
    if (tag === "UL") return listMarkdown(node, false, context.listDepth || 0);
    if (tag === "OL") return listMarkdown(node, true, context.listDepth || 0);
    if (tag === "BLOCKQUOTE") {
      const body = core.normalizeText(childrenMarkdown(node, context));
      return `\n\n${body
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`;
    }
    if (tag === "A") {
      const label = core.normalizeText(childrenMarkdown(node, context)) || node.getAttribute("href") || "link";
      const href = node.href || node.getAttribute("href") || "";
      return href && !href.startsWith("javascript:") ? `[${label}](${href})` : label;
    }
    if (tag === "IMG") {
      const src = node.currentSrc || node.src || node.getAttribute("src") || "";
      const alt = node.alt || "image";
      return src ? `![${alt}](${src})` : `[Image: ${alt}]`;
    }
    if (tag === "HR") return "\n\n---\n\n";
    if (tag === "TABLE") return tableMarkdown(node);
    if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") {
      return childrenMarkdown(node, context);
    }
    return childrenMarkdown(node, context);
  }

  function extractRenderedTurn(turn) {
    const roleNode = roleNodeFor(turn);
    const role = roleFor(turn, roleNode);
    if (role !== "user" && role !== "assistant") return null;
    const root = contentRootFor(turn, roleNode, role);
    const cleaned = cloneWithoutUi(root);
    const markdown = core.normalizeText(nodeToMarkdown(cleaned));
    const plainText = textContent(cleaned);
    if (!markdown && !plainText && !cleaned.querySelector("img")) return null;

    const testId = turn.getAttribute?.("data-testid") || "";
    const turnId = turn.getAttribute?.("data-turn-id") || null;
    const messageId =
      roleNode?.getAttribute("data-message-id") ||
      roleNode?.getAttribute("data-message-uuid") ||
      roleNode?.closest?.("[data-message-id],[data-message-uuid]")?.getAttribute("data-message-id") ||
      roleNode?.closest?.("[data-message-id],[data-message-uuid]")?.getAttribute("data-message-uuid") ||
      null;

    return {
      role,
      turnId,
      messageId,
      testId,
      turnIndex: core.parseTurnIndex(testId),
      markdown,
      plainText,
    };
  }

  function harvestVisible() {
    return candidateTurns().map(extractRenderedTurn).filter(Boolean);
  }

  function scrollableAncestor(node) {
    for (let current = node?.parentElement; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (
        /(auto|scroll|overlay)/.test(style.overflowY) &&
        current.scrollHeight > current.clientHeight + 120
      ) {
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
      return window.innerHeight;
    }
    return container.clientHeight;
  }

  function maxScrollTop(container) {
    if (container === document.scrollingElement || container === document.documentElement) {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    return Math.max(0, container.scrollHeight - container.clientHeight);
  }

  async function harvestPass(container, pass, collected, firstSeenCounter) {
    const passSeen = new Set();
    setScrollTop(container, 0);
    await sleep(SETTLE_MS * 2);

    let steps = 0;
    let previousPosition = -1;
    while (steps < 1400) {
      const records = harvestVisible();
      for (const record of records) passSeen.add(core.stableTurnKey(record));
      firstSeenCounter = core.mergeHarvest(collected, records, firstSeenCounter);

      const position = scrollTopOf(container);
      const maximum = maxScrollTop(container);
      await publishProgress({
        status: "running",
        phase: "harvesting",
        pass,
        step: steps,
        capturedTurns: collected.size,
        currentScroll: Math.round(position),
        maxScroll: Math.round(maximum),
      });

      if (position >= maximum - 2) break;
      const step = Math.max(220, Math.floor(viewportHeight(container) * STEP_FRACTION));
      const next = Math.min(maximum, position + step);
      if (next <= previousPosition + 1) break;
      previousPosition = position;
      setScrollTop(container, next);
      await sleep(SETTLE_MS);
      steps += 1;
    }

    await sleep(SETTLE_MS * 2);
    const finalRecords = harvestVisible();
    for (const record of finalRecords) passSeen.add(core.stableTurnKey(record));
    firstSeenCounter = core.mergeHarvest(collected, finalRecords, firstSeenCounter);
    return { passSeen, firstSeenCounter };
  }

  function pageTitle() {
    return document.title.replace(/\s*[-|]\s*ChatGPT\s*$/i, "").trim() || "ChatGPT Conversation";
  }

  async function runExport(format) {
    running = true;
    const startedAt = new Date().toISOString();
    await setState({
      status: "running",
      phase: "starting",
      format,
      capturedTurns: 0,
      pass: 0,
      startedAt,
      completedAt: null,
      error: null,
      warning: null,
    });

    try {
      if (location.hostname !== "chatgpt.com") throw new Error("Open a chatgpt.com conversation first.");
      if (isStreaming()) throw new Error("Wait for the current ChatGPT response to finish streaming, then export.");
      if (!candidateTurns().length) throw new Error("No rendered ChatGPT conversation turns were found on this page.");

      const container = findScrollContainer();
      const originalScroll = scrollTopOf(container);
      const collected = new Map();
      const passKeySets = [];
      let firstSeenCounter = 0;
      let complete = false;

      try {
        for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
          const result = await harvestPass(container, pass, collected, firstSeenCounter);
          firstSeenCounter = result.firstSeenCounter;
          passKeySets.push(result.passSeen);
          complete = core.evaluateSweepCompleteness(passKeySets);
          await publishProgress(
            {
              status: "running",
              phase: complete ? "stable" : "sweep-complete",
              pass,
              capturedTurns: collected.size,
              stable: complete,
            },
            true,
          );
          if (complete) break;
        }
      } finally {
        setScrollTop(container, originalScroll);
      }

      const messages = core.sortMessages(collected.values());
      if (!messages.length) throw new Error("No non-empty user/assistant turns were extracted.");

      const exportedAt = new Date().toISOString();
      const meta = {
        title: pageTitle(),
        url: location.href,
        conversationId: core.conversationIdFromUrl(location.href),
        exportedAt,
      };
      const base = core.sanitizeFilename(meta.title);
      const isJson = format === "json";
      const content = isJson
        ? core.buildJson(meta, messages, complete)
        : core.buildMarkdown(meta, messages, complete);
      const filename = `${base}.${isJson ? "json" : "md"}`;
      const response = await chrome.runtime.sendMessage({
        type: "DOWNLOAD_TEXT_EXPORT",
        filename,
        mime: isJson ? "application/json" : "text/markdown",
        content,
      });
      if (!response?.ok) throw new Error(response?.error || "Browser download failed.");

      await setState({
        status: "done",
        phase: "downloaded",
        format,
        capturedTurns: messages.length,
        complete,
        warning: complete ? null : "Repeated sweeps did not establish a stable full turn set; file is marked partial.",
        filename,
        downloadId: response.downloadId ?? null,
        completedAt: new Date().toISOString(),
        error: null,
      });
    } catch (error) {
      await setState({
        status: "error",
        phase: "failed",
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date().toISOString(),
      });
    } finally {
      running = false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "START_TRANSCRIPT_EXPORT") return false;
    if (running) {
      sendResponse({ ok: false, error: "An export is already running in this tab." });
      return false;
    }
    const format = message.format === "json" ? "json" : "markdown";
    runExport(format);
    sendResponse({ ok: true });
    return false;
  });
})();
