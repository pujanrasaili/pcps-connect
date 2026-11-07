import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// Forgetting a password: ask for a link, then use it. The page never says
// whether an email has an account, and a bad or missing link says what to do.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

for (const lang of ["en", "ne"]) {
  test(`asking for a reset link shows the same answer for any email (${lang})`, async ({ page }) => {
    const en = lang === "en";
    const problems = await setUp(page, { lang });
    const sent = [];
    await page.route("**/api/auth/forgot-password", (route) => { sent.push(route.request().postDataJSON()); return reply(route, { message: "ok" }); });
    await page.goto("/forgot-password");
    await page.locator("#fp-email").fill("nobody@patancollege.edu.np");
    await page.locator("form button[type=submit]").click();
    await expect(page.getByText(en ? "Check your inbox" : "आफ्नो इनबक्स हेर्नुहोस्")).toBeVisible();
    await expect(page.getByText("nobody@patancollege.edu.np")).toBeVisible();
    expect(sent).toEqual([{ email: "nobody@patancollege.edu.np", language: lang }]);
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("a reset link without its token asks for a new one", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/reset-password");
  await expect(page.getByText("Invalid reset link")).toBeVisible();
  await page.getByRole("link", { name: "Request a new link" }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
});

test("the new password is checked, then sent with the token from the link", async ({ page }) => {
  await setUp(page, { lang: "en" });
  const sent = [];
  await page.route("**/api/auth/reset-password", (route) => { sent.push(route.request().postDataJSON()); return reply(route, { message: "Password reset" }); });
  await page.goto("/reset-password?token=abc123");
  const submit = page.locator("form button[type=submit]");
  await page.locator("#rp-password").fill("short");
  await page.locator("#rp-confirm").fill("short");
  await submit.click();
  await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  await page.locator("#rp-password").fill("a-new-password");
  await page.locator("#rp-confirm").fill("another-one-12");
  await submit.click();
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  expect(sent).toEqual([]);

  await page.locator("#rp-confirm").fill("a-new-password");
  await submit.click();
  await expect(page.getByText("Password reset", { exact: true })).toBeVisible();
  expect(sent).toEqual([{ token: "abc123", newPassword: "a-new-password" }]);
  await expect(page).toHaveURL(/\/login/, { timeout: 6000 });
});

test("an expired link shows the reason and a way to get a new one", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route("**/api/auth/reset-password", (route) => reply(route, { message: "This reset link has expired." }, 400));
  await page.goto("/reset-password?token=old");
  await page.locator("#rp-password").fill("a-new-password");
  await page.locator("#rp-confirm").fill("a-new-password");
  await page.locator("form button[type=submit]").click();
  const alert = page.getByRole("alert").filter({ hasText: "This reset link has expired." });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("link", { name: "Request a new link" })).toBeVisible();
});
