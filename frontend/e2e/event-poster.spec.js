import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// The printable event poster: opened by organisers from the event page,
// showing the title, time, place and a QR code that opens the event.
const ID = "q1".padEnd(24, "0");
const event = (daysAhead = 6) => ({ _id: ID, title: "Open Mic", description: "Bring a song.", date: new Date(Date.now() + daysAhead * 864e5).toISOString(), location: "Main Hall", capacity: 60, registeredCount: 10, category: "Social", price: "Free", club: clubs[0], coHosts: [clubs[1]], photos: [], averageRating: 0, ratingCount: 0 });
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|403|404|500)/.test(p));

async function api(page, daysAhead) {
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: event(daysAhead) }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
}

test("an admin opens the poster from an upcoming event and sees the details and a QR code", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  await api(page);
  await page.goto(`/events/${ID}`);
  await page.getByRole("link", { name: "Print a poster" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${ID}/poster$`));
  const poster = page.getByRole("article");
  await expect(poster.getByRole("heading", { name: "Open Mic" })).toBeVisible();
  await expect(poster.getByText("Main Hall")).toBeVisible();
  await expect(poster.getByText(`${clubs[0].name} + ${clubs[1].name}`)).toBeVisible();
  await expect(poster.getByText("Scan to see details and register")).toBeVisible();
  await expect(page.getByText(`/events/${ID}`).first()).toBeVisible();
  await expect(page.locator("svg[role='img']").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the event" })).toBeVisible();
  expect(quiet(problems)).toEqual([]);
});

test("a student doesn't see the poster link", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await api(page);
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Share this event" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Print a poster" })).toHaveCount(0);
});

test("a finished event has no poster link", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await api(page, -3);
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Share this event" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Print a poster" })).toHaveCount(0);
});

test("a missing event shows a friendly message", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { message: "Event not found" }, 404));
  await page.goto(`/events/${ID}/poster`);
  await expect(page.getByRole("heading", { name: "Couldn't open this poster" })).toBeVisible();
});

test("Nepali: the poster text is translated and passes the accessibility checks", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "admin" });
  await api(page);
  await page.goto(`/events/${ID}/poster`);
  await expect(page.getByText("विवरण हेर्न र दर्ता गर्न स्क्यान गर्नुहोस्")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Open Mic" })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});
