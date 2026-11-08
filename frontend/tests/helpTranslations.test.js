import { test } from "node:test";
import assert from "node:assert/strict";
import { HELP_TOPICS } from "../src/utils/helpTopics.js";
import { ne } from "../src/i18n/ne.js";
import { format } from "../src/i18n/translate.js";

test("every Help question and answer has a Nepali translation", () => {
  const missing = [];
  for (const topic of HELP_TOPICS) {
    for (const text of [topic.question, ...topic.answer]) if (!(text in ne)) missing.push(text.slice(0, 60));
  }
  assert.deepEqual(missing, []);
});

test("Help translations have no stray placeholders", () => {
  for (const topic of HELP_TOPICS) {
    for (const text of [topic.question, ...topic.answer]) {
      assert.equal(format(ne[text]), ne[text]);
    }
  }
});

test("the Nepali interface uses one word for an event", () => {
  const text = Object.values(ne).join(" ");
  assert.doesNotMatch(text, /इभेन्ट/);
});

test("the Nepali interface spells login and picture one way", () => {
  const text = Object.values(ne).join(" ");
  assert.doesNotMatch(text, /लग इन/);
  assert.doesNotMatch(text, /तस्बिर/);
});

test("the Nepali interface uses one word for an admin", () => {
  // The navbar and buttons say एडमिन, so messages and help must not switch to प्रशासक.
  const text = Object.values(ne).join(" ");
  assert.doesNotMatch(text, /प्रशासक/);
});
