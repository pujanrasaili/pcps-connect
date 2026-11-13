import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The bell in the top bar: unread badge, opening marks everything as seen,
// the newly-arrived ones stay highlighted until it closes, links go to the event.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const minutesAgo = (n) => new Date(Date.now() - n * 60000).toISOString();
const note = (n, title, read, link) => ({ _id: `n${n}`.padEnd(24, "0"), title, read, link, createdAt: minutesAgo(n * 5) });

async function withBell(page, list) {
  let items = list;
  let readAll = 0;
  await page.route("**/api/notifications", (route) => reply(route, { notifications: items, unreadCount: items.filter((n) => !n.read).length }));
  await page.route("**/api/notifications/read-all", (route) => {
    readAll += 1;
    items = items.map((n) => ({ ...n, read: true }));
    return reply(route, { message: "ok" });
  });
  return () => readAll;
}
const bell = (page, name, main = "Main") => page.getByRole("navigation", { name: main }).getByRole("button", { name });

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`the bell shows how many are unread, and opening it marks them seen (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    const readAlls = await withBell(page, [
      note(1, "You got a seat: Hack Night", false, "/events/e1"),
      note(2, "Welcome to PCPS Connect", false),
      note(3, "You got a seat: Old Workshop", true, "/events/e0"),
    ]);
    await page.goto("/");
    const closed = bell(page, en ? "Notifications, 2 unread" : "सूचनाहरू, 2 नपढिएका", en ? "Main" : "मुख्य");
    await expect(closed).toBeVisible();
    await expect(closed).toContainText("2");
    await closed.click();
    const panel = page.getByRole("region", { name: en ? "Notifications" : "सूचनाहरू" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(en ? "You got a seat: Hack Night" : "तपाईंले सिट पाउनुभयो: Hack Night")).toBeVisible();
    // The two that were new are marked "New"; the one already read is not.
    await expect(panel.getByText(en ? "New" : "नयाँ", { exact: true })).toHaveCount(2);
    // The badge is gone because everything is now seen.
    await expect(page.getByRole("button", { name: en ? "Notifications" : "सूचनाहरू", exact: true })).toBeVisible();
    expect(readAlls()).toBe(1);
    await page.waitForTimeout(600); // the panel fades in
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("a notification with a link opens that page and closes the panel", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withBell(page, [note(1, "You got a seat: Hack Night", false, "/events/e1"), note(2, "Welcome to PCPS Connect", true)]);
  await page.goto("/");
  await bell(page, /^Notifications/).click();
  const link = page.getByRole("link", { name: /You got a seat: Hack Night/ });
  // Check where the link goes, then follow it: this mock has no event e1, so the page would
  // bounce to "not found" and race with a URL check on a slow machine.
  await expect(link).toHaveAttribute("href", "/events/e1");
  await link.click();
  await expect(page.getByRole("region", { name: "Notifications" })).toHaveCount(0);
});

test("a notification with no link is plain text, not a link", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withBell(page, [note(2, "Welcome to PCPS Connect", true)]);
  await page.goto("/");
  await bell(page, /^Notifications/).click();
  const panel = page.getByRole("region", { name: "Notifications" });
  await expect(panel.getByText("Welcome to PCPS Connect")).toBeVisible();
  await expect(panel.getByRole("link")).toHaveCount(0);
});

test("with nothing yet, the panel explains what will appear and nothing is marked", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const readAlls = await withBell(page, []);
  await page.goto("/");
  await bell(page, "Notifications").click();
  await expect(page.getByText("Nothing yet. You'll see waitlist spots, join decisions and event changes here.")).toBeVisible();
  expect(readAlls()).toBe(0);
});

test("Escape closes the panel and puts focus back on the bell; a click elsewhere closes it too", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withBell(page, [note(2, "Welcome to PCPS Connect", true)]);
  await page.goto("/");
  const b = bell(page, "Notifications");
  await b.click();
  await expect(b).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Notifications" })).toHaveCount(0);
  await expect(b).toBeFocused();
  await b.click();
  await page.mouse.click(195, 800); // outside the panel
  await expect(page.getByRole("region", { name: "Notifications" })).toHaveCount(0);
});

test("the second time the panel is opened, nothing is highlighted as new", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withBell(page, [note(1, "You got a seat: Hack Night", false, "/events/e1")]);
  await page.goto("/");
  await bell(page, /^Notifications/).click();
  await expect(page.getByRole("region", { name: "Notifications" }).getByText("New", { exact: true })).toHaveCount(1);
  await page.keyboard.press("Escape");
  await bell(page, "Notifications").click();
  await expect(page.getByRole("region", { name: "Notifications" }).getByText("New", { exact: true })).toHaveCount(0);
});

test("a visitor who isn't logged in has no bell", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(bell(page, /^Notifications/)).toHaveCount(0);
});
