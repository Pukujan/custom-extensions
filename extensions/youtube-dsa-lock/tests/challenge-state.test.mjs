import test from "node:test";
import assert from "node:assert/strict";
import { createChallengeState, progress, sampleUnique, withCode, withPassed } from "../src/lib/challenge-state.mjs";

test("sampleUnique selects distinct values", () => {
  const chosen = sampleUnique([1,2,3,4], 3, () => 0.25);
  assert.equal(chosen.length, 3);
  assert.equal(new Set(chosen).size, 3);
});

test("challenge tracks code and idempotent passes", () => {
  let state = createChallengeState(["a","b","c"], 2, 123, () => 0);
  const id = state.selectedIds[0];
  state = withCode(state, id, "print('x')");
  state = withPassed(state, id);
  state = withPassed(state, id);
  assert.equal(state.codeById[id], "print('x')");
  assert.deepEqual(progress(state), { passed: 1, total: 2 });
});
