import test from "node:test";
import assert from "node:assert/strict";
import { BLOCK_RULE_IDS, buildBlockingRules, computeUnlockUntil, isUnlockActive } from "../src/lib/lock.mjs";

test("unlock state respects expiry", () => {
  assert.equal(isUnlockActive(2_000, 1_999), true);
  assert.equal(isUnlockActive(2_000, 2_000), false);
  assert.equal(isUnlockActive(undefined, 1_000), false);
});

test("unlock time is computed exactly", () => {
  assert.equal(computeUnlockUntil(1_000, 60_000), 61_000);
  assert.throws(() => computeUnlockUntil(1_000, 0));
});

test("blocking rules cover three hosts for frames", () => {
  const rules = buildBlockingRules();
  assert.equal(rules.length, 6);
  assert.deepEqual(rules.map((rule) => rule.id), [...BLOCK_RULE_IDS]);
  assert.equal(rules.filter((rule) => rule.action.type === "redirect").length, 3);
  assert.equal(rules.filter((rule) => rule.action.type === "block").length, 3);
});
