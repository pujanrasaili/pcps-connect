import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { setUp, clubs, axeViolations } from "./helpers.js";

// An admin pulls the event list into a spreadsheet for a term report.
const ev = (i, title, extra = {}) => ({ _id: `x${i}`.padEnd(24, "0"), title, description: "d", date: new Date(Date.now() + i * 864e5).toISOString(), location: "Main Hall", capacity: 40, registeredCount: i, pendingCount: 0, category: "Workshop", price: "Free", club: clubs[0], ...extra });

for (const lang of ["en", "ne"]) {
  test(`exports the events the list shows (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "admin" });
    await page.route("**/api/events*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [ev(1, "Hack Night"), ev(2, "Robot Day", { coHosts: [clubs[1]] })] }) }));
    await page.goto("/admin/events");
    const label = lang === "ne" ? "CSV निर्यात गर्नुहोस्" : "Export CSV";
    await expect(page.getByRole("button", { name: `${label} (2)` })).toBeVisible();
    await page.getByPlaceholder(lang === "ne" ? "कार्यक्रम खोज्नुहोस्..." : "Search events...").fill("Robot");
    const button = page.getByRole("button", { name: `${label} (1)` });
    await expect(button).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
    expect(download.suggestedFilename()).toBe("pcps-events.csv");
    const rows = readFileSync(await download.path(), "utf8").replace(/^﻿/, "").split("\r\n");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain('"Robot Day"');
    expect(rows[1]).toContain(`${clubs[0].name} + ${clubs[1].name}`);
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
    expect(await axeViolations(page)).toEqual([]);
    expect(problems).toEqual([]);
  });
}
