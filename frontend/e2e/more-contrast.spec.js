import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// "Increase contrast" in the device settings: fields, cards and buttons get a
// solid darker edge and the focus ring gets thicker.
async function edge(page, selector) {
  return page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: parseFloat(s.borderTopWidth), style: s.borderTopStyle, color: s.borderTopColor };
  });
}

test("fields get a solid dark edge when more contrast is asked for", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.emulateMedia({ contrast: "more" });
  await page.goto("/login");
  const field = await edge(page, ".input-field");
  expect(field.width).toBeGreaterThanOrEqual(1);
  expect(field.style).toBe("solid");
  expect(field.color).toBe("rgb(71, 85, 105)");
});

test("in dark mode the edge is light instead", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.addInitScript(() => localStorage.setItem("pcps_theme", "dark"));
  await page.emulateMedia({ contrast: "more", colorScheme: "dark" });
  await page.goto("/login");
  await page.waitForTimeout(300);
  const field = await edge(page, ".input-field");
  expect(field.color).toBe("rgb(203, 213, 225)");
});

test("nothing changes for people who did not ask for it", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/login");
  const field = await edge(page, ".input-field");
  expect(field.color).not.toBe("rgb(71, 85, 105)");
});

test("the sign-in page still passes the accessibility checks with more contrast", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.emulateMedia({ contrast: "more" });
  await page.goto("/login");
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
});
