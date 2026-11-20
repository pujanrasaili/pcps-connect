import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { actionLabel } from "../src/utils/auditLabels.js";
import { ne } from "../src/i18n/ne.js";

// Every action the backend writes to the activity log has a proper label,
// and that label has a Nepali translation (otherwise the admin page falls
// back to a guessed, untranslated sentence).
const dir = fileURLToPath(new URL("../../backend/controllers/", import.meta.url));
const actions = new Set();
for (const file of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
  for (const m of readFileSync(join(dir, file), "utf8").matchAll(/recordAudit\([^,]+,\s*"([A-Za-z]+\.[A-Za-z_]+)"/g)) actions.add(m[1]);
}

test("the scan finds the backend's audit actions", () => {
  assert.ok(actions.size >= 25, `only found ${actions.size}`);
});

test("every audit action has a label and a Nepali translation", () => {
  const missing = [];
  for (const action of actions) {
    // A guessed label ("Event remind answers") has no Nepali entry, so it shows up here.
    if (!ne[actionLabel(action)]) missing.push(action);
  }
  assert.deepEqual(missing, []);
});
