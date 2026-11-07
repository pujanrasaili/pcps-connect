import { test, expect } from "@playwright/test";
import { setUp, student } from "./helpers.js";

// The English / Nepali switch: it changes the page, survives a reload, and for
// a logged-in student is saved on their account (so emails follow it).
test.use({ viewport: { width: 1200, height: 800 } });

test("a visitor can switch to Nepali and back, and the choice is remembered", async ({ page }) => {
  const problems = await setUp(page, { lang: "en" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByRole("button", { name: "नेपाली" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ne");
  await expect(page.getByRole("button", { name: "English" })).toBeVisible();
  await expect(page.locator("h1").first()).toContainText(/[ऀ-ॿ]/);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ne");

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(problems).toEqual([]);
});

test("a logged-in student's choice is saved on their account", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const saved = [];
  await page.route("**/api/auth/profile", (route) => {
    const body = route.request().postDataJSON();
    saved.push(body);
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { ...student, ...body } }) });
  });
  await page.goto("/dashboard");
  await expect(page.locator("h1").first()).toBeVisible();
  expect(saved, "nothing to save while the account already matches the site").toEqual([]);

  await page.getByRole("button", { name: "नेपाली" }).first().click();
  await expect.poll(() => saved).toEqual([{ language: "ne" }]);
});
