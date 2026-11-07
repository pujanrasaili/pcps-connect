import { test, expect } from "@playwright/test";
import { setUp, clubs } from "./helpers.js";

// Finding an event: the tabs, the search box, the two filters and "Clear filters".
const DAY = 864e5;
const make = (i, title, offset, extra = {}) => ({
  _id: `f${i}`.padEnd(24, "0"), title, description: "An event used by the browser tests.", date: new Date(Date.now() + offset * DAY).toISOString(),
  location: "Main Hall", capacity: 50, registeredCount: 20, category: "Workshop", price: "Free", club: clubs[i % 2], averageRating: 0, ratingCount: 0, ...extra,
});
const events = [
  make(1, "Hack Night", 3),
  make(2, "Paid Pottery Class", 5, { price: "Rs. 200", location: "Art Room" }),
  make(3, "Full House Seminar", 7, { capacity: 10, registeredCount: 10 }),
  make(4, "Old Quiz Night", -12),
];

async function open(page, lang = "en", path = "/events") {
  const problems = await setUp(page, { lang });
  await page.route("**/api/events", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events }) }));
  await page.goto(path);
  await expect(page.getByText("Hack Night")).toBeVisible();
  return problems;
}
const shown = (page, title) => page.getByText(title, { exact: true });

test("upcoming events show first and the Past tab shows finished ones", async ({ page }) => {
  await open(page);
  await expect(shown(page, "Paid Pottery Class")).toBeVisible();
  await expect(shown(page, "Old Quiz Night")).toHaveCount(0);
  await page.getByRole("button", { name: "Past", exact: true }).click();
  await expect(shown(page, "Old Quiz Night")).toBeVisible();
  await expect(shown(page, "Hack Night")).toHaveCount(0);
});

test("search narrows the list by name or place, and Clear filters brings everything back", async ({ page }) => {
  await open(page);
  await page.getByPlaceholder("Search by name, place or club...").fill("pottery");
  await expect(shown(page, "Paid Pottery Class")).toBeVisible();
  await expect(shown(page, "Hack Night")).toHaveCount(0);

  await page.getByPlaceholder("Search by name, place or club...").fill("Art Room");
  await expect(shown(page, "Paid Pottery Class")).toBeVisible();

  await page.getByPlaceholder("Search by name, place or club...").fill("zzz-nothing");
  await expect(page.getByText("No upcoming events match your search.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(shown(page, "Hack Night")).toBeVisible();
  await expect(shown(page, "Full House Seminar")).toBeVisible();
});

test("'only events with spots left' and 'free events only' filter the list, and the choice is in the address", async ({ page }) => {
  await open(page);
  await page.getByLabel("Only events with spots left").click();
  await expect(page.getByLabel("Only events with spots left")).toBeChecked();
  await expect(shown(page, "Full House Seminar")).toHaveCount(0);
  await expect(shown(page, "Hack Night")).toBeVisible();
  await expect(page).toHaveURL(/open=/);

  await page.getByLabel("Free events only").click();
  await expect(page.getByLabel("Free events only")).toBeChecked();
  await expect(shown(page, "Paid Pottery Class")).toHaveCount(0);
  await expect(shown(page, "Hack Night")).toBeVisible();
  await expect(page).toHaveURL(/free=/);

  // A shared link opens with the same filters already on.
  const url = page.url();
  await page.goto("/");
  await page.goto(url);
  await expect(page.getByLabel("Free events only")).toBeChecked();
  await expect(shown(page, "Paid Pottery Class")).toHaveCount(0);
});

test("the Nepali page filters the same way", async ({ page }) => {
  const problems = await open(page, "ne");
  await page.locator('input[type="search"], input[placeholder]').first().fill("pottery");
  await expect(shown(page, "Paid Pottery Class")).toBeVisible();
  await expect(shown(page, "Hack Night")).toHaveCount(0);
  expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
});
