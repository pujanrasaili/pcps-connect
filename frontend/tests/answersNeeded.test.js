import { test } from "node:test";
import assert from "node:assert/strict";
import { answersNeeded } from "../src/utils/answersNeeded.js";

const soon = new Date(Date.now() + 864e5).toISOString();
const past = new Date(Date.now() - 864e5).toISOString();
const q = [{ text: "Phone?", required: true }];
const ev = (id, extra = {}) => ({ _id: id, title: id, date: soon, signupQuestions: q, ...extra });
const reg = (id, answers = []) => ({ event: { _id: id }, answers });

test("lists upcoming events with an unanswered required question", () => {
  const out = answersNeeded([reg("a"), reg("b", [{ question: "Phone?", answer: "98" }])], [ev("a"), ev("b")]);
  assert.deepEqual(out.map((e) => e._id), ["a"]);
});

test("ignores past events, events without questions and optional questions", () => {
  const events = [ev("p", { date: past }), ev("n", { signupQuestions: [] }), ev("o", { signupQuestions: [{ text: "Notes?", required: false }] })];
  assert.deepEqual(answersNeeded([reg("p"), reg("n"), reg("o")], events), []);
});

test("copes with missing data", () => {
  assert.deepEqual(answersNeeded(undefined, undefined), []);
  assert.deepEqual(answersNeeded([{ event: null }, reg("zzz")], [ev("a")]), []);
});
