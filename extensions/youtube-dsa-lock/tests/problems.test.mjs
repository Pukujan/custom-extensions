import test from "node:test";
import assert from "node:assert/strict";
import { PROBLEMS } from "../src/lib/problems.mjs";

test("problem bank is large enough for a fresh 10-problem session", () => {
  assert.ok(PROBLEMS.length >= 20);
  assert.equal(new Set(PROBLEMS.map((problem) => problem.id)).size, PROBLEMS.length);
});

test("every problem is executable and has sample plus submit tests", () => {
  for (const problem of PROBLEMS) {
    assert.match(problem.functionName, /^[a-z_][a-z0-9_]*$/);
    assert.ok(problem.starter.includes(`def ${problem.functionName}`));
    assert.ok(problem.examples.length >= 1);
    assert.ok(problem.tests.length >= 1);
    for (const testCase of [...problem.examples, ...problem.tests]) {
      assert.ok(Array.isArray(testCase.args));
      assert.ok(Object.hasOwn(testCase, "expected"));
    }
  }
});
