import test from "node:test";
import assert from "node:assert/strict";
import { applyBadge } from "../src/utils/titleBadge.js";

test("puts the unread count in front of the title", () => {
  assert.equal(applyBadge("Events | PCPS Connect", 2), "(2) Events | PCPS Connect");
});

test("more than nine shows 9+", () => {
  assert.equal(applyBadge("Events", 14), "(9+) Events");
});

test("nothing unread leaves the title clean, and an old count is replaced", () => {
  assert.equal(applyBadge("Events", 0), "Events");
  assert.equal(applyBadge("(3) Events", 0), "Events");
  assert.equal(applyBadge("(3) Events", 1), "(1) Events");
  assert.equal(applyBadge("(9+) Events", 4), "(4) Events");
});

test("a title that merely starts with a bracket is not mistaken for a count", () => {
  assert.equal(applyBadge("(beta) Events", 2), "(2) (beta) Events");
});

test("bad input is harmless", () => {
  assert.equal(applyBadge(undefined, 3), "(3) ");
  assert.equal(applyBadge("Events", "x"), "Events");
});
