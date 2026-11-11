import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// While events or clubs are loading, grey placeholder cards fill the grid (like a
// phone app) instead of one spinner; they disappear when the real cards arrive.
const slow = async (page, pattern, body) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route(pattern, async (route) => {
    await gate;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  return release;
};

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`events show placeholder cards until they load (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    const release = await slow(page, "**/api/events", { events: [{ _id: "e1".padEnd(24, "0"), title: "Hack Night", description: "x", date: new Date(Date.now() + 5 * 864e5).toISOString(), location: "Main Hall", capacity: 50, registeredCount: 1, category: "Workshop", price: "Free", club: clubs[0] }] });
    await page.goto("/events");
    const loading = page.getByRole("status").filter({ hasText: en ? "Loading events" : "कार्यक्रमहरू लोड हुँदैछ" });
    await expect(loading).toBeAttached();
    expect(await loading.locator("div.card-surface").count()).toBe(6);
    expect(await axeViolations(page)).toEqual([]);
    release();
    await expect(page.getByRole("heading", { name: "Hack Night" })).toBeVisible();
    await expect(loading).toHaveCount(0);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });

  test(`clubs show placeholder cards until they load (${lang})`, async ({ page }) => {
    await setUp(page, { lang });
    const release = await slow(page, "**/api/clubs", { clubs });
    await page.goto("/clubs");
    const loading = page.getByRole("status").filter({ hasText: en ? "Loading clubs" : "क्लबहरू लोड हुँदैछ" });
    await expect(loading).toBeAttached();
    release();
    await expect(page.getByRole("heading", { name: "Coding Club" }).first()).toBeVisible();
    await expect(loading).toHaveCount(0);
  });
}
