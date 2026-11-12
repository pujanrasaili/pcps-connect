import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// Prices and categories come from event/club data, not the page text, so they
// were left in English on the Nepali site. They now go through the dictionary.
for (const [lang, free, workshop, tech] of [["en", "Free", "Workshop", "Technology"], ["ne", "निःशुल्क", "कार्यशाला", "प्रविधि"]]) {
  test(`event and club cards show the price and category in the chosen language (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await page.goto("/events");
    const card = page.locator("div.card-surface").filter({ hasText: workshop }).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText(free);
    await page.goto("/clubs");
    await expect(page.locator("div.card-surface").filter({ hasText: tech }).first()).toBeVisible();
    expect(problems).toEqual([]);
  });
}

test("Nepali cards no longer show the English price or category", async ({ page }) => {
  await setUp(page, { lang: "ne" });
  await page.goto("/events");
  await expect(page.locator("div.card-surface").getByText("कार्यशाला").first()).toBeVisible();
  await expect(page.locator("div.card-surface").filter({ hasText: /\bWorkshop\b/ })).toHaveCount(0);
  await expect(page.locator("div.card-surface").filter({ hasText: /\bFree\b/ })).toHaveCount(0);
});
