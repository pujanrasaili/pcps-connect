import { test } from "node:test";
import assert from "node:assert/strict";
import { translateServerText } from "../src/i18n/serverText.js";
import { loadNe } from "../src/i18n/dictionary.js";

function withLang(lang, fn) {
  globalThis.localStorage = { getItem: () => lang };
  try {
    return fn();
  } finally {
    delete globalThis.localStorage;
  }
}

test("server messages are translated for Nepali and untouched for English", async () => {
  await loadNe();
  assert.equal(withLang("en", () => translateServerText("This event is full")), "This event is full");
  const ne = withLang("ne", () => translateServerText("This event is full"));
  assert.match(ne, /[ऀ-ॿ]/);
});

test("unknown messages and non-strings pass through", async () => {
  await loadNe();
  assert.equal(withLang("ne", () => translateServerText("Some brand new server message")), "Some brand new server message");
  assert.equal(withLang("ne", () => translateServerText(undefined)), undefined);
});

test("with no local storage at all it stays English", () => {
  assert.equal(translateServerText("This event is full"), "This event is full");
});
