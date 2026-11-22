import test from "node:test";
import assert from "node:assert/strict";
import { clubOverlap } from "../src/utils/clubOverlap.js";

const NOW = new Date("2030-01-01T00:00:00Z");
const iso = (h) => new Date(NOW.getTime() + h * 36e5).toISOString();
const local = (h) => { const d = new Date(NOW.getTime() + h * 36e5); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const ev = (id, club, startH, endH, extra = {}) => ({ _id: id, title: id, club, date: iso(startH), endDate: iso(endH), ...extra });

test("finds another event of the same club at the same time", () => {
  const events = [ev("robot", "c1", 11, 12)];
  assert.equal(clubOverlap({ club: "c1", date: local(10), endDate: local(13) }, events, null, NOW)._id, "robot");
});

test("ignores other clubs, back to back, and the event being edited", () => {
  const events = [ev("other", "c2", 11, 12), ev("later", "c1", 13, 14), ev("self", "c1", 10, 13)];
  assert.equal(clubOverlap({ club: "c1", date: local(10), endDate: local(13) }, events, "self", NOW), null);
});

test("counts a populated club object and co-hosting", () => {
  assert.equal(clubOverlap({ club: "c1", date: local(10), endDate: local(13) }, [ev("a", { _id: "c1" }, 11, 12)], null, NOW)._id, "a");
  assert.equal(clubOverlap({ club: "c1", date: local(10), endDate: local(13) }, [ev("b", "c9", 11, 12, { coHosts: ["c1"] })], null, NOW)._id, "b");
});

test("says nothing while the form is incomplete", () => {
  const events = [ev("robot", "c1", 11, 12)];
  assert.equal(clubOverlap({ club: "", date: local(10) }, events, null, NOW), null);
  assert.equal(clubOverlap({ club: "c1", date: "" }, events, null, NOW), null);
  assert.equal(clubOverlap(undefined, events, null, NOW), null);
});
