"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Core = require("./core.js");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}

const cutoff = Date.parse("2026-08-20T23:00:00Z");

test("strict cutoff: one millisecond older is eligible", () => {
  assert.equal(
    Core.isEligible({ update_time: new Date(cutoff - 1).toISOString() }, cutoff, "updated"),
    true
  );
});

test("strict cutoff: exactly at cutoff is not eligible", () => {
  assert.equal(
    Core.isEligible({ update_time: new Date(cutoff).toISOString() }, cutoff, "updated"),
    false
  );
});

test("strict cutoff: newer than cutoff is not eligible", () => {
  assert.equal(
    Core.isEligible({ update_time: new Date(cutoff + 1).toISOString() }, cutoff, "updated"),
    false
  );
});

test("updated basis protects an old chat touched recently", () => {
  const chat = {
    create_time: "2025-01-01T00:00:00Z",
    update_time: "2026-08-29T00:00:00Z"
  };
  assert.equal(Core.isEligible(chat, cutoff, "updated"), false);
  assert.equal(Core.isEligible(chat, cutoff, "created"), true);
});

test("invalid or missing timestamps fail closed", () => {
  assert.equal(Core.isEligible({ update_time: "garbage" }, cutoff, "updated"), false);
  assert.equal(Core.isEligible({}, cutoff, "updated"), false);
  assert.equal(Core.isEligible(null, cutoff, "updated"), false);
});

test("candidate builder deduplicates IDs and sorts oldest first", () => {
  const chats = [
    { id: "b", title: "B", update_time: "2026-08-10T00:00:00Z" },
    { id: "a", title: "A", update_time: "2026-08-01T00:00:00Z" },
    { id: "a", title: "A duplicate", update_time: "2026-07-01T00:00:00Z" },
    { id: "c", title: "C recent", update_time: "2026-08-29T00:00:00Z" }
  ];
  const out = Core.buildCandidates(chats, cutoff, "updated");
  assert.deepEqual(out.map(x => x.id), ["a", "b"]);
});

test("frozen scan snapshot does not change when wall clock advances", () => {
  const chats = [
    { id: "old", update_time: "2026-08-10T00:00:00Z" },
    { id: "near", update_time: "2026-08-21T00:00:00Z" }
  ];
  const snap = Core.makeScanSnapshot(chats, cutoff, "updated", 10, "scan-1");
  assert.deepEqual(snap.candidates.map(x => x.id), ["old"]);

  const muchLaterCutoff = Date.parse("2026-09-01T00:00:00Z");
  assert.equal(Core.isEligible(chats[1], muchLaterCutoff, "updated"), true);
  assert.deepEqual(snap.candidates.map(x => x.id), ["old"]);
});

test("deletion progress is monotonic and conserved", () => {
  let p = Core.makeDeletionProgress(1000, "scan-x");
  for (let i = 0; i < 1000; i++) {
    const success = i % 7 !== 0;
    p = Core.advanceDeletionProgress(p, success, success ? null : { id: String(i) });
    assert.equal(p.index, i + 1);
    assert.equal(p.deleted + p.failed, p.index);
    assert.ok(p.index <= p.total);
  }
  const terminal = Core.advanceDeletionProgress(p, true);
  assert.equal(terminal.index, 1000);
  assert.equal(terminal.deleted + terminal.failed, 1000);
});

test("randomized eligibility invariant over 25,000 chats", () => {
  let seed = 0xC0FFEE;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }

  const chats = [];
  const expected = new Map();

  for (let i = 0; i < 25000; i++) {
    const id = `id-${Math.floor(i / 2)}`; // deliberately creates duplicates
    const deltaDays = Math.floor((rand() * 80) - 40);
    const ms = cutoff + deltaDays * 86400000 + Math.floor(rand() * 86400000);
    const valid = rand() > 0.015;
    const ts = valid ? new Date(ms).toISOString() : "not-a-date";

    chats.push({
      id,
      title: `Chat ${i}`,
      create_time: new Date(ms - 100000).toISOString(),
      update_time: ts
    });

    if (!expected.has(id) && valid && ms < cutoff) {
      expected.set(id, ms);
    }
  }

  const out = Core.buildCandidates(chats, cutoff, "updated");
  const ids = out.map(x => x.id);

  assert.equal(new Set(ids).size, ids.length, "candidate IDs must be unique");
  assert.equal(ids.length, expected.size, "candidate count must match predicate");
  for (const c of out) {
    assert.ok(c.timeMs < cutoff, "every candidate must satisfy frozen cutoff");
  }
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i - 1].timeMs <= out[i].timeMs, "candidates must be sorted oldest first");
  }
});

test("architecture invariant: popup contains no ChatGPT backend loop", () => {
  const popup = fs.readFileSync(path.join(__dirname, "popup.js"), "utf8");
  const runner = fs.readFileSync(path.join(__dirname, "runner.js"), "utf8");
  assert.equal(popup.includes("/backend-api/"), false);
  assert.equal(runner.includes("/backend-api/"), true);
  assert.equal(runner.includes("chrome.storage.local"), true);
});

test("architecture invariant: persistent content runner is declared in manifest", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8"));
  assert.ok(manifest.permissions.includes("storage"));
  assert.ok(Array.isArray(manifest.content_scripts));
  const scripts = manifest.content_scripts.flatMap(x => x.js || []);
  assert.ok(scripts.includes("core.js"));
  assert.ok(scripts.includes("runner.js"));
});

test("default age basis is last-updated", () => {
  const html = fs.readFileSync(path.join(__dirname, "popup.html"), "utf8");
  assert.match(html, /<option value="updated" selected>Last updated date<\/option>/);
});

console.log(`\n${passed} invariant/property tests passed.`);
