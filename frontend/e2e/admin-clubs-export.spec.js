import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { setUp, clubs, axeViolations } from "./helpers.js";

// An admin pulls the club list into a spreadsheet.
for (const lang of ["en", "ne"]) {
  test(`exports the clubs the list shows (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "admin" });
    await page.route("**/api/clubs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clubs: clubs.map((c, i) => ({ ...c, memberCount: 10 + i, meetings: i ? "Fri 2 PM" : "" })) }) }));
    await page.goto("/admin/clubs");
    const label = lang === "ne" ? "CSV निर्यात गर्नुहोस्" : "Export CSV";
    await expect(page.getByRole("button", { name: `${label} (2)` })).toBeVisible();
    await page.getByPlaceholder(lang === "ne" ? "क्लब खोज्नुहोस्..." : "Search clubs...").fill(clubs[1].name);
    const button = page.getByRole("button", { name: `${label} (1)` });
    await expect(button).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
    expect(download.suggestedFilename()).toBe("pcps-clubs.csv");
    const rows = readFileSync(await download.path(), "utf8").replace(/^﻿/, "").split("\r\n");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain(`"${clubs[1].name}"`);
    expect(rows[1]).toContain('"11"');
    expect(rows[1]).toContain('"Fri 2 PM"');
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
    expect(await axeViolations(page)).toEqual([]);
    expect(problems).toEqual([]);
  });
}
