import { test, expect } from "@playwright/test";
import { setUp, student, clubs, axeViolations } from "./helpers.js";

// The Profile page: edit your details, and rate an event you attended.
const pastEvent = { _id: "e9".padEnd(24, "0"), title: "Photo Walk", date: new Date(Date.now() - 10 * 864e5).toISOString(), location: "Old Town", club: clubs[0], category: "Workshop", price: "Free" };

async function withProfileApi(page, lang) {
  let user = { ...student, language: lang };
  let registration = { _id: "r9".padEnd(24, "0"), event: pastEvent, status: "confirmed", attended: true, rating: 0, feedback: "" };
  const calls = [];
  const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/auth/me", (route) => reply(route, { user }));
  await page.route("**/api/auth/profile", (route) => {
    const body = route.request().postDataJSON();
    calls.push(`profile ${body.name} | ${body.program} | ${body.semester}`);
    user = { ...user, ...body };
    return reply(route, { user });
  });
  await page.route("**/api/registrations/my", (route) => reply(route, { registrations: [registration] }));
  await page.route("**/api/registrations/*/feedback", (route) => {
    const body = route.request().postDataJSON();
    calls.push(`feedback ${body.rating} "${body.feedback}"`);
    registration = { ...registration, rating: body.rating, feedback: body.feedback };
    return reply(route, { message: "Saved" });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  test(`a student can edit their details (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    const calls = await withProfileApi(page, lang);
    await page.goto("/profile");
    await expect(page.locator("h1").first()).toHaveText("Asha");

    await page.getByRole("button", { name: lang === "en" ? "Edit profile" : /सम्पादन/ }).first().click();
    await page.locator("#edit-name").fill("Asha Gurung");
    await page.locator("#edit-program").fill("BIT");
    await page.locator("#edit-semester").fill("3rd");
    await page.getByRole("dialog").locator("form button[type=submit]").click();

    await expect(page.locator("h1").first()).toHaveText("Asha Gurung");
    await expect(page.getByText("BIT · 3rd")).toBeVisible();
    expect(calls).toEqual(["profile Asha Gurung | BIT | 3rd"]);
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("a student must pick stars before sending feedback, then it is saved", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await withProfileApi(page, "en");
  await page.goto("/profile");
  await page.getByRole("button", { name: "Rate", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Submit feedback" }).click();
  await expect(page.getByText("Pick a star rating first.")).toBeVisible();
  expect(calls).toEqual([]);

  await dialog.getByRole("radio", { name: "4 stars" }).click();
  await expect(dialog.getByRole("radio", { name: "4 stars" })).toBeChecked();
  await dialog.locator("#rate-comment").fill("Great light and a friendly group.");
  await dialog.getByRole("button", { name: "Submit feedback" }).click();
  await expect(page.getByText("Thanks for your feedback!")).toBeVisible();
  await expect(dialog).toBeHidden();
  expect(calls).toEqual(['feedback 4 "Great light and a friendly group."']);
  await expect(page.getByRole("button", { name: "Edit rating" })).toBeVisible();
});
