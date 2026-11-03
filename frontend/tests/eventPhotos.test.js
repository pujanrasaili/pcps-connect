import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/components/EventPhotos.jsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/pages/EventDetails.jsx", import.meta.url), "utf8");

test("viewers who cannot manage an empty gallery see nothing", () => {
  assert.match(src, /photos\.length === 0 && !canManage\) return null/);
});

test("adding and removing photos is only offered to people who can manage the event", () => {
  assert.match(src, /\{canManage && \(\s*<div>\s*<input/);
  assert.match(src, /\{canManage && \(\s*<button[\s\S]*?Remove photo/);
});

test("the gallery stops at 8 photos, matching the server", () => {
  assert.match(src, /MAX_EVENT_PHOTOS = 8/);
  assert.match(src, /photos\.length >= MAX_EVENT_PHOTOS/);
});

test("the event page passes the gallery the same organiser check used for answering questions", () => {
  assert.match(page, /<EventPhotos[^>]*canManage=\{canAnswerQuestions\}/);
});

test("photos open in a new tab safely and removal names the photo by its address", () => {
  assert.match(src, /target="_blank" rel="noopener noreferrer"/);
  assert.match(src, /params: \{ url: removeTarget \}/);
});

test("adding or removing a photo refreshes the cached events so a return visit is not stale", () => {
  assert.equal((src.match(/onChange\?\.\(\)/g) || []).length, 2);
  assert.match(page, /onChange=\{refreshEvents\}/);
  assert.match(page, /events: allEvents, refreshEvents \} = useEvents\(\)/);
});

test("photos are shrunk in the browser before upload", () => {
  assert.match(src, /body\.append\("image", await shrinkImage\(file\)\)/);
});
