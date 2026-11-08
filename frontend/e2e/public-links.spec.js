import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// Pages people reach from a link: a certificate's QR code, the email
// verification email, and a mistyped address. None needs a login.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
// The browser logs failed requests (401/404/400) on purpose-built error paths.
const real = (problems) => problems.filter((p) => !/status of (400|401|404)/.test(p));

for (const lang of ["en", "ne"]) {
  const en = lang === "en";

  test(`a genuine certificate shows who attended what (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await page.route("**/api/certificates/verify/GOOD-123", (route) =>
      reply(route, { valid: true, student: { name: "Asha Rai" }, event: { title: "Hack Night", date: "2026-10-01T10:00:00.000Z" } }));
    await page.goto("/verify/GOOD-123");
    await expect(page.getByRole("heading", { name: en ? "Genuine certificate" : "असली प्रमाणपत्र" })).toBeVisible();
    await expect(page.getByText("Asha Rai")).toBeVisible();
    await expect(page.getByText("Hack Night")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    expect(real(problems)).toEqual([]);
  });

  test(`an unknown certificate code is called unverified (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await page.route("**/api/certificates/verify/FAKE", (route) => reply(route, { valid: false }, 404));
    await page.goto("/verify/FAKE");
    await expect(page.getByRole("heading", { name: en ? "Couldn't verify this certificate" : "यो प्रमाणपत्र प्रमाणित गर्न सकिएन" })).toBeVisible();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("Genuine certificate")).toHaveCount(0);
    expect(await axeViolations(page)).toEqual([]);
    expect(real(problems)).toEqual([]);
  });

  test(`a mistyped address gets a 404 page with a way home (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await page.goto("/no/such/page");
    await expect(page.getByRole("heading", { name: en ? "Page not found" : "पृष्ठ फेला परेन" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole("link", { name: en ? "Back to home" : "गृहपृष्ठमा फर्कनुहोस्" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(real(problems)).toEqual([]);
  });
}

test("a certificate check that fails for another reason says so, not 'fake'", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route("**/api/certificates/verify/OOPS", (route) => reply(route, { message: "Server error" }, 500));
  await page.goto("/verify/OOPS");
  await expect(page.getByRole("heading", { name: "Couldn't check this certificate" })).toBeVisible();
  await expect(page.getByText("Couldn't verify this certificate")).toHaveCount(0);
});

test("the email link verifies the account with its token", async ({ page }) => {
  const problems = await setUp(page, { lang: "en" });
  const sent = [];
  await page.route("**/api/auth/verify-email", (route) => { sent.push(route.request().postDataJSON()); return reply(route, { message: "Your email is verified." }); });
  await page.goto("/verify-email?token=tok123");
  await expect(page.getByRole("heading", { name: "Email verified" })).toBeVisible();
  await expect(page.getByText("Your email is verified.")).toBeVisible();
  expect(sent).toEqual([{ token: "tok123" }]);
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole("link", { name: "Go to login" }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(real(problems)).toEqual([]);
});

test("an expired or missing verification link explains and offers login", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route("**/api/auth/verify-email", (route) => reply(route, { message: "Link expired" }, 400));
  await page.goto("/verify-email?token=old");
  await expect(page.getByRole("heading", { name: "Verification failed" })).toBeVisible();
  await expect(page.getByText("Link expired")).toBeVisible();
  await page.goto("/verify-email");
  await expect(page.getByText("This link is missing its verification token.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to login" })).toBeVisible();
});
