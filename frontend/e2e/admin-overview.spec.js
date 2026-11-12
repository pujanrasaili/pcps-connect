import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";
import { readFileSync } from "node:fs";

// Admin -> Overview: the numbers, the "needs your attention" banners, the
// weekly summary, insights, the attendance report download, and what happens
// when one of the extra cards can't load.
const DAY = 864e5;
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|500)/.test(p));
const ev = (i, title, offset, extra = {}) => ({ _id: `v${i}`.padEnd(24, "0"), title, description: "x", date: new Date(Date.now() + offset * DAY).toISOString(), location: "Main Hall", capacity: 50, registeredCount: 20, pendingCount: 0, category: "Workshop", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0, ...extra });
const week = { newStudents: { current: 5, previous: 2, change: 150 }, registrations: { current: 9, previous: 9, change: 0 }, upcomingEvents: 2 };
const report = { events: [{ _id: "r1".padEnd(24, "0"), title: "Photo Walk", date: new Date(Date.now() - 10 * DAY).toISOString(), registered: 20, attended: 15, noShows: 5, attendanceRate: 75, averageRating: 4.2, ratingCount: 6 }], totals: { registered: 20, attended: 15, attendanceRate: 75, averageRating: 4.2, ratingCount: 6 } };

async function overview(page, lang, { events = [ev(1, "Hack Night", 5, { pendingCount: 2 }), ev(2, "Robot Demo", 9)], health = { email: "brevo" }, weekReply = week, users } = {}) {
  const problems = await setUp(page, { lang, role: "admin" });
  await page.route("**/api/events", (route) => reply(route, { events }));
  await page.route("**/api/health", (route) => reply(route, health, health ? 200 : 500));
  await page.route("**/api/admin/week", (route) => (weekReply ? reply(route, weekReply) : reply(route, { message: "nope" }, 500)));
  if (users) await page.route("**/api/admin/users", (route) => reply(route, { users }));
  await page.goto("/admin");
  return problems;
}

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`the overview shows totals, this week, insights and what's coming up (${lang})`, async ({ page }) => {
    const problems = await overview(page, lang);
    await expect(page.getByRole("heading", { level: 1, name: en ? "Admin Overview" : "एडमिन सारांश" })).toBeVisible();
    // Counters animate up to their value.
    await expect(page.getByText("Total Clubs").or(page.getByText("कुल क्लब")).first()).toBeVisible();
    const week7 = page.getByRole("region", { name: en ? "Last 7 days" : "पछिल्ला 7 दिन" });
    await expect(week7).toContainText("5");
    await expect(week7).toContainText("9");
    await expect(page.getByRole("heading", { name: en ? "Insights" : "अन्तर्दृष्टि" })).toBeVisible();
    await expect(page.getByRole("heading", { name: en ? "Coming Up" : "आउँदै गरेका" })).toBeVisible();
    await expect(page.getByText("Hack Night").first()).toBeVisible();
    await page.waitForTimeout(1500); // the numbers count up and the cards fade in
    expect(await axeViolations(page)).toEqual([]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("the counters end on the true totals", async ({ page }) => {
  await overview(page, "en");
  await expect(page.getByText("Total Clubs", { exact: true }).locator("xpath=..")).toContainText("2", { timeout: 4000 });
  await expect(page.getByText("Total Events", { exact: true }).locator("xpath=..")).toContainText("2");
  await expect(page.getByText("Registered Students", { exact: true }).locator("xpath=..")).toContainText("3");
  await expect(page.getByText("Registrations", { exact: true }).locator("xpath=..")).toContainText("40");
});

test("a student waiting for approval is flagged first, and the banner goes to Users", async ({ page }) => {
  await overview(page, "en");
  const banner = page.getByRole("link", { name: "1 student is waiting for approval" });
  await expect(banner).toBeVisible();
  await banner.click();
  await expect(page).toHaveURL(/\/admin\/users/);
});

test("several waiting students use the plural; none shows no banner", async ({ page }) => {
  const mk = (i, status) => ({ _id: `u${i}`.padEnd(24, "0"), name: `Student ${i}`, email: `s${i}@x.np`, role: "user", approvalStatus: status, studentId: `P-${i}`, createdAt: new Date().toISOString() });
  await overview(page, "en", { users: [mk(1, "pending"), mk(2, "pending"), mk(3, "approved")] });
  await expect(page.getByText("2 students are waiting for approval")).toBeVisible();
  await page.unroute("**/api/admin/users");
  await page.route("**/api/admin/users", (route) => reply(route, { users: [mk(3, "approved")] }));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/waiting for approval/)).toHaveCount(0);
});

test("join requests waiting on an organiser are counted over upcoming events only", async ({ page }) => {
  await overview(page, "en", { events: [ev(1, "Hack Night", 5, { pendingCount: 2 }), ev(2, "Old Event", -5, { pendingCount: 7 })] });
  const banner = page.getByRole("link", { name: "2 requests to join events are waiting for a decision" });
  await expect(banner).toBeVisible();
  await banner.click();
  await expect(page).toHaveURL(/\/admin\/events/);
});

test("Coming Up lists the next events with their fill, and the quick links work", async ({ page }) => {
  await overview(page, "en", { events: [ev(1, "Later Fair", 9), ev(2, "Sooner Talk", 2), ev(3, "Past Thing", -3)] });
  const list = page.locator("div.card-surface", { has: page.getByRole("heading", { name: "Coming Up" }) }).getByRole("listitem");
  await expect(list).toHaveCount(2);
  await expect(list.first()).toContainText("Sooner Talk");
  await expect(list.first()).toContainText("20/50");
  await page.getByRole("link", { name: /Manage Clubs/ }).click();
  await expect(page).toHaveURL(/\/admin\/clubs/);
});

test("with no upcoming events it says so", async ({ page }) => {
  await overview(page, "en", { events: [ev(1, "Past Thing", -3)] });
  await expect(page.getByText("No upcoming events scheduled.")).toBeVisible();
});

test("the email warning appears for unconfigured and Gmail setups, not for Brevo", async ({ page }) => {
  await overview(page, "en", { health: { email: "not-configured" } });
  await expect(page.getByRole("status").filter({ hasText: "Email isn't set up" })).toBeVisible();
  await page.unroute("**/api/health");
  await page.route("**/api/health", (route) => reply(route, { email: "gmail-smtp" }));
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "Emails are sent through Gmail" })).toBeVisible();
  await page.unroute("**/api/health");
  await page.route("**/api/health", (route) => reply(route, { email: "brevo" }));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /Email|Emails/ })).toHaveCount(0);
});

test("Download full report saves a CSV of every event's attendance", async ({ page }) => {
  await overview(page, "en");
  await page.route("**/api/admin/attendance-report**", (route) => reply(route, report));
  await page.reload();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download full report (CSV)" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^attendance-report-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync(await download.path(), "utf8");
  expect(csv).toContain("Photo Walk");
  expect(csv).toContain("75");
});

test("if the weekly summary can't load, the rest of the overview still works", async ({ page }) => {
  const problems = await overview(page, "en", { weekReply: null });
  await expect(page.getByRole("heading", { level: 1, name: "Admin Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coming Up" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Last 7 days" })).toHaveCount(0);
  expect(quiet(problems)).toEqual([]);
});

test("a failed user list shows an error and keeps the page", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.route("**/api/admin/users", (route) => reply(route, { message: "Users unavailable" }, 500));
  await page.goto("/admin");
  await expect(page.getByRole("alert")).toContainText("Users unavailable");
  await expect(page.getByRole("heading", { name: "Coming Up" })).toBeVisible();
});
