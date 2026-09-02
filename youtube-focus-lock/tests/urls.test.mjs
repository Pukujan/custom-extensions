import test from "node:test";
import assert from "node:assert/strict";
import { shouldBlockUrl, buildBlockingRules } from "../lib/urls.mjs";

for (const url of [
  "https://youtube.com/watch?v=x",
  "https://www.youtube.com/shorts/x",
  "https://music.youtube.com/watch?v=x",
  "https://youtu.be/x",
  "https://www.youtube-nocookie.com/embed/x"
]) {
  test(`classifies ${url} as YouTube`, () => assert.equal(shouldBlockUrl(url), true));
}

test("does not block lookalike domains", () => {
  assert.equal(shouldBlockUrl("https://youtube.com.evil.example/"), false);
  assert.equal(shouldBlockUrl("https://notyoutube.com/"), false);
});

test("builds three high-priority redirect rules", () => {
  const rules = buildBlockingRules();
  assert.deepEqual(rules.map((r) => r.id), [1001, 1002, 1003]);
  assert.ok(rules.every((r) => r.action.type === "redirect"));
});
