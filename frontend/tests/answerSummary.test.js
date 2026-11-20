import { test } from "node:test";
import assert from "node:assert/strict";
import { summariseAnswers } from "../src/utils/answerSummary.js";

const q = [{ text: "Size?" }];
const reg = (answer) => ({ answers: answer === undefined ? [] : [{ question: "Size?", answer }] });

test("counts answers ignoring case and spacing, most common first", () => {
  const [s] = summariseAnswers(q, [reg("M"), reg(" m "), reg("L"), reg("XL"), reg("l"), reg("m")]);
  assert.deepEqual(s.top, [{ answer: "M", count: 3 }, { answer: "L", count: 2 }, { answer: "XL", count: 1 }]);
  assert.equal(s.answered, 6);
  assert.equal(s.unanswered, 0);
});

test("ties are listed alphabetically and blanks count as unanswered", () => {
  const [s] = summariseAnswers(q, [reg("S"), reg("M"), reg(""), reg(undefined)]);
  assert.deepEqual(s.top.map((t) => t.answer), ["M", "S"]);
  assert.equal(s.unanswered, 2);
});

test("only the top five are kept and the rest are counted", () => {
  const regs = ["a", "b", "c", "d", "e", "f", "g"].map(reg);
  const [s] = summariseAnswers(q, regs);
  assert.equal(s.top.length, 5);
  assert.equal(s.moreDistinct, 2);
});

test("no questions or no people gives an empty or zeroed summary", () => {
  assert.deepEqual(summariseAnswers([], [reg("M")]), []);
  const [s] = summariseAnswers(q, []);
  assert.deepEqual([s.answered, s.unanswered, s.top.length], [0, 0, 0]);
});
