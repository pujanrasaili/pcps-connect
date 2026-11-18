import { test } from "node:test";
import assert from "node:assert/strict";
import { answersComplete, ANSWER_MAX } from "../src/utils/signupAnswers.js";

const qs = [{ text: "Size?", required: true }, { text: "Notes?", required: false }];

test("needs every required answer, and ignores optional ones", () => {
  assert.equal(answersComplete(qs, ["M"]), true);
  assert.equal(answersComplete(qs, ["M", ""]), true);
  assert.equal(answersComplete(qs, ["", "x"]), false);
  assert.equal(answersComplete(qs, ["   "]), false);
  assert.equal(answersComplete(qs, undefined), false);
});

test("an event with no questions is always complete", () => {
  assert.equal(answersComplete(undefined, undefined), true);
  assert.equal(answersComplete([], ["x"]), true);
});

test("answers are limited to 200 characters, like the server", () => {
  assert.equal(ANSWER_MAX, 200);
});
