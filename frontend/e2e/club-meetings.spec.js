import { test, expect } from "@playwright/test";
import { setUp, clubs } from "./helpers.js";

// "Regular meetings": set by an admin, shown on the club page and the printed poster.
const MEETS = "Thursdays 3 PM, Room 204";
const withMeetings = [{ ...clubs[0], meetings: MEETS }, ...clubs.slice(1)];

async function mockClubs(page) {
  await page.route("**/api/clubs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clubs: withMeetings }) }));
}

test("students see when a club meets", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await mockClubs(page);
  await page.goto(`/clubs?club=${clubs[0]._id}`);
  await expect(page.getByText(`Meets: ${MEETS}`)).toBeVisible();
  await page.goto(`/clubs?club=${clubs[1]._id}`);
  await expect(page.getByText(/^Meets:/)).toHaveCount(0); // none set, nothing shown
  expect(problems).toEqual([]);
});

test("the printed poster carries the meeting time", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  await mockClubs(page);
  await page.route(`**/api/clubs/${clubs[0]._id}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ club: withMeetings[0] }) }));
  await page.goto(`/clubs/${clubs[0]._id}/poster`);
  await expect(page.getByText(`Meets: ${MEETS}`)).toBeVisible();
  expect(problems).toEqual([]);
});

test("an admin sets the meeting line when editing a club", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  let sent = null;
  await mockClubs(page);
  await page.route("**/api/clubs/*", (route) => {
    if (route.request().method() === "PUT") {
      sent = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Updated" }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ club: withMeetings[0] }) });
  });
  await page.goto("/admin/clubs");
  await page.getByRole("button", { name: /Edit/ }).first().click();
  const field = page.getByLabel("Regular meetings");
  await expect(field).toHaveValue(MEETS);
  await field.fill("Fridays 4 PM, Lab 2");
  await page.getByRole("button", { name: /Save|Update/ }).first().click();
  await expect.poll(() => sent?.meetings).toBe("Fridays 4 PM, Lab 2");
  expect(problems).toEqual([]);
});

test("the meeting line is translated in Nepali", async ({ page }) => {
  const problems = await setUp(page, { lang: "ne", role: "student" });
  await mockClubs(page);
  await page.goto(`/clubs?club=${clubs[0]._id}`);
  await expect(page.getByText(`बैठक: ${MEETS}`)).toBeVisible();
  expect(problems).toEqual([]);
});
