"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const Core = require(path.join(ROOT, "core.js"));

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

function canonFolders(folders) {
  return [...folders]
    .map((g) => ({ name: g.name, ids: [...g.conversation_ids].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.ids.join(",").localeCompare(b.ids.join(",")));
}

function summary(id, create, title = id) {
  return { id, title, create_time: create, update_time: create };
}

function profile(id, title, keywords) {
  return { id, title, create_time: "2026-01-01T00:00:00Z", update_time: "2026-01-02T00:00:00Z", message_count: 4, keywords };
}

test("manifest is MV3 and narrowly scoped", () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  assert.equal(m.manifest_version, 3);
  assert.deepEqual(m.host_permissions, ["https://chatgpt.com/*"]);
  assert.deepEqual([...m.permissions].sort(), ["alarms", "scripting", "storage", "tabs"].sort());
  assert.ok(Array.isArray(m.optional_host_permissions));
  assert.ok(m.optional_host_permissions.length >= 2);
  assert.ok(!m.optional_host_permissions.includes("<all_urls>"));
  assert.ok(m.optional_host_permissions.every((x) => /^https:\/\/[^*][^/]*\/\*$/.test(x)));
});

test("all runtime JavaScript parses", () => {
  for (const file of ["core.js", "background.js", "session-bridge.js", "popup.js", "library.js"]) {
    const r = spawnSync(process.execPath, ["--check", path.join(ROOT, file)], { encoding: "utf8" });
    assert.equal(r.status, 0, `${file}: ${r.stderr}`);
  }
});

test("post-snapshot conversations are excluded", () => {
  const cutoff = Date.parse("2026-10-02T12:00:00Z");
  let state = Core.makeEnumerationState(cutoff);
  state = Core.applyEnumerationPage(state, {
    total: 3,
    items: [
      summary("old-a", "2026-09-01T00:00:00Z"),
      summary("new-x", "2026-10-02T12:00:01Z"),
      summary("old-b", "2026-01-01T00:00:00Z"),
    ],
  });
  assert.deepEqual(state.queue.map((x) => x.id).sort(), ["old-a", "old-b"]);
});

test("overlap and duplicate IDs are idempotent", () => {
  const cutoff = Date.parse("2026-10-02T12:00:00Z");
  let state = Core.makeEnumerationState(cutoff);
  state = Core.applyEnumerationPage(state, { total: 200, items: Array.from({ length: 100 }, (_, i) => summary(`c${i}`, "2026-01-01T00:00:00Z")) });
  state = Core.applyEnumerationPage(state, { total: 120, items: Array.from({ length: 40 }, (_, i) => summary(`c${80 + i}`, "2026-01-01T00:00:00Z")) });
  assert.equal(new Set(state.queue.map((x) => x.id)).size, state.queue.length);
  assert.equal(state.queue.length, 120);
});

test("malformed enumeration payload fails closed", () => {
  assert.throws(() => Core.applyEnumerationPage(Core.makeEnumerationState(Date.now()), { nope: [] }), /items/i);
});

test("conversation profiling stores compact derived fields only", () => {
  const raw = {
    mapping: {
      a: { message: { author: { role: "user" }, content: { parts: ["Build a Brave browser extension for ChatGPT folders and automation"] } } },
      b: { message: { author: { role: "assistant" }, content: { parts: ["Use a Chromium extension with persistent checkpoints"] } } },
    },
  };
  const p = Core.profileConversation(raw, summary("c1", "2026-01-01T00:00:00Z", "Brave extension organizer"));
  assert.equal(p.id, "c1");
  assert.ok(p.keywords.includes("brave") || p.keywords.includes("extension"));
  assert.equal(Object.prototype.hasOwnProperty.call(p, "text"), false);
  assert.equal(JSON.stringify(p).includes("persistent checkpoints"), false);
});

test("title-only fallback remains valid", () => {
  const p = Core.fallbackProfile(summary("c1", "2026-01-01T00:00:00Z", "Python API debugging"), "bad mapping");
  assert.equal(p.id, "c1");
  assert.ok(p.keywords.length > 0);
  assert.equal(p.profile_warning, "bad mapping");
});

test("deterministic grouping covers every profile once", () => {
  const input = [
    profile("a", "Python API", ["python", "api", "debugging"]),
    profile("b", "Python script", ["python", "script", "automation"]),
    profile("c", "React UI", ["react", "frontend", "javascript"]),
    profile("d", "React hooks", ["react", "hooks", "javascript"]),
    profile("e", "Travel plan", ["travel", "hotel", "flight"]),
  ];
  const folders = Core.groupConversations(input, 6);
  const ids = folders.flatMap((g) => g.conversation_ids);
  assert.deepEqual([...ids].sort(), input.map((x) => x.id).sort());
  assert.equal(new Set(ids).size, input.length);
});

test("co-occurring synonym anchors do not crowd out distinct topics", () => {
  const input = [];
  for (let topic = 0; topic < 4; topic++) {
    for (let i = 0; i < 5; i++) {
      input.push(profile(`${topic}-${i}`, `Topic ${topic} item ${i}`, [`topic${topic}a`, `topic${topic}b`, "shared"]));
    }
  }
  const folders = Core.groupConversations(input, 6);
  for (const folder of folders) {
    const labels = new Set(folder.conversation_ids.map((id) => id.split("-")[0]));
    assert.equal(labels.size, 1, `mixed distinct topics in ${folder.name}`);
  }
});

test("metamorphic: grouping is invariant to input order", () => {
  const input = [
    profile("a", "Python API", ["python", "api", "debugging"]),
    profile("b", "Python script", ["python", "script", "automation"]),
    profile("c", "React UI", ["react", "frontend", "javascript"]),
    profile("d", "React hooks", ["react", "hooks", "javascript"]),
    profile("e", "Travel plan", ["travel", "hotel", "flight"]),
    profile("f", "Cheap flights", ["travel", "flight", "booking"]),
  ];
  const a = canonFolders(Core.groupConversations(input, 6));
  const b = canonFolders(Core.groupConversations([...input].reverse(), 6));
  assert.deepEqual(a, b);
});

test("duplicate profiles do not duplicate membership", () => {
  const p = profile("a", "Python API", ["python", "api"]);
  const folders = Core.groupConversations([p, p, profile("b", "React UI", ["react", "javascript"])], 6);
  const ids = folders.flatMap((g) => g.conversation_ids);
  assert.deepEqual([...ids].sort(), ["a", "b"]);
});

test("start/pause/resume preserves frozen phase", () => {
  const s = Core.startRun(Core.freshState(4), 12345, "run-1");
  assert.equal(s.phase, "enumerating");
  const paused = Core.pauseRun(s);
  assert.equal(paused.phase, "paused");
  assert.equal(paused.resume_phase, "enumerating");
  const resumed = Core.resumeRun(paused);
  assert.equal(resumed.phase, "enumerating");
  assert.equal(resumed.snapshot_cutoff_ms, 12345);
  assert.equal(resumed.run_id, "run-1");
});

test("reset is independent and invalidates stale generation", () => {
  const dirty = Core.startRun(Core.freshState(7), 12345, "run-1");
  dirty.profiles = { secret: { id: "secret" } };
  dirty.folders = [{ id: "x" }];
  const reset = Core.resetRun(dirty);
  assert.equal(reset.phase, "idle");
  assert.equal(reset.generation, 8);
  assert.deepEqual(reset.profiles, {});
  assert.deepEqual(reset.folders, []);
  assert.equal(Core.canCommit(dirty, "run-1", 7), true);
  assert.equal(Core.canCommit(reset, "run-1", 7), false);
});

test("start refuses to replace a non-idle run", () => {
  const done = Core.startRun(Core.freshState(1), 10, "r");
  done.phase = "done";
  assert.throws(() => Core.startRun(done, 20, "r2"), /Reset/i);
});

test("valid LLM refinement can rename and merge known groups", () => {
  const base = [
    { id: "g-a", name: "Python", conversation_ids: ["a"], keywords: ["python"], representative_titles: ["A"] },
    { id: "g-b", name: "APIs", conversation_ids: ["b"], keywords: ["api"], representative_titles: ["B"] },
    { id: "g-c", name: "Travel", conversation_ids: ["c"], keywords: ["travel"], representative_titles: ["C"] },
  ];
  const refined = Core.applyLlmRefinement(base, { groups: [{ name: "Python & APIs", source_group_ids: ["g-a", "g-b"] }] });
  assert.equal(refined.length, 2);
  assert.ok(refined.some((g) => g.name === "Python & APIs" && g.conversation_ids.length === 2));
  assert.ok(refined.some((g) => g.id === "g-c"));
});

test("LLM refinement rejects invented and duplicated source IDs", () => {
  const base = [{ id: "g-a", name: "A", conversation_ids: ["a"], keywords: [], representative_titles: [] }];
  assert.throws(() => Core.applyLlmRefinement(base, { groups: [{ name: "X", source_group_ids: ["fake"] }] }), /unknown/i);
  assert.throws(() => Core.applyLlmRefinement(base, { groups: [
    { name: "X", source_group_ids: ["g-a"] },
    { name: "Y", source_group_ids: ["g-a"] },
  ] }), /used more than once/i);
});

test("LLM payload contains group metadata, not transcript bodies", () => {
  const folders = [{ id: "g", name: "Code", conversation_ids: ["a"], keywords: ["python"], representative_titles: ["Fix API"] }];
  const payload = Core.makeRefinementPayload(folders);
  const text = JSON.stringify(payload);
  assert.ok(text.includes("Fix API"));
  assert.equal(text.includes("conversation_body"), false);
  assert.equal(text.includes("raw"), false);
});

test("malformed refinement JSON is rejected", () => {
  assert.throws(() => Core.parseRefinementResponse("not json"), /JSON/i);
  assert.deepEqual(Core.parseRefinementResponse("```json\n{\"groups\":[]}\n```"), { groups: [] });
});

test("session bridge is explicit-only and has no passive watcher", () => {
  const src = fs.readFileSync(path.join(ROOT, "session-bridge.js"), "utf8");
  assert.ok(src.includes("GET_CHATGPT_ACCESS_TOKEN"));
  assert.equal(/MutationObserver/.test(src), false);
  assert.equal(/setInterval\s*\(/.test(src), false);
  assert.equal(/addEventListener\s*\(\s*["'](?:input|keydown|submit|popstate)/.test(src), false);
});

test("background has durable recovery primitives", () => {
  const src = fs.readFileSync(path.join(ROOT, "background.js"), "utf8");
  assert.ok(src.includes("chrome.storage.local"));
  assert.ok(src.includes("chrome.alarms"));
  assert.ok(src.includes("generation"));
  assert.ok(src.includes("snapshot_cutoff_ms"));
});

test("ChatGPT adapter is read-only", () => {
  const src = fs.readFileSync(path.join(ROOT, "background.js"), "utf8");
  const chatFetchBlocks = src.split("fetch(").slice(1).filter((x) => x.includes("chatgpt.com") || x.includes("CHATGPT_ORIGIN"));
  assert.ok(chatFetchBlocks.length >= 1);
  assert.equal(/method\s*:\s*["'](?:POST|PATCH|PUT|DELETE)["']/.test(src.match(/async function fetchChatGPT[\s\S]*?\n  }/m)?.[0] || ""), false);
  assert.equal(/\/backend-api\/conversation[^\n]*method\s*:\s*["'](?:POST|PATCH|PUT|DELETE)/.test(src), false);
});

test("BYOK provider list is bounded and HTTPS-only", () => {
  for (const [id, p] of Object.entries(Core.PROVIDERS)) {
    assert.ok(id.length > 0);
    assert.match(p.endpoint, /^https:\/\//);
    assert.match(p.permission, /^https:\/\/[^*][^/]*\/\*$/);
  }
});

test("future noise metamorphic relation preserves frozen queue", () => {
  const cutoff = Date.parse("2026-05-01T00:00:00Z");
  const base = [summary("a", "2026-01-01T00:00:00Z"), summary("b", "2026-02-01T00:00:00Z")];
  const future = Array.from({ length: 20 }, (_, i) => summary(`future-${i}`, "2026-06-01T00:00:00Z"));
  const a = Core.applyEnumerationPage(Core.makeEnumerationState(cutoff), { total: base.length, items: base }).queue.map((x) => x.id).sort();
  const b = Core.applyEnumerationPage(Core.makeEnumerationState(cutoff), { total: base.length + future.length, items: [...future, ...base] }).queue.map((x) => x.id).sort();
  assert.deepEqual(a, b);
});

(async () => {
  let passed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`ok - ${name}`);
    } catch (err) {
      console.error(`not ok - ${name}`);
      console.error(err.stack || err);
      process.exitCode = 1;
    }
  }
  console.log(`\n${passed}/${tests.length} tests passed`);
  if (passed !== tests.length) process.exitCode = 1;
})();