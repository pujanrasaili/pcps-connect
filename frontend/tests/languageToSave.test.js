import { test } from "node:test";
import assert from "node:assert/strict";
import { languageToSave } from "../src/utils/languageToSave.js";

const user = (language) => ({ id: "u1", language });

test("saves the shown language when it differs from the account's", () => {
  assert.equal(languageToSave(user("en"), "ne", null), "ne");
  assert.equal(languageToSave(user("ne"), "en", null), "en");
});

test("does nothing when they already match", () => {
  assert.equal(languageToSave(user("ne"), "ne", null), null);
});

test("does nothing when logged out or when the server doesn't report a language", () => {
  assert.equal(languageToSave(null, "ne", null), null);
  assert.equal(languageToSave({ id: "u1" }, "ne", null), null);
});

test("does not retry the same save, but will try a different one", () => {
  assert.equal(languageToSave(user("en"), "ne", "u1:ne"), null);
  assert.equal(languageToSave(user("ne"), "en", "u1:ne"), "en");
  assert.equal(languageToSave({ id: "u2", language: "en" }, "ne", "u1:ne"), "ne");
});

test("ignores a language the server doesn't support", () => {
  assert.equal(languageToSave(user("en"), "fr", null), null);
});
