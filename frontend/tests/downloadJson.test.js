import { test } from "node:test";
import assert from "node:assert/strict";
import { downloadJson } from "../src/utils/downloadJson.js";

// A tiny stand-in for the page: records the link that gets clicked.
function fakeDocument() {
  const log = { appended: [], removed: [], clicked: null };
  globalThis.document = {
    body: {
      appendChild: (el) => log.appended.push(el),
      removeChild: (el) => log.removed.push(el),
    },
    createElement: () => {
      const el = { click() { log.clicked = { href: el.href, download: el.download }; } };
      return el;
    },
  };
  return log;
}

test("saves the data as a pretty-printed .json file with the given name", async () => {
  const log = fakeDocument();
  const made = [];
  const revoked = [];
  const realCreate = URL.createObjectURL;
  const realRevoke = URL.revokeObjectURL;
  URL.createObjectURL = (blob) => { made.push(blob); return "blob:test-url"; };
  URL.revokeObjectURL = (url) => revoked.push(url);
  try {
    downloadJson("my-data.json", { name: "Asha", clubs: [1, 2] });
  } finally {
    URL.createObjectURL = realCreate;
    URL.revokeObjectURL = realRevoke;
  }
  assert.deepEqual(log.clicked, { href: "blob:test-url", download: "my-data.json" });
  assert.equal(made.length, 1);
  assert.equal(made[0].type, "application/json");
  assert.equal(await made[0].text(), JSON.stringify({ name: "Asha", clubs: [1, 2] }, null, 2));
});

test("adds the link to the page for the click, then removes it and frees the file", () => {
  const log = fakeDocument();
  const revoked = [];
  const realCreate = URL.createObjectURL;
  const realRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => "blob:another";
  URL.revokeObjectURL = (url) => revoked.push(url);
  try {
    downloadJson("x.json", []);
  } finally {
    URL.createObjectURL = realCreate;
    URL.revokeObjectURL = realRevoke;
  }
  assert.equal(log.appended.length, 1);
  assert.equal(log.removed[0], log.appended[0]);
  assert.deepEqual(revoked, ["blob:another"]);
});
