import test from "node:test";
import assert from "node:assert/strict";
import { errorText } from "../src/utils/errorText.js";

test("a timed-out request reads as 'took too long', not a raw axios message", () => {
  assert.equal(errorText({ code: "ECONNABORTED", message: "timeout of 60000ms exceeded" }), "The server took too long to answer. Please try again.");
});
