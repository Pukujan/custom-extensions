"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");
const core = require("../core.js");
globalThis.ChatGPTProvenanceCore = core;
const accountCore = require("../account-core.js");
const officialCore = require("../official-core.js");
const officialZip = require("../official-zip.js");
const evalCore = require("../eval-core.js");

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
  const result = spawnSync(process.execPath, ["--check", path.join(ROOT, file)], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

for (const file of [
  "core.js",
  "content.js",
  "background.js",
  "popup.js",
  "account-core.js",
  "account-runner.js",
  "official-core.js",
  "official-zip.js",
  "live-core.js",
  "live-hook.js",
  "eval-core.js",
  "tools/import-official-export.mjs",
  "tools/export-eval-trace.mjs",
  "tools/validate-capture-bundle.mjs",
  "dev/build-live-browser-payload.mjs",
]) {
  test(`${file} syntax`, () => syntax(file));
}
const liveCore = require("../live-core.js");

function put16(buffer, offset, value) {
  buffer.writeUInt16LE(value, offset);
}

function put32(buffer, offset, value) {
  buffer.writeUInt32LE(value >>> 0, offset);
}

function makeZip(entries, { method = 0, flags = 0 } = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const raw = Buffer.from(entry.content, "utf8");
    const compressed = method === 8 ? zlib.deflateRawSync(raw) : raw;
    const crc = officialZip.crc32(raw);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    put16(local, 4, 20);
    put16(local, 6, flags | 0x800);
    put16(local, 8, method);
    put32(local, 14, crc);
    put32(local, 18, compressed.length);
    put32(local, 22, raw.length);
    put16(local, 26, name.length);
    name.copy(local, 30);
    locals.push(Buffer.concat([local, compressed]));

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    put16(central, 4, 20);
    put16(central, 6, 20);
    put16(central, 8, flags | 0x800);
    put16(central, 10, method);
    put32(central, 16, crc);
    put32(central, 20, compressed.length);
    put32(central, 24, raw.length);
    put16(central, 28, name.length);
    put32(central, 42, offset);
    name.copy(central, 46);
    centrals.push(central);
    offset += locals.at(-1).length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  put16(eocd, 8, entries.length);
  put16(eocd, 10, entries.length);
  put32(eocd, 12, centralDirectory.length);
  put32(eocd, 16, offset);
  return Buffer.concat([...locals, centralDirectory, eocd]);
}

function makeConversation(id, title, recipient = null) {
  return {
    id,
    title,
    create_time: "2026-09-01T00:00:00Z",
    update_time: "2026-09-02T00:00:00Z",
    mapping: {
      root: { parent: null, children: ["user"], message: { id: `${id}-u`, author: { role: "user" }, content: { content_type: "text", parts: ["question"] } } },
      user: { parent: "root", children: ["assistant"], message: { id: `${id}-a`, author: { role: "assistant" }, recipient, content: { content_type: "text", parts: ["answer"] } } },
      assistant: { parent: "user", children: [], opaque: { preserve: true }, message: { id: `${id}-tool`, author: { role: "tool", name: "python" }, content: { content_type: "execution_output", parts: ["result"] } } },
    },
    current_node: "assistant",
  };
}

test("manifest is MV3 and least-privilege scoped to ChatGPT", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ["https://chatgpt.com/*"]);
  assert.deepEqual([...manifest.permissions].sort(), ["activeTab", "downloads", "storage"].sort());
  assert.deepEqual(manifest.content_scripts[0].js, ["core.js", "content.js", "account-core.js", "account-runner.js"]);
});

test("conversation ID parser is specific to /c/ URLs", () => {
  assert.equal(core.conversationIdFromUrl("https://chatgpt.com/c/abc-123?x=1"), "abc-123");
  assert.equal(core.conversationIdFromUrl("https://chatgpt.com/"), null);
  assert.equal(core.conversationIdFromUrl("not-a-url"), null);
});

test("source pointer round trips escaped mapping keys", () => {
  const id = "node/a~b";
  const pointer = core.sourcePointer(id);
  assert.equal(pointer, "/mapping/node~1a~0b");
  assert.equal(core.pointerNodeId(pointer), id);
});

test("normalization conserves every mapping node and raw unknown fields", () => {
  const conversation = {
    mapping: {
      a: { parent: null, children: ["b"], future_field: { x: 7 }, message: { id: "m1", author: { role: "user" }, content: { content_type: "text", parts: ["hi"] } } },
      b: { parent: "a", children: [], strange: true, message: { id: "m2", author: { role: "assistant" }, content: { content_type: "text", parts: ["hello"] } } },
    },
  };
  const graph = core.normalizeConversation(conversation);
  assert.equal(graph.nodes.length, 2);
  assert.deepEqual(graph.nodes.map((x) => x.node_id), ["a", "b"]);
  assert.deepEqual(graph.nodes[0].raw_node.future_field, { x: 7 });
  assert.equal(graph.nodes[1].raw_node.strange, true);
});

test("explicit lineage is represented without duplicate edges", () => {
  const graph = core.normalizeConversation({
    mapping: {
      a: { parent: null, children: ["b"] },
      b: { parent: "a", children: [] },
    },
  });
  assert.deepEqual(graph.edges, [{ from: "a", to: "b", evidence: "children" }]);
});

test("assistant recipient is conservatively classified as tool call", () => {
  const cls = core.classifyNode({
    message: {
      author: { role: "assistant" },
      recipient: "web.run",
      content: { content_type: "text", parts: ["{\"q\":\"x\"}"] },
    },
  });
  assert.equal(cls, "tool.call");
});

test("tool-author message is classified as tool result", () => {
  const cls = core.classifyNode({
    message: {
      author: { role: "tool", name: "web.run" },
      content: { content_type: "text", parts: ["result"] },
    },
  });
  assert.equal(cls, "tool.result");
});

test("unknown structures remain unknown rather than guessed", () => {
  assert.equal(core.classifyNode({ future: { arbitrary: true } }), "unknown");
  assert.equal(
    core.classifyNode({ message: { author: { role: "future_role" }, content: { content_type: "future_kind", parts: [] } } }),
    "unknown",
  );
});

test("tool-event derivation retains complete raw node", () => {
  const raw = {
    parent: "p",
    children: [],
    opaque: { keep: "me" },
    message: {
      id: "m",
      author: { role: "assistant" },
      recipient: "python",
      content: { content_type: "text", parts: ["{\"x\":1}"] },
      metadata: { k: 2 },
    },
  };
  const graph = core.normalizeConversation({ mapping: { n: raw, p: { parent: null, children: ["n"] } } });
  const tools = core.deriveToolEvents(graph.nodes);
  assert.equal(tools.length, 1);
  assert.deepEqual(tools[0].raw_node.opaque, { keep: "me" });
  assert.deepEqual(tools[0].content.parts, ['{"x":1}']);
});

test("mapping permutation does not change canonical normalized semantics", () => {
  const a = { parent: null, children: ["b"], message: { author: { role: "user" }, content: { content_type: "text", parts: ["x"] } } };
  const b = { parent: "a", children: [], message: { author: { role: "assistant" }, content: { content_type: "text", parts: ["y"] } } };
  const g1 = core.normalizeConversation({ mapping: { a, b } });
  const g2 = core.normalizeConversation({ mapping: { b, a } });
  assert.equal(core.stableStringify(g1), core.stableStringify(g2));
});

test("unknown metadata addition is preserved without changing unrelated node class", () => {
  const base = {
    message: { author: { role: "assistant" }, content: { content_type: "text", parts: ["answer"] }, metadata: {} },
  };
  const extended = JSON.parse(JSON.stringify(base));
  extended.message.metadata.future_extension = { nested: [1, 2, 3] };
  assert.equal(core.classifyNode(base), "message.assistant");
  assert.equal(core.classifyNode(extended), "message.assistant");
  const node = core.normalizeConversation({ mapping: { n: extended } }).nodes[0];
  assert.deepEqual(node.raw_node.message.metadata.future_extension, { nested: [1, 2, 3] });
});

test("derived message source pointers resolve to their mapping node IDs", () => {
  const graph = core.normalizeConversation({
    mapping: {
      "x/y": { message: { id: "m", author: { role: "user" }, content: { content_type: "text", parts: ["hello"] } } },
    },
  });
  const messages = core.deriveMessages(graph.nodes);
  assert.equal(messages.length, 1);
  assert.equal(core.pointerNodeId(messages[0].source_pointer), "x/y");
});

test("rendered duplicate observations merge once and richer text wins", () => {
  const map = new Map();
  let counter = core.mergeRenderedRecords(map, [{ role: "user", turnId: "u", plainText: "hi" }], 0);
  counter = core.mergeRenderedRecords(map, [{ role: "user", turnId: "u", plainText: "hi expanded" }], counter);
  assert.equal(map.size, 1);
  assert.equal(counter, 1);
  assert.equal([...map.values()][0].plainText, "hi expanded");
});

test("rendered stability requires two equal non-empty pass sets", () => {
  assert.equal(core.evaluateRenderedStability([new Set(["a"])]), false);
  assert.equal(core.evaluateRenderedStability([new Set(["a"]), new Set(["a", "b"])]), false);
  assert.equal(core.evaluateRenderedStability([new Set(["a", "b"]), new Set(["b", "a"])]), true);
  assert.equal(core.evaluateRenderedStability([new Set(), new Set()]), false);
});

test("reconciliation preserves mismatches instead of hiding them", () => {
  const graph = core.normalizeConversation({
    mapping: {
      u: { message: { id: "u1", author: { role: "user" }, content: { content_type: "text", parts: ["q"] } } },
      a: { message: { id: "a1", author: { role: "assistant" }, content: { content_type: "text", parts: ["a"] } } },
    },
  });
  const report = core.reconciliationReport(
    graph.nodes,
    [{ role: "user", messageId: "u1", turnIndex: 0, plainText: "q", firstSeen: 0 }],
    true,
  );
  assert.equal(report.status, "differences_observed");
  assert.ok(report.discrepancies.some((x) => x.type === "role_count_mismatch" && x.role === "assistant"));
});

test("canonical JSONL output is stable across repeated serialization", () => {
  const records = [{ z: 2, a: { y: 1, x: 0 } }, { b: 3, a: 2 }];
  assert.equal(core.toJsonl(records), core.toJsonl(records));
  assert.match(core.toJsonl(records), /^{"a":/);
});

test("randomized node conservation and source-pointer invariant", () => {
  let seed = 0x9e3779b9;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (let trial = 0; trial < 400; trial += 1) {
    const count = 1 + Math.floor(random() * 60);
    const mapping = {};
    for (let i = 0; i < count; i += 1) {
      const id = `n/${trial}/${i}`;
      const parent = i ? `n/${trial}/${Math.floor(random() * i)}` : null;
      mapping[id] = {
        parent,
        children: [],
        unknown_blob: { trial, i, r: Math.floor(random() * 1e6) },
        message: {
          id: `m-${trial}-${i}`,
          author: { role: i % 3 === 0 ? "user" : "assistant" },
          content: { content_type: "text", parts: [`message ${i}`] },
        },
      };
      if (parent) mapping[parent].children.push(id);
    }
    const graph = core.normalizeConversation({ mapping });
    assert.equal(graph.nodes.length, count);
    assert.equal(new Set(graph.nodes.map((x) => x.node_id)).size, count);
    for (const node of graph.nodes) {
      assert.equal(core.pointerNodeId(node.source_pointer), node.node_id);
      assert.deepEqual(node.raw_node.unknown_blob, mapping[node.node_id].unknown_blob);
    }
  }
});

test("runtime uses only same-origin ChatGPT read endpoints and no remote telemetry", () => {
  const source = ["content.js", "background.js", "popup.js"]
    .map((file) => fs.readFileSync(path.join(ROOT, file), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(source, /fetch\s*\(\s*["']https?:\/\//);
  assert.doesNotMatch(source, /method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/);
});

test("long runner lives in content script rather than popup", () => {
  const popup = fs.readFileSync(path.join(ROOT, "popup.js"), "utf8");
  const content = fs.readFileSync(path.join(ROOT, "content.js"), "utf8");
  assert.doesNotMatch(popup, /harvestPass|primeLazyTop|acquireConversation/);
  assert.match(content, /primeLazyTop/);
  assert.match(content, /finally\s*\{/);
});

test("capture exposes pause, resume, and cancellation-safe reset controls", () => {
  const popup = fs.readFileSync(path.join(ROOT, "popup.js"), "utf8");
  const html = fs.readFileSync(path.join(ROOT, "popup.html"), "utf8");
  const content = fs.readFileSync(path.join(ROOT, "content.js"), "utf8");
  assert.match(html, /id="pause"/);
  assert.match(html, /id="reset"/);
  for (const type of ["PAUSE_PROVENANCE_CAPTURE", "RESUME_PROVENANCE_CAPTURE", "RESET_PROVENANCE_CAPTURE"]) {
    assert.match(popup, new RegExp(type));
    assert.match(content, new RegExp(type));
  }
  assert.match(content, /AbortController/);
  assert.match(content, /activeRun = null/);
  assert.match(content, /CaptureCancelledError/);
  assert.match(content, /citationRecords/);
  assert.match(popup, /Citation records/);
  assert.match(popup, /normalized\/tool-events\.jsonl/);
  assert.match(popup, /normalized\/citations\.jsonl/);
  assert.match(popup, /validation\/reconciliation\.json/);
});

test("ontology v0.1 is versioned, source-preserving, and structurally complete", () => {
  const ontologyRoot = path.join(ROOT, "ontology", "v0.1.0");
  const classes = JSON.parse(fs.readFileSync(path.join(ontologyRoot, "classes.json"), "utf8"));
  const rules = JSON.parse(fs.readFileSync(path.join(ontologyRoot, "rules.json"), "utf8"));
  const schema = JSON.parse(fs.readFileSync(path.join(ontologyRoot, "schema.json"), "utf8"));
  const examples = fs
    .readFileSync(path.join(ontologyRoot, "examples.jsonl"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(classes.ontology_version, "0.1.0");
  assert.equal(rules.ontology_version, "0.1.0");
  assert.equal(schema.ontology_version, "0.1.0");
  const classIds = new Set(classes.classes.map((item) => item.id));
  for (const required of ["tool.call", "tool.result", "citation", "unknown"]) assert.ok(classIds.has(required));
  assert.equal(rules.classification_is_metadata, true);
  assert.equal(rules.preserve_raw_before_classification, true);
  assert.equal(rules.ordered_rules.at(-1).class, "unknown");
  assert.ok(examples.length >= 4);
  for (const example of examples) {
    assert.equal(example.ontology_version, "0.1.0");
    assert.equal(example.raw_node_retained, true);
    assert.match(example.source_pointer, /^\/mapping\//);
    assert.equal(example.classification.ruleset_version, rules.ruleset_id);
  }
});

test("account enumeration freezes unique queue order and terminates on a short page", () => {
  let state = accountCore.makeEnumerationState(2);
  state = accountCore.applyPage(state, {
    total: 3,
    items: [
      { id: "a", title: "A", update_time: "2026-09-20T00:00:00Z" },
      { id: "b", title: "B", update_time: "2026-09-19T00:00:00Z" },
    ],
  });
  assert.equal(state.complete, false);
  state = accountCore.applyPage(state, {
    total: 3,
    items: [
      { id: "b", title: "duplicate B" },
      { id: "c", title: "C" },
    ],
  });
  assert.equal(state.complete, true);
  assert.deepEqual(accountCore.queueFromEnumeration(state).map((item) => item.id), ["a", "b", "c"]);
  assert.equal(state.listedItems, 4);
  assert.equal(state.summaries.length, 3);
});

test("account enumeration rejects malformed pages and repeated full pages", () => {
  assert.throws(() => accountCore.normalizePage({ items: [{ title: "missing id" }] }, 100), /without a usable ID/);
  let state = accountCore.makeEnumerationState(2);
  state = accountCore.applyPage(state, { items: [{ id: "a" }, { id: "b" }] });
  assert.throws(() => accountCore.applyPage(state, { items: [{ id: "a" }, { id: "b" }] }), /repeated a full page/);
  assert.throws(() => accountCore.applyPage(state, { items: [{ id: "b" }, { id: "a" }] }), /no unique progress/);
});

test("account progress conserves queue order and failed head is retryable", () => {
  const initial = accountCore.makeProgress([{ id: "a" }, { id: "b" }], "run-1");
  const failed = accountCore.recordFailure(initial, "a", "temporary failure");
  assert.equal(failed.next_index, 0);
  assert.deepEqual(failed.completed_ids, []);
  assert.equal(failed.failures.length, 1);
  const afterA = accountCore.completeItem(failed, "a");
  const afterB = accountCore.completeItem(afterA, "b");
  assert.equal(afterB.status, "done");
  assert.equal(afterB.next_index, 2);
  assert.throws(() => accountCore.completeItem(afterB, "b"), /already complete/);
  assert.throws(() => accountCore.completeItem(afterA, "not-b"), /queue head/);
});

test("account paths are deterministic and traversal-safe", () => {
  const paths = accountCore.makeConversationPaths("run/unsafe", "chat/unsafe");
  assert.match(paths.raw, /^chatgpt-provenance-account\/run-unsafe\/conversations\/chat-unsafe\//);
  assert.doesNotMatch(paths.raw, /\.\./);
  assert.equal(paths.raw, accountCore.makeConversationPaths("run/unsafe", "chat/unsafe").raw);
  assert.match(accountCore.queueFingerprint([{ id: "a" }]), /^fnv1a64:[0-9a-f]{16}$/);
  assert.equal(accountCore.queueFingerprint([{ id: "a" }]), accountCore.queueFingerprint([{ id: "a" }]));
});

test("account runner is read-only and storage-safe by construction", () => {
  const runner = fs.readFileSync(path.join(ROOT, "account-runner.js"), "utf8");
  accountCore.assertReadOnlySource(runner);
  assert.match(runner, /rawText = await response\.text\(\)/);
  assert.match(runner, /chromeProvenanceAccountState|chatgptProvenanceAccountState/);
  assert.match(runner, /accountCore\.completeItem/);
  assert.match(runner, /RESET_PROVENANCE_ACCOUNT_EXPORT/);
  assert.doesNotMatch(runner, /local\.set\(\{[^}]*rawText/s);
});

test("account runner and background use deterministic overwrite paths without private endpoints", () => {
  const runner = fs.readFileSync(path.join(ROOT, "account-runner.js"), "utf8");
  const background = fs.readFileSync(path.join(ROOT, "background.js"), "utf8");
  assert.match(runner, /conflictAction: "overwrite"/);
  assert.match(background, /conflictAction: file\.conflictAction/);
  assert.doesNotMatch(`${runner}\n${background}`, /method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/);
  assert.doesNotMatch(`${runner}\n${background}`, /XMLHttpRequest|WebSocket/);
});

test("official ZIP reader supports stored and deflated entries and verifies CRC", () => {
  for (const method of [0, 8]) {
    const archive = makeZip([
      { name: "conversations.json", content: "[{\"id\":\"c1\",\"mapping\":{}}]" },
      { name: "user.json", content: "{\"email\":\"redacted\"}" },
    ], { method });
    const entries = officialZip.readZipEntries(archive);
    assert.deepEqual(entries.map((entry) => entry.name), ["conversations.json", "user.json"]);
    assert.equal(entries[0].bytes.toString("utf8"), "[{\"id\":\"c1\",\"mapping\":{}}]");
  }
  assert.throws(() => officialZip.readZipEntries(makeZip([{ name: "../escape.json", content: "{}" }])), /Unsafe ZIP entry/);
  assert.throws(() => officialZip.readZipEntries(makeZip([{ name: "secret.json", content: "{}" }], { flags: 1 })), /Encrypted ZIP/);
});

test("official discovery preserves structural source pointers, duplicates, and ignored JSON", () => {
  const conversations = [makeConversation("c1", "One"), makeConversation("c2", "Two")];
  const entries = [
    { name: "conversations.json", text: JSON.stringify(conversations) },
    { name: "0001.json", text: JSON.stringify(makeConversation("c1", "One duplicate")) },
    { name: "user.json", text: JSON.stringify({ email: "redacted" }) },
  ];
  const found = officialCore.discoverConversations(entries);
  assert.equal(found.conversations.length, 3);
  assert.equal(found.duplicateIds.length, 1);
  assert.equal(found.conversations[0].source_pointer, "zip-entry:conversations.json#/items/0");
  assert.equal(found.conversations[2].source_pointer, "zip-entry:0001.json#/conversation");
  assert.ok(found.unrecognizedJson.some((item) => item.entry === "user.json"));
});

test("official derivation conserves mapping nodes and keeps tool raw source", () => {
  const record = officialCore.discoverConversations([
    { name: "conversations.json", text: JSON.stringify([makeConversation("c1", "One", "python")]) },
  ]).conversations[0];
  const derived = officialCore.deriveConversation(record);
  assert.equal(derived.ok, true);
  assert.equal(derived.graph.nodes.length, 3);
  assert.equal(derived.graph.edges.length, 2);
  assert.equal(derived.tools.length, 2);
  for (const node of derived.graph.nodes) assert.equal(core.pointerNodeId(node.source_pointer), node.node_id);
  assert.deepEqual(derived.tools.find((item) => item.event_class === "tool.result").raw_node.opaque, { preserve: true });
});

test("official reconciliation preserves missing, duplicate, and metadata discrepancies", () => {
  const records = [
    { id: "c1", title: "Official", create_time: "1", update_time: "2" },
    { id: "c1", title: "Duplicate", create_time: "1", update_time: "2" },
    { id: "c2", title: "Only official", create_time: null, update_time: null },
  ];
  const report = officialCore.reconciliation(records, [
    { id: "c1", title: "Account", create_time: "1", update_time: "3" },
    { id: "c3", title: "Only account" },
  ]);
  assert.equal(report.status, "differences_observed");
  assert.deepEqual(report.official_only, ["c2"]);
  assert.deepEqual(report.account_only, ["c3"]);
  assert.deepEqual(report.duplicate_official_ids, ["c1"]);
  assert.ok(report.metadata_mismatches.some((item) => item.id === "c1"));
  assert.equal(officialCore.reconciliation(records, undefined).status, "not_comparable");
});

test("official importer CLI help is deterministic and local-only", () => {
  const cli = path.join(ROOT, "tools", "import-official-export.mjs");
  const result = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /export\.zip/);
  assert.doesNotMatch(fs.readFileSync(cli, "utf8"), /fetch\(|https?:\/\//);
});

test("official importer CLI preserves raw ZIP bytes and recomputes output hashes", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "provenance-official-import-"));
  try {
    const input = path.join(temp, "export.zip");
    const output = path.join(temp, "bundle");
    const archive = makeZip([
      { name: "conversations.json", content: JSON.stringify([makeConversation("c1", "One", "python")]) },
      { name: "user.json", content: JSON.stringify({ email: "redacted" }) },
    ], { method: 8 });
    fs.writeFileSync(input, archive);
    const result = spawnSync(process.execPath, [path.join(ROOT, "tools", "import-official-export.mjs"), input, output], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout.trim());
    assert.equal(summary.valid_conversations, 1);
    assert.deepEqual(fs.readFileSync(path.join(output, "raw", "official-export.zip")), archive);
    const sums = JSON.parse(fs.readFileSync(path.join(output, "integrity", "SHA256SUMS.json"), "utf8"));
    for (const [relative, expected] of Object.entries(sums.hashes)) {
      const actualBytes = fs.readFileSync(path.join(output, relative));
      const actual = crypto.createHash("sha256").update(actualBytes).digest("hex");
      assert.equal(actual, expected.digest, relative);
      assert.equal(actualBytes.length, expected.bytes, relative);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(output, "manifest.json"), "utf8"));
    assert.equal(manifest.source_archive.sha256, crypto.createHash("sha256").update(archive).digest("hex"));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("capture-bundle validator checks conservation, raw-backed tools, reconciliation, and hashes", () => {
  const cli = path.join(ROOT, "tools", "validate-capture-bundle.mjs");
  const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /aggregate-only JSON/);
  assert.doesNotMatch(fs.readFileSync(cli, "utf8"), /fetch\(|https?:\/\//);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "provenance-bundle-validator-"));
  try {
    const bundle = path.join(temp, "bundle");
    const conversation = makeConversation("c1", "One", "python");
    const graph = core.normalizeConversation(conversation);
    const messages = core.deriveMessages(graph.nodes);
    const tools = core.deriveToolEvents(graph.nodes);
    const files = new Map([
      ["raw/conversation.response.json", JSON.stringify(conversation)],
      ["normalized/nodes.jsonl", core.toJsonl(graph.nodes)],
      ["normalized/edges.jsonl", core.toJsonl(graph.edges)],
      ["normalized/messages.jsonl", core.toJsonl(messages)],
      ["normalized/tool-events.jsonl", core.toJsonl(tools)],
      ["normalized/citations.jsonl", ""],
      ["normalized/artifacts.jsonl", ""],
      ["rendered/rendered-turns.jsonl", ""],
      ["validation/reconciliation.json", JSON.stringify({ status: "no_differences_observed" })],
      ["validation/capture-report.json", JSON.stringify({ counts: { nodes: 3, edges: 2, messages: 3, tool_events: 2, citations: 0, artifacts: 0 } })],
    ]);
    const manifestFiles = [...files.keys(), "integrity/SHA256SUMS.json"];
    files.set("manifest.json", JSON.stringify({ files: manifestFiles }));
    const hashes = {};
    for (const [relative, content] of files) {
      const destination = path.join(bundle, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, content);
      const bytes = Buffer.from(content, "utf8");
      hashes[relative] = {
        algorithm: "sha256",
        digest: crypto.createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
      };
    }
    const sumPath = path.join(bundle, "integrity", "SHA256SUMS.json");
    fs.mkdirSync(path.dirname(sumPath), { recursive: true });
    fs.writeFileSync(sumPath, JSON.stringify({ hashes }));

    const result = spawnSync(process.execPath, [cli, bundle], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout.trim());
    assert.equal(summary.ok, true);
    assert.equal(summary.mapping_nodes, 3);
    assert.equal(summary.tools, 2);
    assert.equal(summary.tool_raw_mismatches, 0);
    assert.equal(summary.hash_failures, 0);
    assert.equal(summary.rendered_reconciliation, "no_differences_observed");

    const incompleteSums = { hashes: { ...hashes } };
    delete incompleteSums.hashes["normalized/tool-events.jsonl"];
    fs.writeFileSync(sumPath, JSON.stringify(incompleteSums));
    const missingHash = spawnSync(process.execPath, [cli, bundle], { encoding: "utf8" });
    assert.equal(missingHash.status, 1);
    assert.equal(JSON.parse(missingHash.stdout).errors.includes("hash_manifest_mismatch"), true);

    fs.writeFileSync(sumPath, JSON.stringify({ hashes }));
    fs.writeFileSync(path.join(bundle, "normalized", "tool-events.jsonl"), "");
    const missingTool = spawnSync(process.execPath, [cli, bundle], { encoding: "utf8" });
    assert.equal(missingTool.status, 1);
    assert.equal(JSON.parse(missingTool.stdout).errors.includes("tool_conservation_mismatch"), true);

    fs.writeFileSync(path.join(bundle, "normalized", "tool-events.jsonl"), core.toJsonl(tools));
    fs.writeFileSync(path.join(bundle, "normalized", "edges.jsonl"), `${core.toJsonl(graph.edges)}{"from":"extra","to":"extra"}\n`);
    const extraEdge = spawnSync(process.execPath, [cli, bundle], { encoding: "utf8" });
    assert.equal(extraEdge.status, 1);
    assert.equal(JSON.parse(extraEdge.stdout).errors.includes("edge_conservation_mismatch"), true);

    const manifest = JSON.parse(fs.readFileSync(path.join(bundle, "manifest.json"), "utf8"));
    const outside = path.join(temp, "outside");
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "secret.json"), "secret");
    fs.symlinkSync(outside, path.join(bundle, "linked"), "junction");
    manifest.files.push("linked/secret.json");
    fs.writeFileSync(path.join(bundle, "manifest.json"), JSON.stringify(manifest));
    const symlinkEscape = spawnSync(process.execPath, [cli, bundle], { encoding: "utf8" });
    assert.equal(symlinkEscape.status, 1);
    assert.match(symlinkEscape.stdout, /"ok":false/);

    manifest.files.push("../outside.json");
    fs.writeFileSync(path.join(bundle, "manifest.json"), JSON.stringify(manifest));
    const unsafeManifest = spawnSync(process.execPath, [cli, bundle], { encoding: "utf8" });
    assert.equal(unsafeManifest.status, 1);
    assert.match(unsafeManifest.stdout, /"ok":false/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("live event boundary admits only same-origin conversation paths", () => {
  assert.ok(liveCore.normalizeUrl("/backend-api/f/conversation", "https://chatgpt.com"));
  assert.ok(liveCore.normalizeUrl("https://chatgpt.com/backend-api/conversations?offset=0", "https://chatgpt.com"));
  assert.equal(liveCore.normalizeUrl("/api/auth/session", "https://chatgpt.com"), null);
  assert.equal(liveCore.normalizeUrl("https://evil.example/backend-api/conversation", "https://chatgpt.com"), null);
  assert.equal(liveCore.normalizeUrl("/backend-api/account", "https://chatgpt.com"), null);
});

test("live event records preserve raw bodies, parse SSE, and exclude credentials", () => {
  const raw = "data: {\"tool\":\"python\"}\n\ndata: [DONE]\n\n";
  const event = liveCore.makeEvent({
    url: "https://chatgpt.com/backend-api/f/conversation",
    request_method: "POST",
    request_body: "{\"prompt\":\"redacted\"}",
    response_body: raw,
    response_headers: {
      Authorization: "Bearer secret",
      Cookie: "session=secret",
      "Content-Type": "text/event-stream",
      "X-Request-ID": "req-1",
    },
    status: 200,
  }, 7, { origin: "https://chatgpt.com" });
  assert.equal(event.accepted, true);
  assert.equal(event.sequence, 7);
  assert.equal(event.response_body, raw);
  assert.deepEqual(Object.keys(event.response_headers), ["content-type", "x-request-id"]);
  assert.equal(event.sse.frame_count, 2);
  assert.deepEqual(event.sse.frames[0].parsed, { tool: "python" });
  assert.equal(event.sse.frames[1].data, "[DONE]");
  assert.ok(event.source_hints.includes("tool_or_client_activity_marker"));
  const limited = liveCore.makeEvent({ url: "/backend-api/conversation/c1", response_body: "12345" }, 1, { origin: "https://chatgpt.com", maxBodyChars: 3 });
  assert.equal(limited.response_body, null);
  assert.equal(limited.response_body_omitted_reason, "body_limit");
});

test("live lifecycle sequences events and pause/stop/reset do not retain hidden events", () => {
  const lifecycle = liveCore.createLifecycle({ origin: "https://chatgpt.com" });
  assert.equal(lifecycle.record({ url: "/backend-api/conversation/c1", response_body: "before" }).accepted, false);
  assert.equal(lifecycle.start(), true);
  assert.equal(lifecycle.record({ url: "/backend-api/conversation/c1", response_body: "one" }).sequence, 1);
  assert.equal(lifecycle.pause(), true);
  assert.equal(lifecycle.record({ url: "/backend-api/conversation/c1", response_body: "paused" }).accepted, false);
  assert.equal(lifecycle.resume(), true);
  assert.equal(lifecycle.record({ url: "/backend-api/conversation/c1", response_body: "two" }).sequence, 2);
  assert.equal(lifecycle.stop(), true);
  assert.equal(lifecycle.record({ url: "/backend-api/conversation/c1", response_body: "stopped" }).accepted, false);
  assert.equal(lifecycle.getState().event_count, 2);
  lifecycle.reset();
  assert.deepEqual(lifecycle.getState(), { status: "ready", event_count: 0, next_sequence: 1 });
});

test("live hook restores page methods and remains development-only", () => {
  const hook = fs.readFileSync(path.join(ROOT, "live-hook.js"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  assert.match(hook, /globalThis\.fetch = originalFetch/);
  assert.match(hook, /XMLHttpRequest\.prototype\.open = originalOpen/);
  assert.match(hook, /XMLHttpRequest\.prototype\.send = originalSend/);
  assert.doesNotMatch(hook, /chrome\.storage|chrome\.runtime|chrome\.downloads/);
  assert.doesNotMatch(JSON.stringify(manifest), /debugger|webRequest|cookies/);
});

test("portable eval trace conserves source spans and keeps live events unmatched", () => {
  const conversation = makeConversation("c1", "One", "python");
  const graph = core.normalizeConversation(conversation);
  const tools = core.deriveToolEvents(graph.nodes);
  const trace = evalCore.buildTrace({
    traceId: "capture-1",
    graph,
    tools,
    liveEvents: [{ sequence: 1, transport: "fetch", path: "/backend-api/f/conversation", request_body: "req", response_body: "res" }],
  });
  const validation = evalCore.validateTrace(trace, graph, tools);
  assert.equal(validation.status, "no_differences_observed");
  assert.equal(validation.source_nodes, 3);
  assert.equal(validation.trace_tool_spans, 2);
  assert.equal(validation.live_events, 1);
  assert.equal(trace.spans.at(-1).attributes.unmatched_live_event, true);
  assert.equal(trace.spans.at(-1).source_pointer, null);
  assert.equal(core.stableStringify(trace), core.stableStringify(evalCore.buildTrace({ traceId: "capture-1", graph, tools, liveEvents: [{ sequence: 1, transport: "fetch", path: "/backend-api/f/conversation", request_body: "req", response_body: "res" }] })));
});

test("portable eval trace validator reports broken parent/source conservation", () => {
  const conversation = makeConversation("c1", "One");
  const graph = core.normalizeConversation(conversation);
  const tools = core.deriveToolEvents(graph.nodes);
  const trace = evalCore.buildTrace({ traceId: "capture-1", graph, tools });
  trace.spans.find((span) => span.span_id === "node:user").parent_span_id = "node:missing";
  const validation = evalCore.validateTrace(trace, graph, tools);
  assert.equal(validation.status, "differences_observed");
  assert.ok(validation.discrepancies.some((item) => item.type === "parent_mismatch"));
});

test("portable eval trace CLI is local-only and exports a redacted structural bundle", () => {
  const cli = path.join(ROOT, "tools", "export-eval-trace.mjs");
  const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /portable trace/);
  assert.doesNotMatch(fs.readFileSync(cli, "utf8"), /fetch\(|https?:\/\//);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "provenance-eval-trace-"));
  try {
    const bundle = path.join(temp, "bundle");
    const output = path.join(temp, "trace.json");
    const conversation = makeConversation("c1", "One", "python");
    const graph = core.normalizeConversation(conversation);
    const tools = core.deriveToolEvents(graph.nodes);
    fs.mkdirSync(path.join(bundle, "normalized"), { recursive: true });
    fs.writeFileSync(path.join(bundle, "manifest.json"), JSON.stringify({ capture_id: "capture-1" }));
    fs.writeFileSync(path.join(bundle, "normalized", "nodes.jsonl"), core.toJsonl(graph.nodes));
    fs.writeFileSync(path.join(bundle, "normalized", "edges.jsonl"), core.toJsonl(graph.edges));
    fs.writeFileSync(path.join(bundle, "normalized", "tool-events.jsonl"), core.toJsonl(tools));
    const result = spawnSync(process.execPath, [cli, bundle, output], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout.trim());
    assert.equal(summary.ok, true);
    assert.equal(JSON.parse(fs.readFileSync(output, "utf8")).validation.status, "no_differences_observed");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

console.log(`\n${passed} tests passed.`);
