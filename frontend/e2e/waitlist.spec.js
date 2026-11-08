import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// A full event: the student joins the waitlist, sees their place, leaves; and
// the Dashboard card shows where they stand on every waitlist.
const ID = "f1".padEnd(24, "0");
const DAY = 864e5;
const full = (extra = {}) => ({
  _id: ID, title: "Packed Workshop", description: "Every seat is taken.", date: new Date(Date.now() + 6 * DAY).toISOString(),
  location: "Main Hall", capacity: 30, registeredCount: 30, category: "Workshop", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0, ...extra,
});
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|409)/.test(p));

async function withWaitlist(page, { event = full(), start = { onWaitlist: false }, joinStatus = 201 } = {}) {
  let state = start;
  const calls = [];
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event }));
  await page.route(`**/api/waitlist/${ID}`, (route) => {
    const method = route.request().method();
    if (method === "GET") return reply(route, state);
    if (method === "POST") {
      calls.push("join");
      if (joinStatus !== 201) return reply(route, { message: "Waitlist is closed" }, joinStatus);
      state = { onWaitlist: true, position: 3 };
      return reply(route, { position: 3 }, 201);
    }
    calls.push("leave");
    state = { onWaitlist: false };
    return reply(route, { message: "left" });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`joining and leaving the waitlist of a full event (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    const calls = await withWaitlist(page);
    await page.goto(`/events/${ID}`);
    await expect(page.getByText(en ? "This event is full." : "यो कार्यक्रम भरिएको छ।")).toBeVisible();
    await expect(page.getByRole("button", { name: en ? "Register now" : /अहिले दर्ता/ })).toHaveCount(0);
    await page.getByRole("button", { name: en ? "Join the waitlist" : "प्रतीक्षा सूचीमा सामेल हुनुहोस्" }).click();
    await expect(page.getByText(en ? "You're #3 on the waitlist. We'll register you and email you if a spot opens." : "तपाईं प्रतीक्षा सूचीमा #3 मा हुनुहुन्छ। सिट खाली भएमा हामी तपाईंलाई दर्ता गरी इमेल गर्नेछौं।")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole("button", { name: en ? "Leave waitlist" : "प्रतीक्षा सूची छोड्नुहोस्" }).click();
    await expect(page.getByRole("button", { name: en ? "Join the waitlist" : "प्रतीक्षा सूचीमा सामेल हुनुहोस्" })).toBeVisible();
    expect(calls).toEqual(["join", "leave"]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("coming back to an event you're already queued for shows your place", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withWaitlist(page, { start: { onWaitlist: true, position: 2 } });
  await page.goto(`/events/${ID}`);
  await expect(page.getByText("You're #2 on the waitlist.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join the waitlist" })).toHaveCount(0);
});

test("a refused join says why and leaves the student off the list", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await withWaitlist(page, { joinStatus: 400 });
  await page.goto(`/events/${ID}`);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByText("Waitlist is closed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join the waitlist" })).toBeEnabled();
  expect(quiet(problems)).toEqual([]);
});

test("a visitor who isn't logged in sees the event as full, with no waitlist button", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await withWaitlist(page);
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Registration full" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Join the waitlist" })).toHaveCount(0);
});

test("a full event that has already happened offers no waitlist", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withWaitlist(page, { event: full({ date: new Date(Date.now() - 4 * DAY).toISOString() }) });
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Event has ended" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Join the waitlist" })).toHaveCount(0);
});

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`the Dashboard card lists each waitlist with the student's place (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    const item = (n, title, position) => ({ position, event: { _id: `w${n}`.padEnd(24, "0"), title, date: new Date(Date.now() + n * DAY).toISOString(), location: "Hall" } });
    await page.route("**/api/waitlist/my", (route) => reply(route, { waitlist: [item(2, "Packed Workshop", 1), item(4, "Sold Out Talk", 5)] }));
    await page.goto("/dashboard");
    const card = page.locator("div.card-surface", { has: page.getByRole("heading", { name: en ? "On the waitlist" : "प्रतीक्षा सूचीमा" }) });
    await expect(card.getByText("Packed Workshop")).toBeVisible();
    await expect(card.getByText(en ? "Next in line" : "अर्को पालो")).toBeVisible();
    await expect(card.getByText(en ? "5 in line" : "लाइनमा 5 नम्बरमा")).toBeVisible();
    await card.getByRole("link", { name: /Sold Out Talk/ }).click();
    await expect(page).toHaveURL(/\/events\/w4/);
    expect(quiet(problems)).toEqual([]);
  });
}

test("the Dashboard shows no waitlist card when the student is on none", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/waitlist/my", (route) => reply(route, { waitlist: [] }));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "On the waitlist" })).toHaveCount(0);
});
