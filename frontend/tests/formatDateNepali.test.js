import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatDateTime, formatMonth } from "../src/utils/formatDate.js";
import { loadNe } from "../src/i18n/dictionary.js";

const sample = "2026-11-10T04:55:00Z";

function withLang(lang, fn) {
  globalThis.localStorage = { getItem: () => lang };
  try {
    return fn();
  } finally {
    delete globalThis.localStorage;
  }
}

test("English dates are unchanged", () => {
  assert.match(withLang("en", () => formatDate(sample)), /^[A-Z][a-z]{2}, Nov \d{1,2}, 2026$/);
  assert.equal(withLang("en", () => formatMonth(sample)), "NOV");
});

test("Nepali dates use Nepali weekday and month names", async () => {
  await loadNe();
  const text = withLang("ne", () => formatDate(sample));
  assert.match(text, /नोभे/);
  assert.doesNotMatch(text, /[A-Za-z]/);
  assert.equal(withLang("ne", () => formatMonth(sample)), "नोभे");
  assert.match(withLang("ne", () => formatDateTime(sample)), /नोभे/);
});
