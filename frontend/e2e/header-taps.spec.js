import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// The icons in the phone header are easy to hit: at least 44px tall, 40px wide,
// and the row still fits the narrowest common phone (360px).
for (const role of ["student", null]) {
  test(`phone header buttons are big enough to tap (${role || "signed out"})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const problems = await setUp(page, role ? { role } : {});
    await page.goto("/events");
    const names = ["Search clubs and events", "Toggle dark mode", "Toggle navigation menu", "नेपाली"];
    if (role) names.push("Notifications");
    const found = [];
    for (const name of names) found.push(page.getByRole("button", { name }).first());
    for (const button of found) {
      const box = await button.boundingBox();
      expect(box.height, await button.getAttribute("aria-label")).toBeGreaterThanOrEqual(43.5);
      expect(box.width).toBeGreaterThanOrEqual(39.5);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const last = await page.getByRole("button", { name: "Toggle navigation menu" }).boundingBox();
    expect(last.x + last.width).toBeLessThanOrEqual(360);
    expect(problems).toEqual([]);
  });
}
