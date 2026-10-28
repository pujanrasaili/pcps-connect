import test from "node:test";
import assert from "node:assert/strict";
import { changeLabel } from "../src/utils/weekSummary.js";

test("changeLabel describes up, down, same and no-baseline weeks", () => {
  assert.equal(changeLabel({ current: 6, previous: 4, change: 50 }), "Up 50% from 4 the week before");
  assert.equal(changeLabel({ current: 1, previous: 3, change: -67 }), "Down 67% from 3 the week before");
  assert.equal(changeLabel({ current: 3, previous: 3, change: 0 }), "Same as the week before");
  assert.equal(changeLabel({ current: 4, previous: 0, change: null }), "None the week before");
  assert.equal(changeLabel({ current: 0, previous: 0, change: null }), "None in either week");
  assert.equal(changeLabel(null), "");
});
