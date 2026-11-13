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
