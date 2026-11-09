import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// The public front door (Home) and the two policy pages linked from the footer.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const DAY = 864e5;
const section = (page, name) => page.locator("section", { has: page.getByRole("heading", { level: 2, name }) });
const manyClubs = [1, 2, 3, 4, 5].map((n) => ({ ...clubs[0], _id: `h${n}`.padEnd(24, "0"), name: `Featured Club ${n}`, memberCount: n }));
const ev = (n, title, offset) => ({ _id: `v${n}`.padEnd(24, "0"), title, description: "x", date: new Date(Date.now() + offset * DAY).toISOString(), location: "Main Hall", capacity: 50, registeredCount: 5, category: "Workshop", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0 });

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`Home shows the sections and passes the accessibility checks (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: en ? "Featured Clubs" : "विशेष क्लबहरू" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: en ? "Upcoming Events" : "आगामी कार्यक्रमहरू" })).toBeVisible();
    await page.waitForTimeout(1200); // sections fade in as they scroll into view
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("Featured Clubs shows three clubs; View opens a club summary that leads to all clubs", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route("**/api/clubs", (route) => reply(route, { clubs: manyClubs }));
  await page.goto("/");
  const featured = section(page, "Featured Clubs");
  await expect(featured.getByRole("heading", { level: 3 })).toHaveCount(3);
  await expect(featured.getByText("Featured Club 4")).toHaveCount(0);
  await featured.getByRole("button", { name: /^View/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Featured Club 1" })).toBeVisible();
  await dialog.getByRole("link", { name: "See all clubs" }).click();
  await expect(page).toHaveURL(/\/clubs$/);
});

test("Upcoming Events lists only the three soonest upcoming events", async ({ page }) => {
  await setUp(page, { lang: "en" });
  const list = [ev(1, "Later Event", 20), ev(2, "Soonest Event", 2), ev(3, "Past Event", -4), ev(4, "Second Event", 6), ev(5, "Third Event", 9), ev(6, "Fourth Event", 12)];
  await page.route("**/api/events", (route) => reply(route, { events: list }));
  await page.goto("/");
  const upcoming = section(page, "Upcoming Events");
  await expect(upcoming.getByRole("heading", { level: 3 })).toHaveText(["Soonest Event", "Second Event", "Third Event"]);
  await upcoming.getByRole("link", { name: "View all events" }).click();
  await expect(page).toHaveURL(/\/events$/);
});

test("the hero buttons go to Clubs and Events", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await page.getByRole("link", { name: "Explore Clubs" }).click();
  await expect(page).toHaveURL(/\/clubs/);
  await page.goBack();
  await page.getByRole("link", { name: "Browse Events" }).click();
  await expect(page).toHaveURL(/\/events/);
});

test("the campus reel opens in a video player that Escape closes", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await page.getByRole("button", { name: /Watch the full PCPS campus reel/ }).click();
  const player = page.getByRole("dialog", { name: "Video player" });
  await expect(player).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(player).toHaveCount(0);
  await page.getByRole("button", { name: /Watch the full PCPS campus reel/ }).click();
  await page.getByRole("button", { name: "Close video" }).click();
  await expect(page.getByRole("dialog", { name: "Video player" })).toHaveCount(0);
});

test("the call-to-action invites a visitor to create an account", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await page.getByRole("link", { name: "Create your account" }).click();
  await expect(page).toHaveURL(/\/register/);
});

for (const [path, title, sections] of [
  ["/privacy", "Privacy Policy", 8],
  ["/terms", "Terms of Use", 8],
]) {
  test(`${title}: ${sections} numbered sections, readable, accessible`, async ({ page }) => {
    const problems = await setUp(page, { lang: "en" });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/^Last updated:/)).toBeVisible();
    await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveCount(sections);
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("the footer links reach the Privacy and Terms pages", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy/);
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms of Use" }).click();
  await expect(page).toHaveURL(/\/terms/);
});

test("the policies point people to Settings (their data) and Contact (questions)", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.goto("/privacy");
  await page.getByRole("main").getByRole("link", { name: /Settings/ }).click();
  await expect(page).toHaveURL(/\/settings/);
  await page.goto("/privacy");
  await page.getByRole("main").getByRole("link", { name: /contact/i }).first().click();
  await expect(page).toHaveURL(/\/contact/);
  await page.goto("/terms");
  await page.getByRole("main").getByRole("link", { name: /contact/i }).click();
  await expect(page).toHaveURL(/\/contact/);
});

for (const [path, title] of [
  ["/privacy", "गोपनीयता नीति"],
  ["/terms", "प्रयोगका सर्तहरू"],
]) {
  test(`${title} (Nepali): 8 sections, English-is-official note, working links, accessible`, async ({ page }) => {
    const problems = await setUp(page, { lang: "ne", role: "student" });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("अन्तिम अद्यावधिक:")).toBeVisible();
    await expect(page.getByText("फरक परे अंग्रेजी संस्करण नै मान्य हुनेछ")).toBeVisible();
    await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveCount(8);
    await expect(page.getByRole("main").getByRole("link", { name: "सम्पर्क पेज" }).first()).toHaveAttribute("href", "/contact");
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("the Nepali Privacy Policy links to Settings", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "student" });
  await page.goto("/privacy");
  await page.getByRole("main").getByRole("link", { name: "सेटिङ पेज" }).click();
  await expect(page).toHaveURL(/\/settings/);
});
