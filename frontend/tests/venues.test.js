import { test } from "node:test";
import assert from "node:assert/strict";
import { findVenue, withVenueDirections } from "../src/utils/venues.js";

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

test("calendar invites get the venue's directions after the description", () => {
  const event = { title: "Open Day", description: "Come along." };
  const out = withVenueDirections(event, { name: "Lab 2", directions: "Block A" });
  assert.equal(out.description, "Come along.\n\nHow to find it: Block A");
  assert.equal(event.description, "Come along.", "the event itself is not changed");
  assert.equal(withVenueDirections({ title: "x" }, { directions: "Block A" }).description, "How to find it: Block A");
});

test("without a venue or directions the event is passed through untouched", () => {
  const event = { description: "Hi" };
  assert.equal(withVenueDirections(event, undefined), event);
  assert.equal(withVenueDirections(event, { name: "Lab 2" }), event);
  assert.equal(withVenueDirections(undefined, { directions: "x" }), undefined);
});
