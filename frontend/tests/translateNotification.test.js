import { test } from "node:test";
import assert from "node:assert/strict";
import { NOTIFICATION_PATTERNS, translateNotification } from "../src/utils/translateNotification.js";
import { ne } from "../src/i18n/ne.js";
import { format, translate } from "../src/i18n/translate.js";

const t = (text, values) => format(translate(ne, "ne", text), values);

test("every notification shape has a Nepali sentence with matching placeholders", () => {
  for (const [, key, names] of NOTIFICATION_PATTERNS) {
    assert.ok(key in ne, `missing: ${key}`);
    for (const name of names) {
      assert.ok(key.includes(`{${name}}`) && ne[key].includes(`{${name}}`), `placeholder {${name}} in ${key}`);
    }
  }
});

// The exact sentences the backend writes (see backend/utils and controllers).
const SAMPLES = [
  "Asha asked to join Hack Night",
  "Hack Night was updated (new time or place)",
  "Hack Night was cancelled",
  "New message about Hack Night",
  "New message from Asha",
  "Your question about Hack Night was answered",
  "You're in: your request to join Hack Night was approved",
  "Your request to join Hack Night was declined",
  "Asha verified their email and is waiting for approval",
  "You're in! Coding Club approved your request to join",
  "Coding Club declined your request to join",
  "A seat opened for Hack Night - your request is waiting for approval",
  "You got a seat: Hack Night",
  "Coding Club announced Hack Night",
  "Coding Club shared a news update",
  "New idea for Coding Club",
];

test("known notifications are translated and keep their names", () => {
  for (const sample of SAMPLES) {
    const out = translateNotification(sample, t);
    assert.match(out, /[ऀ-ॿ]/, sample);
    assert.doesNotMatch(out, /[{}]/, sample);
    assert.ok(/Hack Night|Coding Club|Asha/.test(out), sample);
  }
});

test("a club's own message and unknown text are left alone", () => {
  assert.equal(translateNotification("Coding Club: meeting moved to 3pm", t), "Coding Club: meeting moved to 3pm");
  assert.equal(translateNotification(undefined, t), undefined);
});
