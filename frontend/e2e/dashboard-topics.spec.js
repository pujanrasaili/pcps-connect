import { test, expect } from "@playwright/test";
import { setUp, student, axeViolations } from "./helpers.js";

// The dashboard lists upcoming events in followed topics, minus ones shown elsewhere.
const future = (days) => new Date(Date.now() + days * 864e5).toISOString();
const make = (i, category, days) => ({ _id: `e${i}`.padEnd(24, "0"), title: `Event ${i}`, description: "d", date: future(days), location: "Hall", capacity: 50, registeredCount: 1, category, price: "Free", club: null });

async function open(page, lang, interests) {
  const problems = await setUp(page, { lang, role: "student" });
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { ...student, language: lang, interests } }) }));
  const events = [make(1, "Workshop", 5), make(2, "workshop", 3), make(3, "Sports", 4), make(4, "Workshop", -2), make(5, "General", 2)];
  await page.route("**/api/events", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events }) }));
  await page.goto("/dashboard");
  return problems;
}

test("followed topics show matching upcoming events, soonest first", async ({ page }) => {
  const problems = await open(page, "en", ["workshop"]);
  const card = page.locator("div.card-surface", { has: page.getByRole("heading", { name: "In topics you follow" }) });
  await expect(card).toBeVisible();
  const titles = await card.locator("li a p.truncate:first-child").allTextContents();
  expect(titles).toEqual(["Event 2", "Event 1"]); // case-insensitive, no past event, no other topic
  await expect(card.getByRole("link", { name: "Change your topics" })).toHaveAttribute("href", "/settings");
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  expect(await axeViolations(page)).toEqual([]);
  expect(problems).toEqual([]);
});

test("no card when the student follows nothing", async ({ page }) => {
  await open(page, "en", []);
  await expect(page.getByRole("heading", { name: "Your activity" }).or(page.getByRole("heading", { name: /Welcome|Hello|Hi/ })).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "In topics you follow" })).toHaveCount(0);
});

test("the card is translated in Nepali", async ({ page }) => {
  const problems = await open(page, "ne", ["workshop"]);
  await expect(page.getByRole("heading", { name: "तपाईंले पछ्याएका विषयमा" })).toBeVisible();
  expect(problems).toEqual([]);
});
