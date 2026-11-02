import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { shareEvent, shareClub, clubLink } from "../src/utils/share.js";
import { browserAllowsAutoplay } from "../src/utils/videoPolicy.js";

const realNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const hadWindow = "window" in globalThis;
const setNavigator = (value) => Object.defineProperty(globalThis, "navigator", { value, configurable: true, writable: true });
afterEach(() => {
  if (realNavigator) Object.defineProperty(globalThis, "navigator", realNavigator);
  else delete globalThis.navigator;
  if (!hadWindow) delete globalThis.window;
});

const event = { title: "Hack Night", date: "2026-11-06T13:00:00Z", location: "Main Hall" };

test("shareEvent uses the phone's share sheet when there is one", async () => {
  let shared;
  setNavigator({ share: async (data) => { shared = data; } });
  assert.equal(await shareEvent(event, "https://site.example/events/e1"), "shared");
  assert.equal(shared.url, "https://site.example/events/e1");
  assert.equal(shared.title, "Hack Night");
  assert.match(shared.text, /Hack Night -- .*Main Hall$/);
});

test("closing the share sheet is 'cancelled', not an error", async () => {
  setNavigator({ share: async () => { throw Object.assign(new Error("closed"), { name: "AbortError" }); } });
  assert.equal(await shareEvent(event, "https://site.example/e"), "cancelled");
});

test("without a share sheet, or when it fails for another reason, the link is copied", async () => {
  let copied;
  setNavigator({ clipboard: { writeText: async (t) => { copied = t; } } });
  assert.equal(await shareEvent(event, "https://site.example/e"), "copied");
  assert.equal(copied, "https://site.example/e");

  copied = null;
  setNavigator({ share: async () => { throw new Error("not allowed"); }, clipboard: { writeText: async (t) => { copied = t; } } });
  assert.equal(await shareEvent(event, "https://site.example/e2"), "copied");
  assert.equal(copied, "https://site.example/e2");
});

test("if neither sharing nor copying works, it says so instead of pretending", async () => {
  setNavigator({ clipboard: { writeText: async () => { throw new Error("denied"); } } });
  await assert.rejects(() => shareEvent(event, "https://site.example/e"), /denied/);
});

test("shareClub shares the club's own link and a short blurb; clubLink encodes the id", async () => {
  let shared;
  setNavigator({ share: async (data) => { shared = data; } });
  const club = { _id: "c1/x y", name: "Chess", description: "We play." };
  await shareClub(club, clubLink(club, "https://site.example"));
  assert.equal(shared.url, "https://site.example/clubs?club=c1%2Fx%20y");
  assert.equal(shared.text, "Chess -- a club at PCPS. We play.");
  assert.equal(clubLink({ _id: "abc" }, "https://o"), "https://o/clubs?club=abc");
  await shareClub({ _id: "c2", name: "Art" }, "https://site.example/c2");
  assert.equal(shared.text, "Art -- a club at PCPS.");
});

test("browserAllowsAutoplay reads the live browser settings, and allows when unsure", () => {
  delete globalThis.window;
  assert.equal(browserAllowsAutoplay(), false, "no browser at all");

  const setup = ({ reduced = false, connection } = {}) => {
    globalThis.window = { matchMedia: () => ({ matches: reduced }) };
    setNavigator(connection === undefined ? {} : { connection });
  };
  setup();
  assert.equal(browserAllowsAutoplay(), true, "nothing known: allowed");
  setup({ reduced: true });
  assert.equal(browserAllowsAutoplay(), false, "reduced motion");
  setup({ connection: { saveData: true } });
  assert.equal(browserAllowsAutoplay(), false, "data saver");
  setup({ connection: { effectiveType: "2g" } });
  assert.equal(browserAllowsAutoplay(), false, "slow connection");
  setup({ connection: { effectiveType: "4g" } });
  assert.equal(browserAllowsAutoplay(), true, "fast connection");
});
