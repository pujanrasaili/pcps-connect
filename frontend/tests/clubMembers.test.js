import test from "node:test";
import assert from "node:assert/strict";
import { filterMembers } from "../src/utils/clubMembers.js";

const members = [
  { _id: "1", name: "Sita Rai", email: "sita@patancollege.edu.np", studentId: "P-101" },
  { _id: "2", name: "Hari Lama", email: "hari@patancollege.edu.np", studentId: "" },
];

test("filterMembers matches name, email or student ID, ignoring case", () => {
  assert.deepEqual(filterMembers(members, "SITA").map((m) => m._id), ["1"]);
  assert.deepEqual(filterMembers(members, "hari@").map((m) => m._id), ["2"]);
  assert.deepEqual(filterMembers(members, "p-101").map((m) => m._id), ["1"]);
});

test("filterMembers returns everyone for a blank search and tolerates missing fields", () => {
  assert.equal(filterMembers(members, "   ").length, 2);
  assert.equal(filterMembers(members).length, 2);
  assert.deepEqual(filterMembers([{ _id: "x" }], "a"), []);
});
