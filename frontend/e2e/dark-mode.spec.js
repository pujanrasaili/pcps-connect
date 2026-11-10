import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// Dark mode gets its own accessibility run: colours that pass in light mode
// can fail contrast checks once the page is dark.
const PUBLIC_PAGES = ["/", "/events", "/clubs", "/help", "/login", "/register", "/contact", "/terms", "/privacy"];
const dark = (page) => page.addInitScript(() => localStorage.setItem("pcps_theme", "dark"));

for (const path of PUBLIC_PAGES) {
  test(`${path} passes the accessibility checks in dark mode`, async ({ page }) => {
    const problems = await setUp(page, { lang: "en" });
    await dark(page);
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark")), "page is dark").toBe(true);
    expect(await axeViolations(page)).toEqual([]);
    expect(problems).toEqual([]);
  });
}

for (const [role, path] of [["student", "/dashboard"], ["student", "/profile"], ["student", "/settings"], ["student", "/board"], ["admin", "/admin"], ["admin", "/admin/events"], ["admin", "/admin/users"]]) {
  test(`${path} (${role}) passes the accessibility checks in dark mode`, async ({ page }) => {
    const problems = await setUp(page, { lang: "ne", role });
    await dark(page);
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}
