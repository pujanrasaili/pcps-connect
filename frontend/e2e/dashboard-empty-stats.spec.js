import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// A new student has no activity yet, so the two empty chart cards become one short card.
for (const [lang, title, month] of [["en", "Your activity", "Participation by Month"], ["ne", "तपाईंको गतिविधि", "Participation by Month"]]) {
  test(`a student with no activity sees one short stats card (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByRole("heading", { name: month })).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}
