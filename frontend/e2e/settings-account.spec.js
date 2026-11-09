import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";
import { readFileSync } from "node:fs";

// Settings, account side: download my data, delete my account for real, and the dark-mode switch.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|500)/.test(p));
const mine = { profile: { name: "Asha Rai", email: "asha@patancollege.edu.np" }, registrations: [{ event: "Hack Night", attended: true }], clubMemberships: [{ club: "Coding Club" }], clubIdeas: [] };

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`Download my data saves the file the server sends (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    await page.route("**/api/auth/export", (route) => reply(route, mine));
    await page.goto("/settings");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: en ? /Download my data/ : /डेटा डाउनलोड/ }).click()]);
    expect(download.suggestedFilename()).toBe("pcps-connect-my-data.json");
    expect(JSON.parse(readFileSync(await download.path(), "utf8"))).toEqual(mine);
    await expect(page.getByText(en ? "Your data was downloaded." : "तपाईंको डेटा डाउनलोड भयो।")).toBeVisible();
    expect(quiet(problems)).toEqual([]);
  });
}

test("a failed download says so and can be tried again", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/auth/export", (route) => reply(route, { message: "Export is busy, try again" }, 500));
  await page.goto("/settings");
  const button = page.getByRole("button", { name: /Download my data/ });
  await button.click();
  await expect(page.getByText("Export is busy, try again")).toBeVisible();
  await expect(button).toBeEnabled();
  expect(quiet(problems)).toEqual([]);
});

test("deleting the account with the right password logs out and goes home", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const sent = [];
  await page.route("**/api/auth/account", (route) => { sent.push(route.request().postDataJSON()); return reply(route, { message: "Deleted" }); });
  await page.goto("/settings");
  const bell = page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /^Notifications/ });
  await expect(bell).toBeVisible(); // logged in: the header has the notification bell
  await page.getByRole("button", { name: /Delete account/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Delete my account" })).toBeVisible();
  await dialog.locator("#delete-password").fill("right-password");
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByText("Your account has been deleted.")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(sent).toEqual([{ password: "right-password" }]);
  // Logged out on the spot: the bell is gone.
  await expect(bell).toHaveCount(0);
});

test("Closing the delete dialog changes nothing, and forgets the typed password", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  let calls = 0;
  await page.route("**/api/auth/account", (route) => { calls += 1; return reply(route, { message: "Deleted" }); });
  await page.goto("/settings");
  await page.getByRole("button", { name: /Delete account/ }).first().click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Delete my account" })).toBeDisabled();
  await page.getByRole("dialog").locator("#delete-password").fill("secret-typed");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Delete my account" })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /Delete account/ }).first().click();
  await expect(page.getByRole("dialog").locator("#delete-password")).toHaveValue("");
  expect(calls).toBe(0);
});

test("an admin has no delete-account option", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: /Download my data/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete account/ })).toHaveCount(0);
});

test("the dark-mode switch changes the theme and is remembered", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("pcps_theme", "light"); sessionStorage.setItem("seeded", "1"); } });
  await page.goto("/settings");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);
  await page.getByRole("switch", { name: "Toggle dark mode" }).click();
  await expect(html).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem("pcps_theme"))).toBe("dark");
  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await expect(page.getByRole("switch", { name: "Toggle dark mode" })).toBeChecked();
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole("switch", { name: "Toggle dark mode" }).click();
  await expect(html).not.toHaveClass(/dark/);
});
