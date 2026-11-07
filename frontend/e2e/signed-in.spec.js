import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// Pages that need an account: what a student sees, then what an admin sees.
const STUDENT_PAGES = ["/profile", "/settings", "/events"];
const ADMIN_PAGES = ["/admin", "/admin/clubs", "/admin/events", "/admin/users", "/admin/activity", "/admin/messages", "/admin/check-in"];

for (const lang of ["en", "ne"]) {
  for (const [role, paths] of [["student", STUDENT_PAGES], ["admin", ADMIN_PAGES]]) {
    for (const path of paths) {
      test(`${path} as ${role} (${lang}) loads cleanly, fits a phone and passes the accessibility checks`, async ({ page }) => {
        const problems = await setUp(page, { lang, role });
        await page.goto(path);
        await expect(page.locator("h1").first()).toBeVisible();
        await page.waitForLoadState("networkidle");
        expect(new URL(page.url()).pathname, "stays on the page (no redirect to login)").toBe(path);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scrolling").toBe(true);
        expect(await axeViolations(page)).toEqual([]);
        expect(problems).toEqual([]);
      });
    }
  }
}
