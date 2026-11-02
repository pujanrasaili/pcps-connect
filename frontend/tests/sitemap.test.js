import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildSitemapXml, sitemapEvents, STATIC_PATHS } from "../api/_sitemap.js";
import { loadEvents } from "../api/sitemap.js";

const now = new Date("2026-03-20T00:00:00Z");
const id = (n) => String(n).padStart(24, "a");
const ev = (n, date, extra = {}) => ({ _id: id(n), date, ...extra });

test("the sitemap lists the fixed pages plus upcoming and recent events, soonest first", () => {
  const xml = buildSitemapXml(
    [ev(1, "2026-05-01T00:00:00Z"), ev(2, "2026-03-25T00:00:00Z", { updatedAt: "2026-03-01T10:00:00Z" }), ev(3, "2025-12-01T00:00:00Z")],
    now
  );
  for (const p of STATIC_PATHS) assert.ok(xml.includes(`<loc>https://pcps-connect.vercel.app${p}</loc>`), p);
  assert.ok(xml.indexOf(id(2)) < xml.indexOf(id(1)), "soonest first");
  assert.ok(!xml.includes(id(3)), "an event from months ago is left out");
  assert.ok(xml.includes("<lastmod>2026-03-01T10:00:00.000Z</lastmod>"));
});

test("junk events are ignored and the XML stays valid", () => {
  const events = [{ _id: "not-an-id", date: "2026-05-01" }, ev(4, "garbage"), null, ev(5, "2026-05-01T00:00:00Z")];
  assert.deepEqual(sitemapEvents(events, now).map((e) => e._id), [id(5)]);
  assert.equal(sitemapEvents("nope", now).length, 0);
  const xml = buildSitemapXml(events, now);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(!xml.includes("not-an-id"));
});

test("a failed or slow lookup still gives a sitemap with the fixed pages", async () => {
  assert.deepEqual(await loadEvents({ fetchImpl: async () => { throw new Error("down"); } }), []);
  assert.deepEqual(await loadEvents({ fetchImpl: async () => ({ ok: false }) }), []);
  assert.deepEqual(await loadEvents({ fetchImpl: async () => ({ ok: true, json: async () => ({ events: [ev(1, "2026-05-01")] }) }) }).then((e) => e.length), 1);
  assert.ok(buildSitemapXml([], now).includes("<loc>https://pcps-connect.vercel.app/clubs</loc>"));
});

test("/sitemap.xml is served by the function, ahead of the catch-all, and no static file shadows it", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const sitemap = config.rewrites.findIndex((r) => r.source === "/sitemap.xml");
  const catchAll = config.rewrites.findIndex((r) => r.destination === "/index.html");
  assert.ok(sitemap >= 0 && sitemap < catchAll);
  assert.equal(config.rewrites[sitemap].destination, "/api/sitemap");
  assert.equal(existsSync(new URL("../public/sitemap.xml", import.meta.url)), false);
});
