import test from "node:test";
import assert from "node:assert/strict";
import { eventsCsv, EVENTS_CSV_HEADER } from "../src/utils/eventsCsv.js";

test("one row per event with hosts joined and a safe title", () => {
  const csv = eventsCsv([
    { title: "=SUM(1)", date: "2030-01-10T04:15:00.000Z", location: "Hall", category: "Workshop", club: { _id: "a", name: "Coding Club" }, coHosts: [{ _id: "b", name: "Art Club" }], price: "Free", registeredCount: 12, capacity: 40, pendingCount: 2, averageRating: 4.25, ratingCount: 4 },
    { title: "Bare", date: null },
  ]).split("\r\n");
  assert.equal(csv.length, 3);
  assert.equal(csv[0].split(",").length, EVENTS_CSV_HEADER.length);
  assert.match(csv[1], /^"'=SUM\(1\)","2030-01-10T04:15:00.000Z","Hall","Workshop","Coding Club \+ Art Club","Free","12","40","2","4.3","4"$/);
  assert.match(csv[2], /^"Bare","","","","","","0","","0","","0"$/);
});
