import { test, expect } from "@playwright/test";
import { setUp, student } from "./helpers.js";

// Logging in: checks the form before sending, shows the server's reason when
// it says no (a wrong password, an unverified email), and lands on the
// Dashboard when it says yes.
async function withLoginApi(page) {
  let loggedIn = false;
  const sent = [];
  const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/auth/me", (route) => (loggedIn ? reply(route, { user: student }) : reply(route, { message: "Not logged in" }, 401)));
  await page.route("**/api/auth/login", (route) => {
    const body = route.request().postDataJSON();
    sent.push(body);
    if (body.password === "wrong-password") return reply(route, { message: "Incorrect email or password." }, 401);
    if (body.email.startsWith("unverified")) return reply(route, { message: "Please verify your email first.", code: "EMAIL_NOT_VERIFIED" }, 403);
    loggedIn = true;
    return reply(route, { user: student });
  });
  return sent;
}

test("the login form checks the fields before sending anything", async ({ page }) => {
  await setUp(page, { lang: "en" });
  const sent = await withLoginApi(page);
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  await page.getByLabel("Email address").fill("not-an-email");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  expect(sent).toEqual([]);
});

test("a wrong password and an unverified email each get a clear message", async ({ page }) => {
  await setUp(page, { lang: "en" });
  const sent = await withLoginApi(page);
  await page.goto("/login");
  await page.getByLabel("Email address").fill("asha@patancollege.edu.np");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password." })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email address").fill("unverified@patancollege.edu.np");
  await page.getByLabel("Password", { exact: true }).fill("right-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please verify your email first." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend verification email" })).toBeVisible();
  expect(sent).toHaveLength(2);
});

for (const lang of ["en", "ne"]) {
  test(`a student can log in and reach the Dashboard (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    const sent = await withLoginApi(page);
    await page.goto("/login");
    await page.locator("#login-email").fill("asha@patancollege.edu.np");
    await page.locator("#login-password").fill("right-password");
    await page.locator("form button[type=submit]").click();
    await expect(page).toHaveURL(/\/dashboard/);
    expect(sent).toEqual([{ email: "asha@patancollege.edu.np", password: "right-password" }]);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(problems.filter((p) => !/status of 40[13]/.test(p))).toEqual([]);
  });
}
