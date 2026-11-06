import { test } from "node:test";
import assert from "node:assert/strict";
import { TITLES, DEFAULT_TITLE, titleForPath, eventTitle } from "../src/utils/pageTitle.js";
import { ne } from "../src/i18n/ne.js";
import { translate } from "../src/i18n/translate.js";

const toNepali = (text) => translate(ne, "ne", text);

test("every page name used for the browser tab has a Nepali translation", () => {
  const names = [...Object.values(TITLES).filter(Boolean), DEFAULT_TITLE, "Page not found", "Event"];
  assert.deepEqual(names.filter((name) => !(name in ne)), []);
});

test("tab titles keep the site name and switch the page name to Nepali", () => {
  assert.equal(titleForPath("/clubs"), "Clubs | PCPS Connect");
  assert.equal(titleForPath("/clubs", toNepali), `${ne.Clubs} | PCPS Connect`);
  assert.match(titleForPath("/nowhere", toNepali), /\| PCPS Connect$/);
  assert.equal(titleForPath("/", toNepali), ne[DEFAULT_TITLE]);
  assert.equal(titleForPath("/events/abc", toNepali), undefined);
});

test("an event's own name is never translated", () => {
  assert.equal(eventTitle("Hack Night", toNepali), "Hack Night | PCPS Connect");
  assert.equal(eventTitle("", toNepali), `${ne.Event} | PCPS Connect`);
});
