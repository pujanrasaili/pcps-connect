import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// Printing an ordinary page: no menu, footer or sidebar, and dark mode prints
// in light colours.
test("printing leaves out the menu and footer but keeps the page", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.goto("/events");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("header").first()).toBeHidden();
  await expect(page.locator("footer").first()).toBeHidden();
  await expect(page.locator("main")).toBeVisible();
});

test("the dashboard menu is left out of a printout too", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.goto("/dashboard");
  await expect(page.getByRole("navigation", { name: "Dashboard menu" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Dashboard menu" })).toBeHidden();
});

test("dark mode switches to light colours while printing and comes back after", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.addInitScript(() => localStorage.setItem("pcps_theme", "dark"));
  await page.goto("/events");
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
  await expect.poll(isDark).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  expect(await isDark()).toBe(false);
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  expect(await isDark()).toBe(true);
});

test("a light theme stays light after printing", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.addInitScript(() => localStorage.setItem("pcps_theme", "light"));
  await page.goto("/events");
  await page.evaluate(() => { window.dispatchEvent(new Event("beforeprint")); window.dispatchEvent(new Event("afterprint")); });
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
});
