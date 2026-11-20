import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// A tab left open for a while shows old seat counts; coming back refreshes
// them quietly, but not on every glance at the tab.
const reply = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const ev = (n) => ({ _id: `e${n}`.padEnd(24, "0"), title: `Hack Night ${n}`, description: "x", date: new Date(Date.now() + 3 * 864e5).toISOString(), location: "Main Hall", capacity: 40, registeredCount: n, category: "Workshop", price: "Free" });

async function comeBack(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

test("returning to a tab after a while refreshes the events, a quick glance does not", async ({ page }) => {
  await page.clock.install();
  await setUp(page, { lang: "en", role: "student" });
  let calls = 0;
  await page.route("**/api/events", (route) => {
    calls += 1;
    return reply(route, { events: [ev(calls)] });
  });
  await page.goto("/events");
  await expect(page.getByText("Hack Night 1")).toBeVisible();
  expect(calls).toBe(1);

  await page.clock.fastForward(60 * 1000);
  await comeBack(page);
  await page.waitForTimeout(300);
  expect(calls).toBe(1);

  await page.clock.fastForward(6 * 60 * 1000);
  await comeBack(page);
  await expect(page.getByText("Hack Night 2")).toBeVisible();
  expect(calls).toBe(2);
});

test("a failed quiet refresh keeps the list that is on screen", async ({ page }) => {
  await page.clock.install();
  await setUp(page, { lang: "en", role: "student" });
  let calls = 0;
  await page.route("**/api/events", (route) => {
    calls += 1;
    if (calls > 1) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "down" }) });
    return reply(route, { events: [ev(1)] });
  });
  await page.goto("/events");
  await expect(page.getByText("Hack Night 1")).toBeVisible();
  await page.clock.fastForward(6 * 60 * 1000);
  await comeBack(page);
  await page.waitForTimeout(300);
  expect(calls).toBe(2);
  await expect(page.getByText("Hack Night 1")).toBeVisible();
});
