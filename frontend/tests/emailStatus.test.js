import test from "node:test";
import assert from "node:assert/strict";
import { emailNotice } from "../src/utils/emailStatus.js";

test("Brevo and unknown replies show no warning", () => {
  assert.equal(emailNotice("brevo"), null);
  assert.equal(emailNotice(undefined), null);
  assert.equal(emailNotice("something-new"), null);
});

test("Gmail and missing setup each get a plain warning", () => {
  assert.match(emailNotice("gmail-smtp").title, /Gmail/);
  assert.match(emailNotice("gmail-smtp").text, /Brevo/);
  assert.match(emailNotice("not-configured").title, /isn't set up/);
});
