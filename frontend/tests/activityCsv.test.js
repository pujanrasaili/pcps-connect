import test from "node:test";
import assert from "node:assert/strict";
import { activityCsv, ACTIVITY_CSV_HEADER } from "../src/utils/activityCsv.js";

test("one row per entry, labelled, with formula-looking text defused", () => {
  const rows = activityCsv(
    [{ createdAt: "2030-01-10T04:15:00.000Z", actorName: "Asha Rai", action: "event.deleted", summary: '=1+1, "x"' }, { actorName: null, action: "a", summary: "" }],
    (a) => `L:${a}`
  ).split("\r\n");
  assert.equal(rows[0], ACTIVITY_CSV_HEADER.map((h) => `"${h}"`).join(","));
  assert.equal(rows[1], `"2030-01-10T04:15:00.000Z","Asha Rai","L:event.deleted","'=1+1, ""x"""`);
  assert.equal(rows[2], `"","","L:a",""`);
});
