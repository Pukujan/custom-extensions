"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const core = require("../core.js");
globalThis.ChatGPTProvenanceCore = core;
const accountCore = require("../account-core.js");

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

for (const file of ["core.js", "content.js", "background.js", "popup.js", "account-core.js", "account-runner.js"]) {
  test(`${file} syntax`, () => syntax(file));
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

console.log(`\n${passed} tests passed.`);
