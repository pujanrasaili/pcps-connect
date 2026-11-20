import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

// Inter and Poppins have no Devanagari letters, so Nepali needs its own font in
// the stack or each device picks something different.
test("the stylesheet loads a Devanagari font and puts it in both font stacks", () => {
  assert.match(html, /family=Noto\+Sans\+Devanagari:wght@400;500;600;700/);
  assert.match(css, /font-family: "Inter", "Noto Sans Devanagari", sans-serif;/);
  assert.match(css, /font-family: "Poppins", "Noto Sans Devanagari", sans-serif;/);
});

test("Tailwind's font families include it too, after the Latin font", () => {
  assert.match(css, /--font-display: Poppins, Noto Sans Devanagari, sans-serif;/);
  assert.match(css, /--font-body: Inter, Noto Sans Devanagari, sans-serif;/);
});

test("the page's security policy allows Google's font hosts", () => {
  const vercel = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
  assert.match(vercel, /style-src [^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(vercel, /font-src [^;]*https:\/\/fonts\.gstatic\.com/);
});

test("fonts are linked from the page (with early connections), not @import-ed from the stylesheet", () => {
  assert.doesNotMatch(css, /@import url/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/);
  assert.match(html, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*display=swap"/);
});
