import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { NOTIFICATION_PATTERNS } from "../src/utils/translateNotification.js";
import { ne } from "../src/i18n/ne.js";

// Every bell message the backend writes in code (title: `...`) can be shown in
// Nepali: it matches a known pattern or is a fixed sentence with a translation.
// Free-form text people write themselves can't be translated and is skipped.
const FREE_FORM = new Set([
  "5: 5", // a club's own message: "<club>: <what the leader wrote>"
  "Test alert from PCPS Connect. Alerts are working!", // a phone alert, not a bell message
]);

const base = fileURLToPath(new URL("../../backend/", import.meta.url));
const titles = [];
for (const dir of ["controllers", "utils"]) {
  for (const file of readdirSync(join(base, dir)).filter((f) => f.endsWith(".js"))) {
    const src = readFileSync(join(base, dir, file), "utf8");
    for (const m of src.matchAll(/title:\s*(`[^`]*`|"[^"]*")/g)) {
      // Names and numbers are filled in at run time; "5" stands in for both.
      const text = m[1].slice(1, -1).replace(/\$\{[^}]*\}/g, "5");
      if (text.trim()) titles.push([file, text]);
    }
  }
}

test("the scan finds the backend's bell messages", () => {
  assert.ok(titles.length >= 15, `only found ${titles.length}`);
});

test("every bell message can be shown in Nepali", () => {
  const untranslated = titles
    .filter(([, text]) => !FREE_FORM.has(text))
    .filter(([, text]) => !NOTIFICATION_PATTERNS.some(([re]) => re.test(text)) && !ne[text])
    .map(([file, text]) => `${file}: ${text}`);
  assert.deepEqual(untranslated, []);
});
