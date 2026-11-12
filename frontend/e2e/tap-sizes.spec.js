import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

test.use({ viewport: { width: 390, height: 844 } });

// Second round of phone tap targets: tabs and toggles on Events, the heart on
// club cards and the status filters in admin users are at least 40px tall.
const tall = async (locator, min = 39.5) => {
  const box = await locator.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(min);
};

test("Events tabs and view buttons are easy to tap", async ({ page }) => {
  const problems = await setUp(page, { role: "student" });
  await page.goto("/events");
  for (const name of ["Upcoming", "This week", "Past", "Saved"]) await tall(page.getByRole("button", { name, exact: true }));
  await tall(page.getByRole("button", { name: "List", exact: true }));
  await tall(page.getByRole("button", { name: "Calendar", exact: true }));
  expect(problems).toEqual([]);
});

test("the club heart is easy to tap", async ({ page }) => {
  const problems = await setUp(page, { role: "student" });
  await page.goto("/clubs");
  await tall(page.getByRole("button", { name: "Set as favorite club" }).first());
  expect(problems).toEqual([]);
});

test("admin user status filters are easy to tap", async ({ page }) => {
  const problems = await setUp(page, { role: "admin" });
  await page.goto("/admin/users");
  await tall(page.getByRole("button", { name: /^pending/ }));
  expect(problems).toEqual([]);
});

test("Board and admin activity filters are easy to tap", async ({ page }) => {
  let problems = await setUp(page, { role: "student" });
  await page.goto("/board");
  await tall(page.getByRole("button", { name: "Lost", exact: true }));
  expect(problems).toEqual([]);
});

test("admin activity filters are easy to tap", async ({ page }) => {
  const problems = await setUp(page, { role: "admin" });
  await page.goto("/admin/activity");
  await tall(page.getByRole("button", { name: "People", exact: true }));
  expect(problems).toEqual([]);
});

test("Events checkboxes, Clubs sort and admin tabs are easy to tap", async ({ page }) => {
  let problems = await setUp(page, { role: "admin" });
  await page.goto("/events");
  await tall(page.getByText("Free events only"));
  await page.goto("/clubs");
  await tall(page.getByLabel("Sort by"));
  await page.goto("/admin/events");
  await tall(page.getByRole("button", { name: /^Upcoming/ }));
  await page.goto("/admin/users");
  await tall(page.getByRole("button", { name: /^Export CSV/ }));
  expect(problems).toEqual([]);
});
