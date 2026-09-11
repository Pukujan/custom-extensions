import test from "node:test";
import assert from "node:assert/strict";
import { loadPyodide } from "pyodide";
import { runWithPyodide } from "../src/lib/python-harness.mjs";

let pyodide;

test("Pyodide harness accepts correct Python and rejects wrong output", async () => {
  pyodide ??= await loadPyodide();
  const tests = [{ args: [[2,7,11,15], 9], expected: [0,1] }];
  const good = await runWithPyodide(pyodide, {
    functionName: "two_sum",
    tests,
    code: "def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n"
  });
  assert.equal(good.ok, true);
  assert.equal(good.passed, 1);

  const bad = await runWithPyodide(pyodide, {
    functionName: "two_sum",
    tests,
    code: "def two_sum(nums, target):\n    return [0, 0]\n"
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.failure.test, 1);
});
