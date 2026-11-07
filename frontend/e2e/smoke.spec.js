import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

const PUBLIC_PAGES = ["/", "/events", "/clubs", "/help", "/login", "/contact", "/terms", "/privacy"];

for (const lang of ["en", "ne"]) {
  for (const path of PUBLIC_PAGES) {
    test(`${path} (${lang}) loads cleanly, fits a phone and passes the accessibility checks`, async ({ page }) => {
      const problems = await setUp(page, { lang });
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(await page.locator("html").getAttribute("lang")).toBe(lang);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scrolling").toBe(true);
      expect(await axeViolations(page)).toEqual([]);
      expect(problems).toEqual([]);
    });
  }

  test(`the Dashboard (${lang}) shows news from the student's clubs`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    await page.goto("/dashboard");
    await expect(page.getByText(lang === "ne" ? "तपाईंका क्लबहरूबाट समाचार" : "News from your clubs")).toBeVisible();
    await expect(page.getByText("Hack night moved to Friday!")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await axeViolations(page)).toEqual([]);
    expect(problems).toEqual([]);
  });
}
