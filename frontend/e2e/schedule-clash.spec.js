import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// A student looking at an event that overlaps one they are already signed up
// for is told before they register, with a link to the other one.
const HOUR = 36e5;
const ID = "c1".padEnd(24, "0");
const OTHER = "c2".padEnd(24, "0");
const start = Date.now() + 3 * 864e5;
const ev = (id, title, offsetH, lengthH) => ({ _id: id, title, description: "Test.", date: new Date(start + offsetH * HOUR).toISOString(), endDate: lengthH ? new Date(start + (offsetH + lengthH) * HOUR).toISOString() : null, location: "Main Hall", capacity: 60, registeredCount: 10, category: "Social", price: "Free" });
const reply = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|403|404|500)/.test(p));

async function open(page, { mine, other, status = "confirmed", lang = "en" }) {
  const problems = await setUp(page, { lang, role: "student" });
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: mine }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route("**/api/registrations/my", (route) => reply(route, { registrations: other ? [{ _id: "r1".padEnd(24, "0"), event: other, status, attended: false, rating: 0, feedback: "" }] : [] }));
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("heading", { name: mine.title, level: 1 })).toBeVisible();
  return problems;
}

for (const lang of ["en", "ne"]) {
  test(`an overlapping sign-up is flagged with a link to it (${lang})`, async ({ page }) => {
    const problems = await open(page, { lang, mine: ev(ID, "Hack Night", 0, 3), other: ev(OTHER, "Robot Demo", 1, 2) });
    const notice = page.getByTestId("clash-notice");
    await expect(notice).toContainText("Robot Demo");
    await notice.getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/events/${OTHER}`));
    expect(quiet(problems)).toEqual([]);
  });
}

test("no warning when the other event is back to back, cancelled, or there is none", async ({ page }) => {
  for (const [other, status] of [[ev(OTHER, "Later", 3, 1), "confirmed"], [ev(OTHER, "Same time", 0, 3), "cancelled"], [null, "confirmed"]]) {
    await open(page, { mine: ev(ID, "Hack Night", 0, 3), other, status });
    await expect(page.getByTestId("clash-notice")).toHaveCount(0);
  }
});

test("the warning is accessible", async ({ page }) => {
  await open(page, { mine: ev(ID, "Hack Night", 0, 3), other: ev(OTHER, "Robot Demo", 1, 2) });
  await expect(page.getByTestId("clash-notice")).toBeVisible();
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
});

test("the Events list marks a card that overlaps a sign-up", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  const mine = ev(OTHER, "Robot Demo", 1, 2);
  const clashing = ev(ID, "Hack Night", 0, 3);
  const free = ev("c3".padEnd(24, "0"), "Quiet Reading", 10, 2);
  await page.route("**/api/events*", (route) => (new URL(route.request().url()).pathname.endsWith("/api/events") ? reply(route, { events: [mine, clashing, free] }) : route.fallback()));
  await page.route("**/api/registrations/my", (route) => reply(route, { registrations: [{ _id: "r1".padEnd(24, "0"), event: mine, status: "confirmed", attended: false, rating: 0, feedback: "" }] }));
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Quiet Reading" })).toBeVisible();
  const badges = page.getByTestId("clash-badge");
  await expect(badges).toHaveCount(1);
  await expect(page.locator("div", { has: page.getByRole("heading", { name: "Hack Night" }) }).getByTestId("clash-badge").first()).toBeVisible();
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
  expect(quiet(problems)).toEqual([]);
});
