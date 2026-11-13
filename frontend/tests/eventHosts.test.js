import test from "node:test";
import assert from "node:assert/strict";
import { hostClubs, hostIds, hostNames, isHostedBy } from "../src/utils/eventHosts.js";
import { relatedEvents } from "../src/utils/relatedEvents.js";

const A = { _id: "a", name: "Coding" };
const B = { _id: "b", name: "Robotics" };

test("hosts are the main club then the co-hosts, populated or bare ids", () => {
  assert.deepEqual(hostIds({ club: A, coHosts: [B] }), ["a", "b"]);
  assert.deepEqual(hostIds({ club: "a", coHosts: ["b"] }), ["a", "b"]);
  assert.deepEqual(hostNames({ club: A, coHosts: [B] }), ["Coding", "Robotics"]);
  assert.deepEqual(hostClubs({ club: null }), []);
  assert.deepEqual(hostIds({}), []);
});

test("isHostedBy matches either side and never an empty id", () => {
  const e = { club: A, coHosts: [B] };
  assert.equal(isHostedBy(e, "b"), true);
  assert.equal(isHostedBy(e, "a"), true);
  assert.equal(isHostedBy(e, "z"), false);
  assert.equal(isHostedBy(e, ""), false);
});

test("related events include the other host's events first", () => {
  const future = new Date(Date.now() + 5 * 864e5).toISOString();
  const cur = { _id: "1", club: A, coHosts: [], category: "X", date: future };
  const events = [cur, { _id: "2", club: B, coHosts: [A], category: "Y", date: future }, { _id: "3", club: B, category: "Y", date: future }];
  assert.deepEqual(relatedEvents(events, cur).map((e) => e._id), ["2"]);
});

import { eventJsonLd } from "../src/utils/eventJsonLd.js";
import { searchSite } from "../src/utils/siteSearch.js";

test("structured data names every hosting club as an organizer", () => {
  const base = { _id: "e1", title: "Night", date: "2030-01-01T10:00:00.000Z", location: "Hall", description: "d" };
  assert.deepEqual(eventJsonLd({ ...base, club: A, coHosts: [] }, "https://s.example").organizer, { "@type": "Organization", name: "Coding" });
  assert.deepEqual(eventJsonLd({ ...base, club: A, coHosts: [B] }, "https://s.example").organizer.map((o) => o.name), ["Coding", "Robotics"]);
  assert.equal(eventJsonLd(base, "https://s.example").organizer, undefined);
});

test("site search finds an event by its co-host's name", () => {
  const events = [{ _id: "1", title: "Joint Night", date: "2030-01-01T10:00:00.000Z", club: A, coHosts: [B] }];
  assert.equal(searchSite(events, [], "robotics").events.length, 1);
});
