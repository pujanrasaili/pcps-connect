import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// A long page gets a "Back to top" button once you have scrolled down, and the
// home page says so when no events are coming up instead of leaving a blank gap.
const text = { en: { back: "Back to top", none: "No upcoming events yet" }, ne: { back: "माथि जानुहोस्", none: "अहिलेसम्म कुनै आगामी कार्यक्रम छैन" } };

for (const lang of ["en", "ne"]) {
  test.describe(lang, () => {
    test("the button shows after scrolling and takes you back to the top", async ({ page }) => {
      await setUp(page, { lang });
      await page.goto("/");
      const button = page.getByRole("button", { name: text[lang].back });
      await expect(button).toHaveCount(0);

      // The page is still filling in at first, so keep scrolling to the bottom until it is long enough.
      await expect(async () => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await expect(button).toBeVisible({ timeout: 500 });
      }).toPass({ timeout: 10000 });
      expect(await axeViolations(page)).toEqual([]);

      await button.click();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(button).toHaveCount(0);
    });

    test("the home page explains when no events are coming up", async ({ page }) => {
      await setUp(page, { lang });
      await page.route("**/api/events**", (route) =>
        route.request().resourceType() === "document"
          ? route.fallback()
          : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [] }) }),
      );
      await page.goto("/");
      await expect(page.getByText(text[lang].none)).toBeVisible();
    });
  });
}
