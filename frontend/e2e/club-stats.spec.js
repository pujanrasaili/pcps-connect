import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// A club leader's "Stats" window on My Clubs: members, new joiners, events,
// turnout and ratings -- counts only.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|403|404|500)/.test(p));
const C = clubs[0];
const STATS = {
  members: 30, newMembers: { current: 6, previous: 4 }, upcomingEvents: 1, pastEvents: 2,
  attendance: { registered: 30, attended: 20, attendanceRate: 67, averageRating: 4.5, ratingCount: 4 },
  recent: [
    { _id: "e2".padEnd(24, "0"), title: "Recent Workshop", date: new Date(Date.now() - 3 * 864e5).toISOString(), registered: 20, attended: 15, attendanceRate: 75, averageRating: 4.5 },
    { _id: "e1".padEnd(24, "0"), title: "Older Meetup", date: new Date(Date.now() - 30 * 864e5).toISOString(), registered: 10, attended: 5, attendanceRate: 50, averageRating: null },
  ],
};

async function leader(page, lang, statsReply) {
  const problems = await setUp(page, { lang, role: "student" });
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [C] }));
  await page.route("**/api/admin/club-request-counts", (route) => reply(route, { counts: {} }));
  await page.route(`**/api/leader/clubs/${C._id}/stats`, statsReply || ((route) => reply(route, { stats: STATS })));
  await page.goto("/admin/my-clubs");
  return problems;
}

test("the Stats window shows members, joiners, events, turnout, rating and the latest events", async ({ page }) => {
  const problems = await leader(page, "en");
  await page.getByRole("button", { name: "Stats" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: `Stats — ${C.name}` })).toBeVisible();
  await expect(dialog.getByText("Joined in the last 30 days")).toBeVisible();
  await expect(dialog.getByText("2 more than the 30 days before")).toBeVisible();
  await expect(dialog.getByText("67%")).toBeVisible();
  await expect(dialog.getByText("20 of 30 registered students showed up")).toBeVisible();
  await expect(dialog.getByText("4.5 / 5")).toBeVisible();
  await expect(dialog.getByText("Recent Workshop")).toBeVisible();
  await expect(dialog.getByText(/50% · 5\/10/)).toBeVisible();
  expect(quiet(problems)).toEqual([]);
});

test("a brand-new club shows dashes and friendly notes, not NaN or 0%", async ({ page }) => {
  await leader(page, "en", (route) => reply(route, { stats: { members: 0, newMembers: { current: 0, previous: 0 }, upcomingEvents: 0, pastEvents: 0, attendance: { registered: 0, attended: 0, attendanceRate: null, averageRating: null, ratingCount: 0 }, recent: [] } }));
  await page.getByRole("button", { name: "Stats" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("same as the 30 days before")).toBeVisible();
  await expect(dialog.getByText("No ratings yet")).toBeVisible();
  await expect(dialog.getByText("—").first()).toBeVisible();
  await expect(dialog.getByText("NaN")).toHaveCount(0);
  await expect(dialog.getByText("Latest events")).toHaveCount(0);
});

test("fewer joiners than before says so", async ({ page }) => {
  await leader(page, "en", (route) => reply(route, { stats: { ...STATS, newMembers: { current: 1, previous: 4 } } }));
  await page.getByRole("button", { name: "Stats" }).click();
  await expect(page.getByRole("dialog").getByText("3 fewer than the 30 days before")).toBeVisible();
});

test("if the stats can't load, the window says so", async ({ page }) => {
  await leader(page, "en", (route) => reply(route, { message: "boom" }, 500));
  await page.getByRole("button", { name: "Stats" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
});

test("Nepali: the Stats window is translated and accessible", async ({ page }) => {
  await leader(page, "ne");
  await page.getByRole("button", { name: "तथ्यांक" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("पछिल्ला 30 दिनमा सामेल भएका")).toBeVisible();
  await expect(dialog.getByText("दर्ता भएका 30 मध्ये 20 विद्यार्थी आए")).toBeVisible();
  await page.waitForTimeout(500);
  expect(await axeViolations(page)).toEqual([]);
});
