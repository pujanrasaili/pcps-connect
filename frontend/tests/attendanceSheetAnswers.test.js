import { test } from "node:test";
import assert from "node:assert/strict";
import { answerTo, buildSheetHtml, sheetRows } from "../src/utils/attendanceSheet.js";

const questions = [{ text: "Phone?" }, { text: "Size?" }];
const regs = [
  { user: { name: "Zara" }, answers: [{ question: "Size?", answer: "M" }] },
  { user: { name: "Amit" }, answers: [{ question: "Phone?", answer: "<98>" }, { question: "Size?", answer: "L" }] },
];

test("answerTo finds the answer by question text", () => {
  assert.equal(answerTo(regs[1].answers, questions[0]), "<98>");
  assert.equal(answerTo(undefined, questions[0]), "");
});

test("sheet rows carry the answers lined up with the questions", () => {
  assert.deepEqual(sheetRows(regs, questions).map((r) => r.answers), [["<98>", "L"], ["", "M"]]);
  assert.deepEqual(sheetRows(regs).map((r) => r.answers), [[], []]);
});

test("the printed sheet gets a column per question and escapes the answers", () => {
  const html = buildSheetHtml({ title: "T", signupQuestions: questions }, regs);
  assert.match(html, /<th>Phone\?<\/th><th>Size\?<\/th>/);
  assert.match(html, /<td>&lt;98&gt;<\/td>/);
  assert.doesNotMatch(buildSheetHtml({ title: "T" }, regs), /Phone/);
});
