import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../lib/config.mjs";
import { isAllowedAt, findNextTransition, formatWindow } from "../lib/schedule.mjs";

test("blocks immediately before 11:00 New York time", () => {
  assert.equal(isAllowedAt(new Date("2026-09-02T14:59:59Z"), CONFIG), false);
});

test("allows at 11:00 and throughout the access hour", () => {
  assert.equal(isAllowedAt(new Date("2026-09-02T15:00:00Z"), CONFIG), true);
  assert.equal(isAllowedAt(new Date("2026-09-02T15:59:59Z"), CONFIG), true);
});

test("blocks at 12:00 exactly", () => {
  assert.equal(isAllowedAt(new Date("2026-09-02T16:00:00Z"), CONFIG), false);
});

test("finds next transition into allowed window", () => {
  const next = findNextTransition(new Date("2026-09-02T14:30:00Z"), CONFIG);
  assert.equal(next.toISOString(), "2026-09-02T15:00:00.000Z");
});

test("finds next transition out of allowed window", () => {
  const next = findNextTransition(new Date("2026-09-02T15:30:00Z"), CONFIG);
  assert.equal(next.toISOString(), "2026-09-02T16:00:00.000Z");
});

test("survives DST fall-back day without inventing an extra access window", () => {
  assert.equal(isAllowedAt(new Date("2026-11-01T16:30:00Z"), CONFIG), true);
  assert.equal(isAllowedAt(new Date("2026-11-01T17:00:00Z"), CONFIG), false);
});

test("human readable window", () => {
  assert.equal(formatWindow(CONFIG), "11:00 AM–12:00 PM");
});
