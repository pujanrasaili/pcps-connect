import test from "node:test";
import assert from "node:assert/strict";
import { reportPeriod, reportFileName } from "../src/utils/reportPeriod.js";

test("no dates asks for every past event", () => {
  assert.deepEqual(reportPeriod("", ""), { params: { all: 1 } });
});

test("the period runs from the start of the first day to the end of the last, in local time", () => {
  const { params } = reportPeriod("2026-01-15", "2026-01-15");
  const from = new Date(params.from);
  const to = new Date(params.to);
  assert.equal(from.getHours(), 0);
  assert.equal(from.getMinutes(), 0);
  assert.equal(to.getHours(), 23);
  assert.equal(to.getMinutes(), 59);
  assert.equal(from.getDate(), 15);
  assert.equal(to.getDate(), 15);
});

test("either end may be left open", () => {
  assert.equal("to" in reportPeriod("2026-01-15", "").params, false);
  assert.equal("from" in reportPeriod("", "2026-01-15").params, false);
});

test("an end before the start is refused", () => {
  assert.deepEqual(reportPeriod("2026-06-30", "2026-01-01"), { error: "order" });
});

test("a nonsense date is refused", () => {
  assert.deepEqual(reportPeriod("2026-13-45", ""), { error: "invalid" });
});

test("file names say which period they cover", () => {
  assert.equal(reportFileName("2026-11-21", "", ""), "attendance-report-2026-11-21.csv");
  assert.equal(reportFileName("2026-11-21", "2026-01-01", "2026-06-30"), "attendance-report-2026-11-21-2026-01-01-to-2026-06-30.csv");
  assert.equal(reportFileName("2026-11-21", "2026-01-01", ""), "attendance-report-2026-11-21-2026-01-01-to-today.csv");
  assert.equal(reportFileName("2026-11-21", "", "2026-06-30"), "attendance-report-2026-11-21-start-to-2026-06-30.csv");
});
