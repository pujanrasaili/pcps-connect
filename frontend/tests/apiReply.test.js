import test from "node:test";
import assert from "node:assert/strict";
import { isUnexpectedReply } from "../src/utils/apiReply.js";
import { errorText } from "../src/utils/errorText.js";

test("HTML pages and empty bodies are unexpected; JSON objects are not", () => {
  assert.equal(isUnexpectedReply({ status: 200, data: "<html>Service waking up</html>", headers: {} }), true);
  assert.equal(isUnexpectedReply({ status: 200, data: "ok", headers: { "content-type": "text/html; charset=utf-8" } }), true);
  assert.equal(isUnexpectedReply({ status: 200, data: null, headers: {} }), true);
  assert.equal(isUnexpectedReply({ status: 200, data: { events: [] }, headers: { "content-type": "application/json" } }), false);
  assert.equal(isUnexpectedReply({ status: 200, data: [], headers: {} }), false);
});

test("a 204 with no body is fine", () => {
  assert.equal(isUnexpectedReply({ status: 204, data: "", headers: {} }), false);
});

test("the unexpected-reply error reads as a plain sentence", () => {
  assert.match(errorText({ code: "ERR_BAD_RESPONSE_FORMAT" }), /unexpected reply/);
});
