import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// While an organiser sets the time of a new event, the form warns when the same
// club already has an event then. It is only a heads-up: saving is still allowed.
const [coding, robotics] = clubs;
const HOUR = 36e5;
const reply = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const day = Date.now() + 4 * 864e5;
const slot = new Date(day); slot.setHours(10, 0, 0, 0);
const base = slot.getTime();
const existing = { _id: "ov1".padEnd(24, "0"), title: "Robot Night", description: "x", date: new Date(base).toISOString(), endDate: new Date(base + 3 * HOUR).toISOString(), location: "Lab", capacity: 40, registeredCount: 0, category: "Social", price: "Free", club: robotics };
const local = (ms) => { const d = new Date(ms); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

for (const lang of ["en", "ne"]) {
  test(`the form warns about another event of the same club at that time (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "admin" });
    await page.route("**/api/events*", (route) => (new URL(route.request().url()).pathname.endsWith("/api/events") ? reply(route, { events: [existing] }) : route.fallback()));
    await page.goto("/admin/events");
    await page.getByRole("button", { name: lang === "en" ? "Add Event" : "कार्यक्रम थप्नुहोस्" }).click();
    await page.locator("#ev-club").selectOption(robotics._id);
    await page.locator("#ev-date").fill(local(base + HOUR));
    const warn = page.getByTestId("club-overlap");
    await expect(warn).toContainText("Robot Night");
    // Another club, or a later time, has no warning.
    await page.locator("#ev-club").selectOption(coding._id);
    await expect(warn).toHaveCount(0);
    await page.locator("#ev-club").selectOption(robotics._id);
    await expect(warn).toBeVisible();
    await page.locator("#ev-date").fill(local(base + 3 * HOUR));
    await expect(warn).toHaveCount(0);
    await page.locator("#ev-date").fill(local(base + HOUR));
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
  });
}
