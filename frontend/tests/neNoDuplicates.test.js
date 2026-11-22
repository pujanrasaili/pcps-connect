import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// In a JavaScript object the last copy of a repeated key silently wins, so an
// earlier translation that looks live would never be shown. Keep each English
// text in the Nepali dictionary only once.
test("the Nepali dictionary has no repeated English text", () => {
  const lines = readFileSync(new URL("../src/i18n/ne.js", import.meta.url), "utf8").split("\n");
  const seen = new Map();
  lines.forEach((line, i) => {
    const m = line.match(/^\s{2}"((?:[^"\\]|\\.)*)":\s/) || line.match(/^\s{2}([A-Za-z_$][\w$]*):\s/);
    if (!m) return;
    seen.set(m[1], [...(seen.get(m[1]) || []), i + 1]);
  });
  const repeated = [...seen].filter(([, at]) => at.length > 1).map(([key, at]) => `${key} (lines ${at.join(", ")})`);
  assert.deepEqual(repeated, []);
});
