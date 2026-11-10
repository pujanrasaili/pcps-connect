import test from "node:test";
import assert from "node:assert/strict";
import { urlBase64ToUint8Array } from "../src/utils/pushKey.js";

test("turns URL-safe base64 into the right bytes, with or without padding", () => {
  // "hello?>" encodes to aGVsbG8_Pg in URL-safe form (the _ stands for /).
  const bytes = Array.from(urlBase64ToUint8Array("aGVsbG8_Pg"));
  assert.deepEqual(bytes, [...Buffer.from("hello?>")]);
  assert.deepEqual(Array.from(urlBase64ToUint8Array("aGVsbG8_Pg==")), bytes);
});

test("handles the - and _ characters a standard decoder would reject", () => {
  const input = Buffer.from([251, 255, 254]).toString("base64url"); // "-__-"
  assert.deepEqual(Array.from(urlBase64ToUint8Array(input)), [251, 255, 254]);
});
