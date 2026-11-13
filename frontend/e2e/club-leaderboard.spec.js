import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

const board = (rows) => ({ days: 90, leaderboard: rows });
const mockBoard = (page, body, status = 200) =>
  page.route("**/api/stats/clubs", (route) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }));

const ROWS = [
  { _id: clubs[1]._id, name: clubs[1].name, category: "Technology", eventsHeld: 5, members: 4 },
  { _id: clubs[0]._id, name: clubs[0].name, category: "Technology", eventsHeld: 1, members: 1 },
];

for (const [lang, title, first, second] of [
  ["en", "Most active clubs", "5 events · 4 members", "1 event · 1 member"],
  ["ne", "सबैभन्दा सक्रिय क्लबहरू", "5 कार्यक्रम · 4 सदस्यहरू", "1 कार्यक्रम · 1 सदस्य"],
]) {
  test(`the Clubs page ranks the most active clubs (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await mockBoard(page, board(ROWS));
    await page.goto("/clubs");
    const section = page.getByRole("region", { name: title });
    await expect(section).toBeVisible();
    const items = section.getByRole("listitem");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText(clubs[1].name);
    await expect(items.nth(0)).toContainText(first);
    await expect(items.nth(1)).toContainText(second);
    await page.waitForTimeout(700);
    expect(await axeViolations(page)).toEqual([]);
    expect(problems).toEqual([]);
  });
}

test("choosing a club in the ranking opens that club", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await mockBoard(page, board(ROWS));
  await page.goto("/clubs");
  await page.getByRole("region", { name: "Most active clubs" }).getByRole("link", { name: new RegExp(clubs[1].name) }).click();
  await expect(page).toHaveURL(new RegExp(`club=${clubs[1]._id}`));
  await expect(page.getByRole("dialog", { name: clubs[1].name })).toBeVisible();
});

test("nothing is shown when no club has held an event, or the request fails", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await mockBoard(page, board([]));
  await page.goto("/clubs");
  await expect(page.getByText(clubs[0].name).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Most active clubs" })).toHaveCount(0);
  await page.unroute("**/api/stats/clubs");
  await mockBoard(page, { message: "boom" }, 500);
  await page.reload();
  await expect(page.getByText(clubs[0].name).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Most active clubs" })).toHaveCount(0);
});

test("the home page shows the leaderboard under the featured clubs", async ({ page }) => {
  const problems = await setUp(page, { lang: "en" });
  await mockBoard(page, board(ROWS));
  await page.goto("/");
  const section = page.getByRole("region", { name: "Most active clubs" });
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("listitem")).toHaveCount(2);
  await section.getByRole("link", { name: /Robotics Society/ }).click();
  await expect(page).toHaveURL(new RegExp(`/clubs\\?club=${clubs[1]._id}`));
  expect(problems).toEqual([]);
});

test("the home page has no leaderboard until a club has held an event", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await mockBoard(page, board([]));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Upcoming Events" }).or(page.getByText("View all clubs")).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Most active clubs" })).toHaveCount(0);
});
