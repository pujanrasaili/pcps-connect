import test from "node:test";
import assert from "node:assert/strict";
import { attendeeEmails, emailList } from "../src/utils/attendeeEmails.js";

const reg = (email, status = "confirmed") => ({ status, user: email === null ? null : { email } });

test("lists each confirmed address once, ignoring capitals and spaces", () => {
  const list = attendeeEmails([reg("a@x.np"), reg(" A@x.np "), reg("b@x.np")]);
  assert.deepEqual(list, ["a@x.np", "b@x.np"]);
});

test("leaves out people still waiting for approval and rows without an address", () => {
  const list = attendeeEmails([reg("a@x.np", "pending"), reg(null), reg(""), reg("c@x.np")]);
  assert.deepEqual(list, ["c@x.np"]);
});

test("copes with nothing at all", () => {
  assert.deepEqual(attendeeEmails(undefined), []);
  assert.equal(emailList([]), "");
});

test("joins addresses with a comma and a space", () => {
  assert.equal(emailList([reg("a@x.np"), reg("b@x.np")]), "a@x.np, b@x.np");
});
