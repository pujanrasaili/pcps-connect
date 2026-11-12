import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// Small things that make typing on a phone easier: the number pad for phone
// numbers, no auto-capital on email, capitals for student IDs.
test("sign-up and login fields ask the phone for the right keyboard", async ({ page }) => {
  const problems = await setUp(page, {});
  await page.goto("/register");
  await expect(page.locator("#reg-id")).toHaveAttribute("autocapitalize", "characters");
  await expect(page.locator("input[type=email]")).toHaveAttribute("autocapitalize", "none");
  await page.goto("/login");
  await expect(page.locator("input[type=email]")).toHaveAttribute("autocapitalize", "none");
  await page.goto("/forgot-password");
  await expect(page.locator("input[type=email]")).toHaveAttribute("autocomplete", "email");
  expect(problems).toEqual([]);
});

test("the profile phone box shows the number pad", async ({ page }) => {
  const problems = await setUp(page, { role: "student" });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile" }).click();
  const phone = page.getByLabel("Phone number");
  await expect(phone).toHaveAttribute("type", "tel");
  await expect(phone).toHaveAttribute("inputmode", "tel");
  await expect(page.getByLabel("Student ID")).toHaveAttribute("autocapitalize", "characters");
  expect(problems).toEqual([]);
});
