import { test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin, shouldResize, shrinkImage, MAX_SIDE } from "../src/utils/resizeImage.js";

test("fitWithin caps the longest side and keeps the shape", () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 2000, height: 1500 });
  assert.deepEqual(fitWithin(3000, 4000), { width: 1500, height: 2000 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 }); // never enlarged
  assert.deepEqual(fitWithin(0, 100), { width: 0, height: 0 });
  assert.equal(fitWithin(10000, 10).height, 2); // thin pictures keep at least 1px
  assert.equal(MAX_SIDE, 2000);
});

test("only big jpeg, png and webp files are shrunk (not gifs, not small files)", () => {
  const MB = 1024 * 1024;
  assert.equal(shouldResize({ type: "image/jpeg", size: 6 * MB }), true);
  assert.equal(shouldResize({ type: "image/png", size: 3 * MB }), true);
  assert.equal(shouldResize({ type: "image/webp", size: 2 * MB }), true);
  assert.equal(shouldResize({ type: "image/gif", size: 9 * MB }), false);
  assert.equal(shouldResize({ type: "image/jpeg", size: 1 * MB }), false);
  assert.equal(shouldResize(null), false);
});

test("when the browser cannot shrink (no createImageBitmap), the original file goes through", async () => {
  const file = { type: "image/jpeg", size: 9 * 1024 * 1024, name: "a.jpg" };
  assert.equal(await shrinkImage(file), file);
});
