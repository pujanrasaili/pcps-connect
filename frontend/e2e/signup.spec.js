import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// Signing up: the form checks every field, only PCPS emails are accepted, the
// server's "no" is shown on the page, and the account's language is sent along
// (so the verification email comes in the language the student was reading).
async function withSignupApi(page, { fail = false } = {}) {
  const sent = [];
  await page.route("**/api/auth/register", (route) => {
    sent.push(route.request().postDataJSON());
    if (fail) return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "An account with this email already exists." }) });
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ message: "Created", user: { email: "new@patancollege.edu.np" }, emailSent: true }) });
  });
  return sent;
}

async function fillValid(page) {
  await page.locator("#reg-name").fill("Maya Tamang");
  await page.locator("#reg-email").fill("maya@patancollege.edu.np");
  await page.locator("#reg-id").fill("PCPS-2026-014");
  await page.locator("#reg-password").fill("a-long-password");
  await page.locator("#reg-confirm").fill("a-long-password");
  await page.locator("input[name=agree]").check();
}

test("the sign-up form checks every field before sending anything", async ({ page }) => {
  await setUp(page, { lang: "en" });
  const sent = await withSignupApi(page);
  await page.goto("/register");
  const submit = page.locator("form button[type=submit]");
  await submit.click();
  for (const text of ["Full name is required.", "Enter a valid email address.", "Student ID is required.", "Password must be at least 8 characters.", "You must accept the terms to continue."]) {
    await expect(page.getByText(text)).toBeVisible();
  }
  await page.locator("#reg-email").fill("maya@gmail.com");
  await submit.click();
  await expect(page.getByText("Registration is limited to PCPS email addresses (@patancollege.edu.np).")).toBeVisible();
  await fillValid(page);
  await page.locator("#reg-confirm").fill("something-else-1");
  await submit.click();
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  expect(sent).toEqual([]);
});

test("the server's reason is shown on the page when sign-up fails", async ({ page }) => {
  await setUp(page, { lang: "en" });
  const sent = await withSignupApi(page, { fail: true });
  await page.goto("/register");
  await fillValid(page);
  await page.locator("form button[type=submit]").click();
  await expect(page.getByRole("alert").filter({ hasText: "An account with this email already exists." })).toBeVisible();
  expect(sent).toHaveLength(1);
});

for (const lang of ["en", "ne"]) {
  test(`a new student can sign up and is told to check their email (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    const sent = await withSignupApi(page);
    await page.goto("/register");
    await fillValid(page);
    await page.locator("form button[type=submit]").click();
    await expect(page.getByText("maya@patancollege.edu.np")).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ name: "Maya Tamang", email: "maya@patancollege.edu.np", studentId: "PCPS-2026-014", language: lang });
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 40[13]/.test(p))).toEqual([]);
  });
}
