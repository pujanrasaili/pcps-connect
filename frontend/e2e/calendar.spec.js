import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// The Events page month view, and "subscribe in your calendar".
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const EN = "en-US";
const noon = (y, m, d) => new Date(y, m, d, 12, 0, 0);
const now = new Date();
const Y = now.getFullYear();
const M = now.getMonth();
// Same month, a fixed mid-month day that isn't today, plus one the month after.
const midDay = now.getDate() === 15 ? 16 : 15;
const ev = (id, title, date, extra = {}) => ({ _id: id.padEnd(24, "0"), title, description: "x", date: date.toISOString(), location: "Main Hall", capacity: 50, registeredCount: 5, category: "Workshop", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0, ...extra });
const events = [
  ev("c1", "Hack Night", noon(Y, M, midDay)),
  ev("c2", "Open Mic", noon(Y, M, midDay)),
  ev("c3", "Poetry Slam", noon(Y, M, midDay)),
  ev("c4", "Next Month Fair", noon(Y, M + 1, 10)),
];
const monthName = (d) => d.toLocaleDateString(EN, { month: "long" });
const heading = (y, m) => `${monthName(new Date(y, m, 1))} ${y}`;
const dayName = (d) => `${d.toLocaleDateString(EN, { weekday: "long" })}, ${monthName(d)} ${d.getDate()}`;

async function open(page, lang = "en") {
  const problems = await setUp(page, { lang, role: "student" });
  await page.route("**/api/events", (route) => reply(route, { events }));
  await page.goto("/events?view=calendar");
  return problems;
}

test("the month view shows the month's events and a selected day's list", async ({ page }) => {
  const problems = await open(page);
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(heading(Y, M)) })).toContainText("3 events");
  const day = noon(Y, M, midDay);
  await page.getByRole("button", { name: `${dayName(day)}, 3 events` }).click();
  const list = page.getByRole("heading", { level: 3, name: dayName(day) });
  await expect(list).toBeVisible();
  for (const title of ["Hack Night", "Open Mic", "Poetry Slam"]) await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  await expect(page.getByRole("link", { name: /Next Month Fair/ })).toHaveCount(0);
  await page.getByRole("link", { name: /Open Mic/ }).click();
  await expect(page).toHaveURL(/\/events\/c2/);
  expect(problems.filter((p) => !/status of (401|404)/.test(p))).toEqual([]);
});

test("Next and Previous month move the view and show that month's events", async ({ page }) => {
  await open(page);
  const next = new Date(Y, M + 1, 1);
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(heading(next.getFullYear(), next.getMonth())) })).toContainText("1 event");
  await page.getByRole("button", { name: `${dayName(noon(next.getFullYear(), next.getMonth(), 10))}, 1 event` }).click();
  await expect(page.getByRole("link", { name: /Next Month Fair/ })).toBeVisible();
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(heading(Y, M)) })).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("button", { name: "Today" }).click();
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(heading(Y, M)) })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: dayName(now) })).toBeVisible();
});

test("a day with nothing on says so", async ({ page }) => {
  await open(page);
  const quiet = noon(Y, M, midDay === 20 ? 21 : 20);
  await page.getByRole("button", { name: `${dayName(quiet)}, 0 events` }).click();
  await expect(page.getByText("No events on this day.")).toBeVisible();
});

test("the category filter narrows what the calendar shows", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/events", (route) => reply(route, { events: [events[0], ev("c9", "Quiz Bowl", noon(Y, M, midDay), { category: "Competition" })] }));
  await page.goto("/events?view=calendar&category=Competition");
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(heading(Y, M)) })).toContainText("1 event");
});

test("the list/calendar switch is remembered in the address", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("button", { name: "Calendar", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page).not.toHaveURL(/view=calendar/);
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(page).toHaveURL(/view=calendar/);
});

test("the Nepali month view uses Nepali month and weekday names", async ({ page }) => {
  await open(page, "ne");
  await expect(page.getByRole("button", { name: "अर्को महिना" })).toBeVisible();
  await expect(page.getByRole("button", { name: "आज" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: String(Y) })).not.toContainText(monthName(now));
  await page.waitForTimeout(800);
  expect(await axeViolations(page)).toEqual([]);
});

test("the month view passes the accessibility checks", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(heading(Y, M)) })).toBeVisible();
  await page.waitForTimeout(800);
  expect(await axeViolations(page)).toEqual([]);
});

test("subscribe in your calendar: links for Apple/Outlook and a copyable address", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await setUp(page, { lang: "en", role: "student" });
  await page.goto("/events");
  const toggle = page.getByRole("button", { name: "Subscribe in your calendar" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Hide calendar subscription" })).toHaveAttribute("aria-expanded", "true");
  const apple = page.getByRole("link", { name: "Apple / Outlook" });
  await expect(apple).toHaveAttribute("href", /^webcal:\/\/.+\/events\/calendar\.ics$/);
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Calendar link copied.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^https?:\/\/.+\/events\/calendar\.ics$/);
  await page.getByRole("button", { name: "Hide calendar subscription" }).click();
  await expect(page.getByRole("link", { name: "Apple / Outlook" })).toHaveCount(0);
});

test("subscribing from one club's filter names that club and its feed", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.goto(`/events?club=${clubs[0]._id}`);
  await page.getByRole("button", { name: `Subscribe to ${clubs[0].name}` }).click();
  await expect(page.getByRole("link", { name: "Apple / Outlook" })).toHaveAttribute("href", new RegExp(`calendar\\.ics\\?club=${clubs[0]._id}$`));
});
