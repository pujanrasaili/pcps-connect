import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Dashboard card "Polls waiting for your vote": lists open polls the student
// hasn't voted on, links to the club, and is absent when there are none.
const reply = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const polls = [{ _id: "p1", question: "Which day works for the trip?", closesAt: new Date(Date.now() + 2 * 86400000).toISOString(), club: { _id: clubs[0]._id, name: clubs[0].name } }];
const text = {
  en: { head: "Polls waiting for your vote" },
  ne: { head: "तपाईंको मत कुरिरहेका मतदानहरू" },
};

for (const lang of ["en", "ne"]) {
  test(`the Dashboard lists a poll waiting for a vote and opens its club (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "student" });
    await page.route("**/api/club-memberships/polls", (route) => reply(route, { polls }));
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: text[lang].head })).toBeVisible();
    await expect(page.getByText("Which day works for the trip?")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole("link", { name: /Which day works for the trip\?/ }).click();
    await expect(page).toHaveURL(new RegExp(`/clubs\\?club=${clubs[0]._id}`));
  });
}

test("no card when there are no polls waiting", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Polls waiting for your vote" })).toHaveCount(0);
});
