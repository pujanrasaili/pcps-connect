import { test } from "node:test";
import assert from "node:assert/strict";
import { getNe, loadNe, shouldPrefetchNe } from "../src/i18n/dictionary.js";

test("the Nepali dictionary loads on demand and is then available synchronously", async () => {
  const loaded = await loadNe();
  assert.equal(getNe(), loaded);
  assert.equal(loaded["Register"] !== undefined, true);
  assert.equal(await loadNe(), loaded);
});

test("prefetches the Nepali dictionary only on a fast, non-data-saving connection", () => {
  assert.equal(shouldPrefetchNe(undefined), true);
  assert.equal(shouldPrefetchNe({ effectiveType: "4g" }), true);
  assert.equal(shouldPrefetchNe({}), true);
  assert.equal(shouldPrefetchNe({ effectiveType: "3g" }), false);
  assert.equal(shouldPrefetchNe({ effectiveType: "2g" }), false);
  assert.equal(shouldPrefetchNe({ effectiveType: "4g", saveData: true }), false);
});
