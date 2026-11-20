import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// Losing the connection: a bar on every page says so, and goes away by itself.
for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`a bar appears while the phone is offline and goes when it is back (${lang})`, async ({ page, context }) => {
    await setUp(page, { lang, role: "student" });
    await page.goto("/");
    const bar = page.getByRole("status").filter({ hasText: en ? "You're offline." : "तपाईं अफलाइन हुनुहुन्छ।" });
    await expect(bar).toHaveCount(0);
    await context.setOffline(true);
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(en ? "back online" : "इन्टरनेट फर्कनेबित्तिकै");
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
    await context.setOffline(false);
    await expect(bar).toHaveCount(0);
  });
}
