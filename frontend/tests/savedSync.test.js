import test from "node:test";
import assert from "node:assert/strict";
import { mergeSaved, sameList, syncable } from "../src/utils/savedSync.js";

const id = (n) => String(n).padStart(24, "a");

test("only real event ids are sent to the account", () => {
  assert.deepEqual(syncable([id(1), "e1", "", id(2)]), [id(1), id(2)]);
});

test("the first time on a device, local saves join the account's, local first, once each", () => {
  assert.deepEqual(mergeSaved([id(3), id(1)], [id(1), id(2)], true), [id(3), id(1), id(2)]);
});

test("after that the account wins, so an event unsaved elsewhere stays gone", () => {
  assert.deepEqual(mergeSaved([id(3), id(1)], [id(2)], false), [id(2)]);
});

test("the list is capped at 200", () => {
  const many = Array.from({ length: 250 }, (_, i) => id(i));
  assert.equal(mergeSaved(many, [], true).length, 200);
  assert.equal(mergeSaved([], many, false).length, 200);
});

test("sameList compares order and content", () => {
  assert.equal(sameList([id(1), id(2)], [id(1), id(2)]), true);
  assert.equal(sameList([id(1), id(2)], [id(2), id(1)]), false);
  assert.equal(sameList([id(1)], [id(1), id(2)]), false);
});
