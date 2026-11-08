import { test, expect } from "@playwright/test";
import { setUp, clubs } from "./helpers.js";

// Using the site without a mouse: the skip link, and dialogs that keep focus
// inside, close on Escape and hand focus back.
test("the first Tab offers 'Skip to main content' and Enter jumps there", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content, main").first()).toBeFocused();
});

test("a dialog takes focus, keeps it inside, and gives it back on Escape", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/auth/change-password", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.goto("/settings");
  const opener = page.getByRole("button", { name: "Change password" }).first();
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);

  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement)), `Tab ${i + 1} stays inside`).toBe(true);
  }
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement)), `Shift+Tab ${i + 1} stays inside`).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("the club window can be closed with Escape too", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto(`/clubs?club=${clubs[0]._id}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Wait until the window has taken focus, as a person would, before pressing keys.
  await expect.poll(() => dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
