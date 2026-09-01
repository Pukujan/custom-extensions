"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const core = require("../core.js");

const ROOT = path.resolve(__dirname, "..");
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function syntax(file) {
  const result = spawnSync(process.execPath, ["--check", path.join(ROOT, file)], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

for (const file of ["core.js", "content.js", "background.js", "popup.js"]) {
  test(`${file} syntax`, () => syntax(file));
}

test("manifest is valid MV3 with narrow ChatGPT host scope", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ["https://chatgpt.com/*"]);
  assert.deepEqual([...manifest.permissions].sort(), ["activeTab", "downloads", "storage"].sort());
  assert.equal(manifest.background.service_worker, "background.js");
  assert.deepEqual(manifest.content_scripts[0].js, ["core.js", "content.js"]);
});

test("turn index parser is strict enough for conversation turn ids", () => {
  assert.equal(core.parseTurnIndex("conversation-turn-42"), 42);
  assert.equal(core.parseTurnIndex("x-conversation-turn-7-y"), 7);
  assert.equal(core.parseTurnIndex("turn-7"), null);
});

test("stable identity prefers turn id over weaker fields", () => {
  const key = core.stableTurnKey({
    role: "assistant",
    turnId: "abc",
    testId: "conversation-turn-9",
    messageId: "m",
    plainText: "same",
  });
  assert.equal(key, "turn-id:abc:assistant");
});

test("same turn encountered repeatedly is deduplicated", () => {
  const map = new Map();
  let counter = 0;
  counter = core.mergeHarvest(
    map,
    [{ role: "user", turnId: "u1", plainText: "hello", markdown: "hello" }],
    counter,
  );
  counter = core.mergeHarvest(
    map,
    [{ role: "user", turnId: "u1", plainText: "hello", markdown: "hello" }],
    counter,
  );
  assert.equal(map.size, 1);
  assert.equal(counter, 1);
});

test("richer later render replaces partial render without changing first-seen order", () => {
  const map = new Map();
  let counter = core.mergeHarvest(
    map,
    [{ role: "assistant", turnId: "a1", markdown: "partial", plainText: "partial" }],
    0,
  );
  counter = core.mergeHarvest(
    map,
    [{ role: "assistant", turnId: "a1", markdown: "partial plus full content", plainText: "partial plus full content" }],
    counter,
  );
  const value = [...map.values()][0];
  assert.equal(value.firstSeen, 0);
  assert.match(value.markdown, /full content/);
  assert.equal(counter, 1);
});

test("numeric turn ordering wins over harvest discovery order", () => {
  const sorted = core.sortMessages([
    { role: "assistant", testId: "conversation-turn-8", turnIndex: 8, firstSeen: 0 },
    { role: "user", testId: "conversation-turn-7", turnIndex: 7, firstSeen: 1 },
  ]);
  assert.deepEqual(sorted.map((x) => x.turnIndex), [7, 8]);
});

test("completeness requires two identical non-empty sweep key sets", () => {
  assert.equal(core.evaluateSweepCompleteness([new Set(["a"])]), false);
  assert.equal(core.evaluateSweepCompleteness([new Set(["a"]), new Set(["a", "b"])]), false);
  assert.equal(core.evaluateSweepCompleteness([new Set(["a", "b"]), new Set(["b", "a"])]), true);
  assert.equal(core.evaluateSweepCompleteness([new Set(), new Set()]), false);
});

test("markdown serialization carries completeness warning when not established", () => {
  const text = core.buildMarkdown(
    {
      title: "Example",
      url: "https://chatgpt.com/c/abc",
      conversationId: "abc",
      exportedAt: "2026-09-01T00:00:00Z",
    },
    [
      { role: "user", turnIndex: 1, firstSeen: 0, markdown: "Hi" },
      { role: "assistant", turnIndex: 2, firstSeen: 1, markdown: "Hello" },
    ],
    false,
  );
  assert.match(text, /PARTIAL \/ NOT ESTABLISHED/);
  assert.match(text, /WARNING:/);
  assert.ok(text.indexOf("## User") < text.indexOf("## Assistant"));
});

test("JSON serialization preserves ordered roles and explicit completeness state", () => {
  const raw = core.buildJson(
    {
      title: "Example",
      url: "https://chatgpt.com/c/abc",
      conversationId: "abc",
      exportedAt: "2026-09-01T00:00:00Z",
    },
    [
      { role: "assistant", turnIndex: 2, firstSeen: 0, markdown: "B", plainText: "B" },
      { role: "user", turnIndex: 1, firstSeen: 1, markdown: "A", plainText: "A" },
    ],
    true,
  );
  const parsed = JSON.parse(raw);
  assert.equal(parsed.schema_version, "custom-extensions.chatgpt-transcript.v1");
  assert.equal(parsed.completeness, "stable_full_sweep");
  assert.deepEqual(parsed.messages.map((x) => x.role), ["user", "assistant"]);
});

test("filename sanitizer removes filesystem-invalid characters", () => {
  assert.equal(core.sanitizeFilename('a/b:c*?"<>|'), "a-b-c------");
  assert.equal(core.sanitizeFilename("   "), "chatgpt-transcript");
});

test("conversation id parser accepts ChatGPT conversation URLs", () => {
  assert.equal(core.conversationIdFromUrl("https://chatgpt.com/c/1234?x=1"), "1234");
  assert.equal(core.conversationIdFromUrl("https://chatgpt.com/"), null);
});

test("randomized dedupe and turn ordering invariant", () => {
  let seed = 0x5f3759df;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  for (let trial = 0; trial < 500; trial += 1) {
    const count = 5 + Math.floor(random() * 50);
    const canonical = Array.from({ length: count }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      turnId: `turn-${trial}-${i}`,
      testId: `conversation-turn-${i}`,
      turnIndex: i,
      markdown: `message ${i}`,
      plainText: `message ${i}`,
    }));
    const noisy = [];
    for (const item of canonical) {
      noisy.push(item);
      if (random() < 0.75) noisy.push({ ...item });
      if (random() < 0.3) noisy.push({ ...item, markdown: `${item.markdown} expanded` });
    }
    for (let i = noisy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [noisy[i], noisy[j]] = [noisy[j], noisy[i]];
    }

    const map = new Map();
    core.mergeHarvest(map, noisy, 0);
    assert.equal(map.size, count);
    const sorted = core.sortMessages(map.values());
    assert.deepEqual(sorted.map((x) => x.turnIndex), canonical.map((x) => x.turnIndex));
  }
});

test("architecture invariant: popup does not contain harvesting loop", () => {
  const popup = fs.readFileSync(path.join(ROOT, "popup.js"), "utf8");
  const content = fs.readFileSync(path.join(ROOT, "content.js"), "utf8");
  assert.doesNotMatch(popup, /harvestPass|candidateTurns|setScrollTop/);
  assert.match(content, /harvestPass/);
  assert.match(content, /finally\s*\{/);
});

test("privacy invariant: implementation contains no network fetch/XHR/WebSocket", () => {
  const source = ["core.js", "content.js", "background.js", "popup.js"]
    .map((file) => fs.readFileSync(path.join(ROOT, file), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest|WebSocket/);
});

console.log(`\n${passed} tests passed.`);
