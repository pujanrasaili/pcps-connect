import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const tailwind = readFileSync(new URL("../tailwind.config.js", import.meta.url), "utf8");

// Inter and Poppins have no Devanagari letters, so Nepali needs its own font in
// the stack or each device picks something different.
test("the stylesheet loads a Devanagari font and puts it in both font stacks", () => {
  assert.match(css, /family=Noto\+Sans\+Devanagari:wght@400;500;600;700/);
  assert.match(css, /font-family: "Inter", "Noto Sans Devanagari", sans-serif;/);
  assert.match(css, /font-family: "Poppins", "Noto Sans Devanagari", sans-serif;/);
});

test("Tailwind's font families include it too, after the Latin font", () => {
  assert.match(tailwind, /display: \["Poppins", "Noto Sans Devanagari", "sans-serif"\]/);
  assert.match(tailwind, /body: \["Inter", "Noto Sans Devanagari", "sans-serif"\]/);
});

test("the page's security policy allows Google's font hosts", () => {
  const vercel = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
  assert.match(vercel, /style-src [^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(vercel, /font-src [^;]*https:\/\/fonts\.gstatic\.com/);
});
