import { test, expect } from "@playwright/test";
import { setUp, student, axeViolations } from "./helpers.js";

// Settings: the two email switches save at once, a password can be changed,
// and deleting an account needs the right password.
async function withSettingsApi(page, lang) {
  let user = { ...student, language: lang };
  const calls = [];
  const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/auth/profile", (route) => {
    const body = route.request().postDataJSON();
    calls.push(`profile ${JSON.stringify(body)}`);
    user = { ...user, ...body };
    return reply(route, { user });
  });
  await page.route("**/api/auth/change-password", (route) => {
    const body = route.request().postDataJSON();
    calls.push(`password ${body.currentPassword}`);
    if (body.currentPassword !== "old-password-1") return reply(route, { message: "Current password is incorrect." }, 400);
    return reply(route, { message: "Password changed" });
  });
  await page.route("**/api/auth/account", (route) => {
    const body = route.request().postDataJSON();
    calls.push(`delete ${body.password}`);
    return reply(route, { message: "Incorrect password." }, 400);
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  test(`the email switches save as soon as they are flipped (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    const calls = await withSettingsApi(page, lang);
    await page.goto("/settings");
    const switches = page.getByRole("switch");
    const [reminders, updates] = [switches.nth(1), switches.nth(2)];
    await expect(reminders).toBeChecked();
    await expect(updates).toBeChecked();

    await reminders.click();
    await expect(reminders).not.toBeChecked();
    await expect.poll(() => calls).toEqual(['profile {"eventReminders":false}']);
    await expect(updates).toBeChecked();

    await updates.click();
    await expect(updates).not.toBeChecked();
    await expect.poll(() => calls).toEqual(['profile {"eventReminders":false}', 'profile {"clubUpdates":false}']);

    await reminders.click();
    await expect(reminders).toBeChecked();
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("a password change is checked here first, then by the server", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await withSettingsApi(page, "en");
  await page.goto("/settings");
  await page.getByRole("button", { name: "Change password" }).first().click();
  const dialog = page.getByRole("dialog");
  const submit = dialog.locator("form button[type=submit]");

  await dialog.locator("#current-password").fill("old-password-1");
  await dialog.locator("#new-password").fill("short");
  await dialog.locator("#confirm-new-password").fill("short");
  await submit.click();
  await expect(dialog.getByText("New password must be at least 8 characters.")).toBeVisible();

  await dialog.locator("#new-password").fill("a-new-password");
  await dialog.locator("#confirm-new-password").fill("another-one-12");
  await submit.click();
  await expect(dialog.getByText("New passwords do not match.")).toBeVisible();
  expect(calls).toEqual([]);

  await dialog.locator("#confirm-new-password").fill("a-new-password");
  await dialog.locator("#current-password").fill("not-my-password");
  await submit.click();
  await expect(dialog.getByText("Current password is incorrect.")).toBeVisible();

  await dialog.locator("#current-password").fill("old-password-1");
  await submit.click();
  await expect(page.getByText("Password changed successfully.")).toBeVisible();
  await expect(dialog).toBeHidden();
  expect(calls).toEqual(["password not-my-password", "password old-password-1"]);
});

test("deleting an account with the wrong password is refused and the account stays", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await withSettingsApi(page, "en");
  await page.goto("/settings");
  await page.getByRole("button", { name: /Delete account/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#delete-password").fill("wrong-password");
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(dialog.getByText("Incorrect password.")).toBeVisible();
  await expect(page).toHaveURL(/\/settings/);
  expect(calls).toEqual(["delete wrong-password"]);
});
