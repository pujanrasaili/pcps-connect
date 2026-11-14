import { test, expect } from "@playwright/test";
import { setUp, student } from "./helpers.js";

// Events page: a "My topics" filter appears only for students who follow topics.
const future = (days) => new Date(Date.now() + days * 864e5).toISOString();
const make = (i, category) => ({ _id: `e${i}`.padEnd(24, "0"), title: `Event ${i}`, description: "d", date: future(i + 2), location: "Hall", capacity: 50, registeredCount: 1, category, price: "Free", club: null });

async function open(page, { role = "student", interests = [], lang = "en", url = "/events" } = {}) {
  const problems = await setUp(page, { lang, role });
  if (role) await page.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { ...student, language: lang, interests } }) }));
  const events = [make(1, "Workshop"), make(2, "Sports"), make(3, "workshop"), make(4, "Music")];
  await page.route("**/api/events", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events }) }));
  await page.goto(url);
  return problems;
}

test("My topics narrows the list to followed categories", async ({ page }) => {
  const problems = await open(page, { interests: ["workshop"] });
  const chip = page.getByRole("button", { name: "My topics" });
  await expect(chip).toBeVisible();
  await expect(page.getByRole("heading", { name: "Event 2" })).toBeVisible();
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Event 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Event 3" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Event 2" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Event 4" })).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("no My topics chip when the student follows nothing, and a stale link shows everything", async ({ page }) => {
  await open(page, { interests: [], url: "/events?category=My%20topics" });
  await expect(page.getByRole("button", { name: "My topics" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Event 2" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Event 4" })).toBeVisible();
});

test("My topics is translated in Nepali", async ({ page }) => {
  const problems = await open(page, { interests: ["workshop"], lang: "ne" });
  await expect(page.getByRole("button", { name: "मेरा विषयहरू" })).toBeVisible();
  expect(problems).toEqual([]);
});
