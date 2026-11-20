import test from "node:test";
import assert from "node:assert/strict";
import { startsLabel } from "../src/utils/startsLabel.js";

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const now = at(2030, 5, 10, 14, 0);

test("later today, tomorrow and a few days ahead", () => {
  assert.deepEqual(startsLabel({ date: at(2030, 5, 10, 18) }, now), { key: "Starts today" });
  assert.deepEqual(startsLabel({ date: at(2030, 5, 11, 9) }, now), { key: "Starts tomorrow" });
  assert.deepEqual(startsLabel({ date: at(2030, 5, 14, 9) }, now), { key: "Starts in {n} days", n: 4 });
  assert.deepEqual(startsLabel({ date: at(2030, 5, 17, 9) }, now), { key: "Starts in {n} days", n: 7 });
});

test("tomorrow just after midnight is tomorrow, not today", () => {
  assert.deepEqual(startsLabel({ date: at(2030, 5, 11, 0, 30) }, at(2030, 5, 10, 23, 30)), { key: "Starts tomorrow" });
});

test("far-off, started and finished events get no label", () => {
  assert.equal(startsLabel({ date: at(2030, 5, 18, 9) }, now), null);
  assert.equal(startsLabel({ date: at(2030, 5, 10, 13), endDate: at(2030, 5, 10, 16) }, now), null);
  assert.equal(startsLabel({ date: at(2030, 5, 9, 9) }, now), null);
});

test("a missing or broken date gives no label", () => {
  assert.equal(startsLabel({}, now), null);
  assert.equal(startsLabel({ date: "nonsense" }, now), null);
});
