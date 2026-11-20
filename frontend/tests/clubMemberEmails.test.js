import test from "node:test";
import assert from "node:assert/strict";
import { memberEmailList, memberEmailCount } from "../src/utils/clubMembers.js";

const members = [{ email: "a@x.np" }, { email: "A@x.np " }, { email: "" }, { email: "b@x.np" }, {}];

test("each member address appears once, blanks left out", () => {
  assert.equal(memberEmailList(members), "a@x.np, b@x.np");
  assert.equal(memberEmailCount(members), 2);
});

test("an empty club gives an empty line", () => {
  assert.equal(memberEmailList([]), "");
  assert.equal(memberEmailCount(undefined), 0);
});
