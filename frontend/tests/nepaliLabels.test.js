import test from "node:test";
import assert from "node:assert/strict";
import { translate, format } from "../src/i18n/translate.js";


// Words that come from event/club data (price, category) and chart month names are
// shown through the dictionary, so the common ones need a Nepali entry.
const COMMON = ["Free", "General", "Technology", "Sports", "Arts", "Cultural", "Academic", "Workshop", "Seminar", "Competition", "Music", "Social", "Community", "Career", "Science", "Literature", "Entertainment", "Education", "Business", "Health", "Environment", "Volunteering", "Hackathon", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

test("common prices, categories and month names have a Nepali translation", async () => {
  const { ne } = await import("../src/i18n/ne.js");
  for (const word of COMMON) {
    assert.notEqual(translate(ne, "ne", word), word, `${word} has no Nepali entry`);
  }
});

test("text with no entry stays as written, and a missing value stays missing", () => {
  assert.equal(translate({}, "ne", "Robotics"), "Robotics");
  assert.equal(format(undefined), undefined);
  assert.equal(format(null), null);
  assert.equal(format("{n} spots", { n: 3 }), "3 spots");
});

test("recent server messages have a Nepali translation", async () => {
  const { ne } = await import("../src/i18n/ne.js");
  for (const message of ["Idea sent to the club's leaders", "Idea removed", "Post updated", "That student isn't signed up to help at this event", "You didn't sign up to help at this event", "Certificates are only available for events where you helped"]) {
    assert.notEqual(translate(ne, "ne", message), message, `${message} has no Nepali entry`);
  }
});

test("Nepali text uses the same Latin digits as the rest of the site", async () => {
  const { ne } = await import("../src/i18n/ne.js");
  const legal = await import("../src/i18n/legalNe.js");
  const text = JSON.stringify(ne) + JSON.stringify(legal);
  assert.equal(/[०-९]/.test(text), false, "found a Devanagari digit; use 0-9 so numbers match the rest of the site");
});
