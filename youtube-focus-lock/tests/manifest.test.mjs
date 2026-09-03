import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));

test("popup may health-check the localhost coding judge", () => {
  assert.ok(manifest.host_permissions.includes("http://127.0.0.1/*"));
});

test("localhost host permissions use valid Chrome match patterns without ports", () => {
  const local = manifest.host_permissions.filter((p) => p.startsWith("http://127.0.0.1") || p.startsWith("http://localhost"));
  assert.deepEqual(local.sort(), ["http://127.0.0.1/*", "http://localhost/*"].sort());
  assert.ok(local.every((p) => !/^https?:\/\/[^/]+:\d+\//.test(p)), "host_permissions match patterns must not embed ports");
});
