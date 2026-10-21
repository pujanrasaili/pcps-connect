// Link previews for chat apps (see api/preview.js and vercel.json).
import test from "node:test";
import assert from "node:assert/strict";
import { absoluteImage, buildPreviewHtml, clubMeta, escapeAttr, eventMeta, isValidId, summarize, DEFAULT_META } from "../api/_preview.js";
import { loadMeta } from "../api/preview.js";

const ID = "64b7f0c2a1b2c3d4e5f60789";
const API = "https://api.test/api";

test("isValidId accepts only 24-character hex ids", () => {
  assert.equal(isValidId(ID), true);
  assert.equal(isValidId("nope"), false);
  assert.equal(isValidId(ID + "0"), false);
  assert.equal(isValidId(undefined), false);
  assert.equal(isValidId(["a"]), false);
});

test("escapeAttr neutralises quotes and angle brackets", () => {
  assert.equal(escapeAttr('"><script>x</script>'), "&quot;&gt;&lt;script&gt;x&lt;/script&gt;");
  assert.equal(escapeAttr("Tom & Jerry"), "Tom &amp; Jerry");
});

test("summarize collapses whitespace and cuts at a word boundary", () => {
  assert.equal(summarize("a  b\n c"), "a b c");
  const long = "word ".repeat(100);
  const out = summarize(long, 50);
  assert.ok(out.length <= 50);
  assert.ok(out.endsWith("…"));
  assert.ok(!out.slice(0, -1).endsWith("wor"));
});

test("absoluteImage handles cloudinary, server paths and nothing", () => {
  assert.equal(absoluteImage("https://res.cloudinary.com/x/a.jpg", API), "https://res.cloudinary.com/x/a.jpg");
  assert.equal(absoluteImage("/uploads/a.jpg", API), "https://api.test/uploads/a.jpg");
  assert.equal(absoluteImage("uploads/a.jpg", API), "https://api.test/uploads/a.jpg");
  assert.equal(absoluteImage(null, API), DEFAULT_META.image);
});

test("eventMeta and clubMeta describe the page", () => {
  const e = eventMeta({ _id: ID, title: "Hack Night", date: "2027-01-15T09:30:00Z", location: "Lab 2", description: "Bring a laptop", image: "https://x/y.jpg" }, API);
  assert.equal(e.title, "Hack Night | PCPS Connect");
  assert.match(e.description, /Jan 15, 2027/);
  assert.match(e.description, /Lab 2/);
  assert.match(e.description, /Bring a laptop/);
  assert.equal(e.url, `https://pcps-connect.vercel.app/events/${ID}`);

  const c = clubMeta({ _id: ID, name: "Coding Club", description: "short", longDescription: "", image: null }, API);
  assert.equal(c.title, "Coding Club | PCPS Connect");
  assert.equal(c.description, "short");
  assert.equal(c.url, `https://pcps-connect.vercel.app/clubs?club=${ID}`);
  assert.equal(c.image, DEFAULT_META.image);
});

test("buildPreviewHtml escapes everything it prints", () => {
  const html = buildPreviewHtml({ title: 'A "B" <i>', description: "x & y", image: "https://i/a.jpg?a=1&b=2", url: "https://s/e?x=1&y=2" });
  assert.match(html, /<meta property="og:title" content="A &quot;B&quot; &lt;i&gt;" \/>/);
  assert.match(html, /content="x &amp; y"/);
  assert.match(html, /og:image" content="https:\/\/i\/a\.jpg\?a=1&amp;b=2"/);
  assert.ok(!html.includes("<i>"));
});

const okFetch = (body) => async () => ({ ok: true, json: async () => body });

test("loadMeta returns event and club tags from the API", async () => {
  const ev = await loadMeta("event", ID, { fetchImpl: okFetch({ event: { _id: ID, title: "Hack", date: "2027-01-15T09:30:00Z", location: "Lab" } }), apiBase: API });
  assert.equal(ev.title, "Hack | PCPS Connect");
  const club = await loadMeta("club", ID, { fetchImpl: okFetch({ club: { _id: ID, name: "Coding", description: "d" } }), apiBase: API });
  assert.equal(club.title, "Coding | PCPS Connect");
});

test("loadMeta asks the right endpoint", async () => {
  const urls = [];
  const spy = async (url) => { urls.push(url); return { ok: true, json: async () => ({}) }; };
  await loadMeta("event", ID, { fetchImpl: spy, apiBase: API });
  await loadMeta("club", ID, { fetchImpl: spy, apiBase: API });
  assert.deepEqual(urls, [`${API}/events/${ID}`, `${API}/clubs/${ID}`]);
});

test("loadMeta falls back to the general tags on bad input, API errors, timeouts and empty answers", async () => {
  let called = 0;
  const never = async () => { called += 1; throw new Error("should not be called"); };
  assert.equal((await loadMeta("event", "not-an-id", { fetchImpl: never, apiBase: API })).title, DEFAULT_META.title);
  assert.equal((await loadMeta("other", ID, { fetchImpl: never, apiBase: API })).title, DEFAULT_META.title);
  assert.equal(called, 0); // invalid input never reaches the API

  const notFound = async () => ({ ok: false });
  assert.equal((await loadMeta("event", ID, { fetchImpl: notFound, apiBase: API })).title, DEFAULT_META.title);
  const boom = async () => { throw new Error("timeout"); };
  assert.equal((await loadMeta("club", ID, { fetchImpl: boom, apiBase: API })).title, DEFAULT_META.title);
  assert.equal((await loadMeta("event", ID, { fetchImpl: okFetch({}), apiBase: API })).title, DEFAULT_META.title);
});
