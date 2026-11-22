import test from "node:test";
import assert from "node:assert/strict";
import { findClash } from "../src/utils/scheduleClash.js";

const H = 3600000;
const NOW = new Date("2030-01-01T00:00:00Z");
const at = (h) => new Date(NOW.getTime() + h * H).toISOString();
const ev = (id, startH, endH) => ({ _id: id, title: id, date: at(startH), endDate: endH == null ? null : at(endH) });
const reg = (event, status = "confirmed") => ({ status, event });

test("flags an event that overlaps one you are registered for", () => {
  assert.equal(findClash(ev("a", 10, 12), [reg(ev("b", 11, 13))], NOW)._id, "b");
  assert.equal(findClash(ev("a", 10, 14), [reg(ev("b", 11, 12))], NOW)._id, "b");
});

test("back to back is not a clash", () => {
  assert.equal(findClash(ev("a", 10, 12), [reg(ev("b", 12, 13))], NOW), null);
  assert.equal(findClash(ev("a", 10, 12), [reg(ev("b", 8, 10))], NOW), null);
});

test("an event with no end time counts as one hour", () => {
  assert.equal(findClash(ev("a", 10, null), [reg(ev("b", 10, null))], NOW)._id, "b");
  assert.equal(findClash(ev("a", 10, null), [reg(ev("b", 11, null))], NOW), null);
  assert.equal(findClash(ev("a", 10, null), [reg(ev("b", 9, 11))], NOW)._id, "b");
});

test("a bad end time falls back to one hour", () => {
  assert.equal(findClash(ev("a", 10, 9), [reg(ev("b", 10.5, null))], NOW)._id, "b");
});

test("ignores the same event, cancelled sign-ups, and events already started", () => {
  assert.equal(findClash(ev("a", 10, 12), [reg(ev("a", 10, 12))], NOW), null);
  assert.equal(findClash(ev("a", 10, 12), [reg(ev("b", 10, 12), "cancelled")], NOW), null);
  assert.equal(findClash(ev("a", -2, 1), [reg(ev("b", -3, 0.5))], NOW), null);
});

test("a request waiting for approval counts, and the earliest clash is returned", () => {
  const found = findClash(ev("a", 10, 20), [reg(ev("late", 15, 16)), reg(ev("early", 11, 12), "pending")], NOW);
  assert.equal(found._id, "early");
});

test("copes with missing or broken data", () => {
  assert.equal(findClash(ev("a", 10, 12), undefined, NOW), null);
  assert.equal(findClash({ _id: "a", date: "nonsense" }, [reg(ev("b", 10, 12))], NOW), null);
  assert.equal(findClash(ev("a", 10, 12), [{ status: "confirmed" }, null, reg({ _id: "x", date: "bad" })], NOW), null);
});
