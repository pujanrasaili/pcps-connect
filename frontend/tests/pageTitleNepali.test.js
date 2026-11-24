import { test } from "node:test";
import assert from "node:assert/strict";
import { TITLES, DEFAULT_TITLE, titleForPath, eventTitle, DESCRIPTIONS, DEFAULT_DESCRIPTION } from "../src/utils/pageTitle.js";
import { ne } from "../src/i18n/ne.js";
import { translate } from "../src/i18n/translate.js";

const toNepali = (text) => translate(ne, "ne", text);

test("every page name used for the browser tab has a Nepali translation", () => {
  const names = [...Object.values(TITLES).filter(Boolean), DEFAULT_TITLE, "Page not found", "Event", "Club poster", "Event poster", "Certificate", "Volunteer certificate", "Verify a certificate"];
  assert.deepEqual(names.filter((name) => !(name in ne)), []);
});

test("tab titles keep the site name and switch the page name to Nepali", () => {
  assert.equal(titleForPath("/clubs"), "Clubs | PCPS Connect");
  assert.equal(titleForPath("/clubs", toNepali), `${ne.Clubs} | PCPS Connect`);
  assert.match(titleForPath("/nowhere", toNepali), /\| PCPS Connect$/);
  assert.equal(titleForPath("/", toNepali), ne[DEFAULT_TITLE]);
  assert.equal(titleForPath("/events/abc", toNepali), undefined);
  assert.equal(titleForPath("/poster"), "Poster | PCPS Connect");
  assert.equal(titleForPath("/clubs/abc123/poster"), "Club poster | PCPS Connect");
  assert.equal(titleForPath("/clubs/abc123/poster", toNepali), `${ne["Club poster"]} | PCPS Connect`);
});

test("an event's own name is never translated", () => {
  assert.equal(eventTitle("Hack Night", toNepali), "Hack Night | PCPS Connect");
  assert.equal(eventTitle("", toNepali), `${ne.Event} | PCPS Connect`);
});

test("every search-result description has a Nepali translation", () => {
  const texts = [...Object.values(DESCRIPTIONS), DEFAULT_DESCRIPTION];
  assert.deepEqual(texts.filter((text) => !(text in ne)), []);
});
