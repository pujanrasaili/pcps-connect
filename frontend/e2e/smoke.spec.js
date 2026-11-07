import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const DAY = 864e5;
const club = (i, name) => ({ _id: `c${i}`.padEnd(24, "0"), name, category: "Technology", description: `A club for ${name}`, memberCount: 12 + i, leaders: [] });
const clubs = [club(1, "Coding Club"), club(2, "Robotics Society")];
const ev = (i, title, offset) => ({
  _id: `e${i}`.padEnd(24, "0"), title, description: "An event used by the browser tests.", date: new Date(Date.now() + offset * DAY).toISOString(),
  location: "Main Hall", capacity: 50, registeredCount: 20, category: "Workshop", price: "Free", club: clubs[i % 2], averageRating: 0, ratingCount: 0,
});
const events = [ev(1, "Hack Night with a really long event title that must wrap on phones", 5), ev(2, "Robot Demo", 9), ev(3, "Photo Walk", -10)];
const student = { id: "u1", _id: "u1", name: "Asha", email: "asha@patancollege.edu.np", role: "user", approvalStatus: "approved", emailVerified: true };
const news = [{ _id: "p1", body: "Hack night moved to Friday! Bring a laptop.", club: { _id: clubs[0]._id, name: "Coding Club" }, createdAt: new Date().toISOString() }];

// What the mocked API answers (anything unlisted gets an empty object).
function answer(path, loggedIn) {
  if (path.endsWith("/auth/me")) return loggedIn ? { status: 200, body: { user: student } } : { status: 401, body: { message: "Not logged in" } };
  if (path.endsWith("/club-memberships/news")) return { body: { posts: news } };
  if (path.endsWith("/clubs")) return { body: { clubs } };
  if (path.endsWith("/events")) return { body: { events } };
  if (path.includes("club-memberships")) return { body: { memberships: [] } };
  if (path.includes("registrations/my")) return { body: { registrations: [] } };
  if (path.includes("/notifications")) return { body: { notifications: [], unreadCount: 0 } };
  if (path.includes("/notice")) return { body: { notice: null } };
  if (path.endsWith("/stats")) return { body: { totalStudents: 10, totalClubs: 2, totalEvents: 3, totalRegistrations: 40 } };
  return { body: {} };
}

async function setUp(page, { lang, loggedIn = false }) {
  await page.route(/googleapis|gstatic|youtube|google\.com/, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "" }));
  await page.route("**/api/**", (route) => {
    const { status = 200, body } = answer(new URL(route.request().url()).pathname, loggedIn);
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.addInitScript((l) => localStorage.setItem("pcps_lang", l), lang);
  const problems = [];
  page.on("pageerror", (err) => problems.push(`page error: ${err.message}`));
  page.on("console", (msg) => {
    // A logged-out visitor's "who am I?" check is answered 401 on purpose; the browser logs that.
    if (msg.type() === "error" && !msg.text().includes("status of 401")) problems.push(`console error: ${msg.text()}`);
  });
  return problems;
}

async function axeViolations(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "best-practice"] });
    return result.violations.map((v) => `${v.id}: ${v.nodes[0].target.join(" ")}`);
  });
}

const PUBLIC_PAGES = ["/", "/events", "/clubs", "/help", "/login", "/contact", "/terms", "/privacy"];

for (const lang of ["en", "ne"]) {
  for (const path of PUBLIC_PAGES) {
    test(`${path} (${lang}) loads cleanly, fits a phone and passes the accessibility checks`, async ({ page }) => {
      const problems = await setUp(page, { lang });
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(await page.locator("html").getAttribute("lang")).toBe(lang);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scrolling").toBe(true);
      expect(await axeViolations(page)).toEqual([]);
      expect(problems).toEqual([]);
    });
  }

  test(`the Dashboard (${lang}) shows news from the student's clubs`, async ({ page }) => {
    const problems = await setUp(page, { lang, loggedIn: true });
    await page.goto("/dashboard");
    await expect(page.getByText(lang === "ne" ? "तपाईंका क्लबहरूबाट समाचार" : "News from your clubs")).toBeVisible();
    await expect(page.getByText("Hack night moved to Friday!")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await axeViolations(page)).toEqual([]);
    expect(problems).toEqual([]);
  });
}
