import { test } from "node:test";
import assert from "node:assert/strict";
import { getNe, loadNe } from "../src/i18n/dictionary.js";

test("the Nepali dictionary loads on demand and is then available synchronously", async () => {
  const loaded = await loadNe();
  assert.equal(getNe(), loaded);
  assert.equal(loaded["Register"] !== undefined, true);
  assert.equal(await loadNe(), loaded);
});
