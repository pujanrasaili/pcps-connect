import { test } from "node:test";
import assert from "node:assert/strict";
import { findVenue } from "../src/utils/venues.js";

const venues = [{ name: "Seminar Hall", directions: "Block B" }, { name: "Lab 2" }];

test("an event location matches a venue ignoring capitals and extra spaces", () => {
  assert.equal(findVenue(venues, "seminar   hall ").directions, "Block B");
  assert.equal(findVenue(venues, "LAB 2").name, "Lab 2");
});

test("no match for other places, blanks or a missing list", () => {
  assert.equal(findVenue(venues, "Seminar Hall, Block B"), undefined);
  assert.equal(findVenue(venues, ""), undefined);
  assert.equal(findVenue(venues, undefined), undefined);
  assert.equal(findVenue(undefined, "Lab 2"), undefined);
});
