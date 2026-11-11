import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// Runs public/sw.js against a tiny pretend browser, to check the cache stays
// small and the page still loads when tidying fails.
const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "sw.js"), "utf8");

function load({ failKeys = false } = {}) {
  const store = new Map(); // url -> response, in the order they were added
  const cache = {
    put: async (req, res) => { store.delete(req.url); store.set(req.url, res); },
    keys: async () => { if (failKeys) throw new Error("boom"); return [...store.keys()].map((url) => ({ url })); },
    delete: async (req) => store.delete(req.url),
  };
  const handlers = {};
  const sandbox = {
    URL,
    Response: class { constructor(body, init = {}) { this.body = body; this.status = init.status || 200; this.ok = this.status < 400; this.headers = { get: () => "" }; } clone() { return this; } },
    caches: { open: async () => cache, match: async (req) => store.get(req.url), keys: async () => [], delete: async () => true },
    fetch: async () => new sandbox.Response("file"),
    self: { location: { origin: "https://pcps.example" }, addEventListener: (type, fn) => { handlers[type] = fn; }, skipWaiting() {}, registration: {}, clients: {} },
  };
  vm.runInNewContext(source, sandbox);
  const get = async (pathname) => {
    let answer;
    handlers.fetch({ request: { method: "GET", url: `https://pcps.example${pathname}`, mode: "no-cors" }, respondWith: (p) => { answer = p; } });
    return answer;
  };
  return { store, get };
}

test("the asset cache keeps only the newest 200 files", async () => {
  const { store, get } = load();
  for (let i = 0; i < 230; i++) await get(`/assets/chunk-${i}.js`);
  const urls = [...store.keys()];
  assert.equal(urls.length, 200);
  assert.ok(urls.includes("https://pcps.example/assets/chunk-229.js"), "newest file kept");
  assert.ok(!urls.includes("https://pcps.example/assets/chunk-0.js"), "oldest file dropped");
});

test("a failure while tidying never breaks loading a file", async () => {
  const { get } = load({ failKeys: true });
  const res = await get("/assets/app.js");
  assert.equal(res.status, 200);
});

test("the API and other sites are never touched", async () => {
  const { get, store } = load();
  assert.equal(await get("/api/events"), undefined);
  assert.equal(store.size, 0);
});
