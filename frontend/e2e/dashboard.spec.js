import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { setUp, clubs, student, axeViolations } from "./helpers.js";

// The student's Dashboard: first-time checklist, stat tiles, registrations with
// unregister / withdraw, rate-your-event nudge, "from your clubs", saved events, calendar file.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const DAY = 864e5;
const quiet = (problems) => problems.filter((p) => !/status of (401|500)/.test(p));
const ev = (n, title, offsetDays, extra = {}) => ({ _id: `d${n}`.padEnd(24, "0"), title, description: "x", date: new Date(Date.now() + offsetDays * DAY).toISOString(), location: "Main Hall", capacity: 50, registeredCount: 10, category: "Workshop", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0, ...extra });
const reg = (n, event, extra = {}) => ({ _id: `r${n}`.padEnd(24, "0"), status: "confirmed", attended: false, createdAt: new Date().toISOString(), event, ...extra });

async function load(page, { lang = "en", registrations = [], events = [], memberships = [], favoriteClub, led = [], failRegs = false, volunteering = [] } = {}) {
  const problems = await setUp(page, { lang, role: "student" });
  const calls = [];
  let regs = registrations;
  await page.route("**/api/auth/me", (route) => reply(route, { user: { ...student, language: lang, favoriteClub } }));
  await page.route("**/api/events", (route) => reply(route, { events }));
  await page.route("**/api/club-memberships/my", (route) => reply(route, { memberships }));
  await page.route("**/api/events/volunteering/mine", (route) => reply(route, { volunteering }));
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: led }));
  await page.route("**/api/registrations/my", (route) => (failRegs ? reply(route, { message: "down" }, 500) : reply(route, { registrations: regs })));
  await page.route(/\/api\/registrations\/r[^/]+$/, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    calls.push(`delete ${id}`);
    regs = regs.filter((r) => r._id !== id);
    return reply(route, { message: "ok" });
  });
  return { problems, calls };
}

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`a brand-new student sees the Get started checklist and empty stats (${lang})`, async ({ page }) => {
    const { problems } = await load(page, { lang });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: en ? "Welcome back, Asha" : "फेरि स्वागत छ, Asha" })).toBeVisible();
    await expect(page.getByRole("heading", { name: en ? "Get started" : "सुरु गरौं" })).toBeVisible();
    await expect(page.getByText(en ? "0 of 3 done" : "3 मध्ये 0 सकियो")).toBeVisible();
    await expect(page.getByText(en ? "No upcoming registrations yet. Browse events to find something you like." : "अहिलेसम्म कुनै आगामी दर्ता छैन। कार्यक्रमहरू हेरेर मन पर्ने खोज्नुहोस्।")).toBeVisible();
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("with a club joined and an event registered, the checklist counts them and goes away when the essentials are done", async ({ page }) => {
  const e1 = ev(1, "Hack Night", 4);
  await load(page, { registrations: [reg(1, e1)], events: [e1], memberships: [{ club: clubs[0], role: "member" }] });
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Unregister from Hack Night" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Welcome back, Asha" })).toBeVisible();
  // Join + register are done; the favourite is optional, so the card is gone.
  await expect(page.getByRole("heading", { name: "Get started" })).toHaveCount(0);
});

test("the stat tiles count registered, attended and upcoming, and show the favourite club", async ({ page }) => {
  const upcoming = ev(1, "Hack Night", 4);
  const past = ev(2, "Old Workshop", -6);
  await load(page, { registrations: [reg(1, upcoming), reg(2, past, { attended: true, rating: 5 })], events: [upcoming, past], favoriteClub: clubs[1]._id });
  await page.goto("/dashboard");
  // Each tile is the number on top of its label; the number counts up, so these retry.
  const value = (label) => page.getByText(label, { exact: true }).first().locator("xpath=preceding-sibling::p[1]");
  await expect(value("Registered Events")).toHaveText("2");
  await expect(value("Attended Events")).toHaveText("1");
  await expect(value("Upcoming Registrations")).toHaveText("1");
  await expect(value("Favorite Club")).toHaveText("Robotics Society");
});

test("unregistering from an upcoming event removes it from the list", async ({ page }) => {
  const e1 = ev(1, "Hack Night", 4);
  const e2 = ev(2, "Robot Demo", 8);
  const { calls, problems } = await load(page, { registrations: [reg(1, e1), reg(2, e2)], events: [e1, e2] });
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Unregister from Hack Night" })).toBeVisible();
  await page.getByRole("button", { name: "Unregister from Hack Night" }).click();
  await expect(page.getByText("Unregistered from event.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unregister from Hack Night" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Unregister from Robot Demo" })).toBeVisible();
  expect(calls).toEqual(["delete " + "r1".padEnd(24, "0")]);
  expect(quiet(problems)).toEqual([]);
});

test("a request waiting for approval says so and can be withdrawn", async ({ page }) => {
  const e1 = ev(1, "Invite-only Dinner", 6);
  const { calls } = await load(page, { registrations: [reg(1, e1, { status: "pending" })], events: [e1] });
  await page.goto("/dashboard");
  await expect(page.getByText("Pending approval")).toBeVisible();
  // Not confirmed yet, so no calendar file or ticket link for it.
  await expect(page.getByRole("button", { name: "Add all to calendar" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /My tickets/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Unregister from Invite-only Dinner" }).click();
  await expect(page.getByText("Request withdrawn.")).toBeVisible();
  expect(calls).toHaveLength(1);
});

test("Add all to calendar downloads one file with every confirmed upcoming event", async ({ page }) => {
  const e1 = ev(1, "Hack Night", 4);
  const e2 = ev(2, "Robot Demo", 8);
  await load(page, { registrations: [reg(1, e1), reg(2, e2)], events: [e1, e2] });
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "My tickets (work offline)" })).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Add all to calendar" }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  const ics = readFileSync(await download.path(), "utf8");
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  expect(ics).toContain("Hack Night");
  expect(ics).toContain("Robot Demo");
});

test("events attended but not rated are nudged, with a certificate link and a Rate link", async ({ page }) => {
  const past = ev(1, "Old Workshop", -6);
  await load(page, { registrations: [reg(1, past, { attended: true })], events: [past] });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "How were the events you attended?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Certificate for Old Workshop" })).toHaveAttribute("href", /\/certificate\/r1/);
  await page.getByRole("link", { name: "Rate", exact: true }).click();
  await expect(page).toHaveURL(/\/profile/);
});

test("once an attended event is rated, the nudge disappears", async ({ page }) => {
  const past = ev(1, "Old Workshop", -6);
  await load(page, { registrations: [reg(1, past, { attended: true, rating: 4 })], events: [past] });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Welcome back, Asha" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upcoming Registrations" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Certificate for Old Workshop" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "How were the events you attended?" })).toHaveCount(0);
});

test("'From your clubs' lists upcoming events of joined clubs not yet registered, and marks full ones", async ({ page }) => {
  const open = ev(1, "Coding Jam", 3);
  const full = ev(2, "Packed Hack", 5, { capacity: 10, registeredCount: 10 });
  const other = ev(3, "Robotics Meet", 4, { club: clubs[1] });
  const mine = ev(4, "Already Going", 6);
  await load(page, { registrations: [reg(1, mine)], events: [open, full, other, mine], memberships: [{ club: clubs[0], role: "member" }] });
  await page.goto("/dashboard");
  const card = page.locator("div.card-surface", { has: page.getByRole("heading", { name: "From your clubs" }) });
  await expect(card.getByText("Coding Jam")).toBeVisible();
  await expect(card.getByText("Packed Hack")).toBeVisible();
  await expect(card.getByText("Full · join waitlist")).toHaveCount(1);
  await expect(card.getByText("Robotics Meet")).toHaveCount(0);
  await expect(card.getByText("Already Going")).toHaveCount(0);
});

test("saved events show up, newest first, and a long list links to all of them", async ({ page }) => {
  const list = [1, 2, 3, 4].map((n) => ev(n, `Saved Event ${n}`, n + 1));
  await page.addInitScript((ids) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("pcps.savedEvents", JSON.stringify(ids)); sessionStorage.setItem("seeded", "1"); } }, list.map((e) => e._id));
  await load(page, { events: list });
  await page.goto("/dashboard");
  const card = page.locator("div.card-surface", { has: page.getByRole("heading", { name: "Saved for later" }) });
  await expect(card.getByRole("link", { name: /Saved Event/ })).toHaveCount(3);
  await page.getByRole("link", { name: "See all 4 saved events" }).click();
  await expect(page).toHaveURL(/\/events\?when=saved/);
});

test("a leader sees the You lead banner with a link to manage events", async ({ page }) => {
  await load(page, { led: [clubs[0]] });
  await page.goto("/dashboard");
  await expect(page.getByText("Coding Club", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Manage events/ })).toBeVisible();
});

test("if registrations can't be loaded, the page says the numbers may be incomplete and Try again reloads", async ({ page }) => {
  const e1 = ev(1, "Hack Night", 4);
  await load(page, { failRegs: true, events: [e1] });
  await page.goto("/dashboard");
  await expect(page.getByRole("alert")).toContainText("Couldn't load your registrations.");
  await expect(page.getByRole("alert")).toContainText("The numbers below may be incomplete.");
  await page.unroute("**/api/registrations/my");
  await page.route("**/api/registrations/my", (route) => reply(route, { registrations: [reg(1, e1)] }));
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Unregister from Hack Night" })).toBeVisible();
});

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`the Dashboard lists the events I signed up to help at, with my role (${lang})`, async ({ page }) => {
    const e1 = ev(1, "Open Mic", 5);
    const { problems } = await load(page, { lang, volunteering: [{ event: { _id: e1._id, title: e1.title, date: e1.date, location: "Main Hall" }, role: "Registration desk" }] });
    await page.goto("/dashboard");
    const card = page.locator("div.card-surface", { has: page.getByRole("heading", { name: en ? "You're helping at" : "तपाईं सहयोग गर्दै हुनुभएको कार्यक्रम" }) });
    await expect(card.getByRole("link", { name: /Open Mic/ })).toHaveAttribute("href", `/events/${e1._id}`);
    await expect(card.getByText("Registration desk")).toBeVisible();
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("with no volunteer sign-ups, or a failed request, the Dashboard has no helping card", async ({ page }) => {
  await load(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back, Asha" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You're helping at" })).toHaveCount(0);
  await page.route("**/api/events/volunteering/mine", (route) => reply(route, { message: "down" }, 500));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back, Asha" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You're helping at" })).toHaveCount(0);
});

test("the helping card passes the accessibility checks in dark mode", async ({ page }) => {
  const e1 = ev(1, "Open Mic", 5);
  await load(page, { volunteering: [{ event: { _id: e1._id, title: e1.title, date: e1.date, location: "Main Hall" }, role: "Registration desk" }] });
  await page.addInitScript(() => localStorage.setItem("pcps_theme", "dark"));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "You're helping at" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
});
