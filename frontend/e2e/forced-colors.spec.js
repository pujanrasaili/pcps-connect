import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// Windows "High contrast" mode swaps our colours for system ones, so buttons and
// fields need a real border or they melt into the page.
test("buttons, fields and cards keep a visible border in forced-colours mode", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/login");
  const edge = (selector) =>
    page.locator(selector).first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: parseFloat(s.borderTopWidth), style: s.borderTopStyle };
    });
  for (const selector of [".input-field", ".btn-primary"]) {
    const { width, style } = await edge(selector);
    expect(width, selector).toBeGreaterThanOrEqual(1);
    expect(style, selector).toBe("solid");
  }
});

test("a focused control gets an outline in forced-colours mode", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return { width: parseFloat(s.outlineWidth), style: s.outlineStyle };
  });
  expect(outline.width).toBeGreaterThanOrEqual(2);
  expect(outline.style).not.toBe("none");
});
