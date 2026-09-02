import test from "node:test";
import assert from "node:assert/strict";
import { burnInStatus } from "../lib/burnin.mjs";

test("requires a full 60 clean minutes", () => {
  const t0 = 1_000_000;
  assert.equal(burnInStatus({ startedAtMs: t0, nowMs: t0 + 59 * 60_000, failureCount: 0, requiredMinutes: 60 }).eligible, false);
  assert.equal(burnInStatus({ startedAtMs: t0, nowMs: t0 + 60 * 60_000, failureCount: 0, requiredMinutes: 60 }).eligible, true);
});

test("a recorded enforcement failure prevents arming", () => {
  const status = burnInStatus({ startedAtMs: 1, nowMs: 99_999_999, failureCount: 1, requiredMinutes: 60 });
  assert.equal(status.eligible, false);
  assert.equal(status.reason, "health-failure");
});
