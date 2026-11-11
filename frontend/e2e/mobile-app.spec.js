import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The phone version works like an app: a bottom tab bar, pop-ups that slide up
// from the bottom as a sheet, and a short footer. Bigger screens keep the web layout.
const noLed = (page) => page.route("**/api/leader/clubs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clubs: [] }) }));
const tabs = (page) => page.getByRole("navigation", { name: "Quick menu" });

test("logged-out visitors get Home, Events, Clubs, Contact and Log in tabs", async ({ page }) => {
  const problems = await setUp(page, { lang: "en" });
  await page.goto("/");
  await expect(tabs(page)).toBeVisible();
  await expect(tabs(page).getByRole("link")).toHaveText(["Home", "Events", "Clubs", "Contact", "Log in"]);
  expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
});

test("a student gets Notice board and Dashboard tabs, and the current page's tab is lit", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await noLed(page);
  await page.goto("/events");
  await expect(tabs(page).getByRole("link")).toHaveText(["Home", "Events", "Clubs", "Notice board", "Dashboard"]);
  await expect(tabs(page).getByRole("link", { name: "Events" })).toHaveAttribute("aria-current", "page");
  await tabs(page).getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // Profile and Settings belong under the Dashboard tab, so it stays lit there.
  await page.goto("/settings");
  await expect(tabs(page).getByRole("link", { name: "Dashboard" })).toHaveClass(/text-primary-600/);
});

test("an admin gets a Manage tab that stays lit across the admin pages", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.goto("/admin/events");
  await expect(tabs(page).getByRole("link", { name: "Manage" })).toHaveClass(/text-primary-600/);
});

test("the tab bar is in Nepali when the language is Nepali", async ({ page }) => {
  await setUp(page, { lang: "ne" });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "छिटो मेनु" })).toBeVisible();
});

test("the tab bar hides while the keyboard is in use and on big screens", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/events");
  await expect(tabs(page)).toBeVisible();
  await page.getByPlaceholder(/Search by name/).focus();
  await expect(tabs(page)).toBeHidden();
  await page.getByPlaceholder(/Search by name/).blur();
  await expect(tabs(page)).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(tabs(page)).toBeHidden();
});

test("a pop-up is a bottom sheet on a phone and a centred window on a computer", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/clubs");
  await page.getByRole("button", { name: "View" }).first().click();
  const sheet = page.getByRole("dialog").locator("[tabindex='-1']");
  await expect(sheet).toBeVisible();
  await expect.poll(async () => {
    const box = await sheet.boundingBox();
    return Math.round(box.y + box.height);
  }, "sits on the bottom edge").toBe(844);
  expect(await axeViolations(page)).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(async () => {
    const box = await sheet.boundingBox();
    return box.y > 20 && box.y + box.height < 880;
  }, "floats in the middle").toBe(true);
});

test("the footer is short on a phone but still has the help, contact and policy links", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const name of ["Help & FAQ", "Contact", "Terms of Use", "Privacy Policy"]) await expect(footer.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(footer.getByRole("heading", { name: "Quick Links" })).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(footer.getByRole("heading", { name: "Quick Links" })).toBeVisible();
});

test("the search window opens as a full bottom sheet, not squashed into the top bar", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await page.getByRole("button", { name: /search/i }).first().click();
  const sheet = page.getByRole("dialog").locator("[tabindex='-1']");
  await expect(sheet).toBeVisible();
  await expect.poll(async () => {
    const box = await sheet.boundingBox();
    return box.y >= 0 && Math.round(box.y + box.height) === 844;
  }).toBe(true);
});

// The Register button is pinned above the tab bar on a phone, because the real
// one sits far down the event page.
const EVENT_ID = "e90000000000000000000000";
const eventBody = (over = {}) => ({ event: { _id: EVENT_ID, title: "Robot Demo", description: "Watch robots race.", date: new Date(Date.now() + 9 * 864e5).toISOString(), location: "Main Hall", capacity: 50, registeredCount: 20, category: "Workshop", price: "Free", club: { _id: "c1".padEnd(24, "0"), name: "Robotics Society" }, ...over } });
const openEvent = async (page, role, over) => {
  await setUp(page, { lang: "en", role });
  await noLed(page);
  await page.route(`**/api/events/${EVENT_ID}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(eventBody(over)) }));
  await page.goto(`/events/${EVENT_ID}`);
  await expect(page.getByRole("heading", { name: "Robot Demo", level: 1 })).toBeVisible();
};
const pinned = (page) => page.locator("div[aria-hidden='true'].fixed button, div[aria-hidden='true'].fixed a");

test("a student sees a pinned Register button that opens the sign-up form", async ({ page }) => {
  await openEvent(page, "student");
  await expect(pinned(page)).toBeVisible();
  await expect(pinned(page)).toHaveText("Register now");
  await pinned(page).click();
  await expect(page.getByRole("dialog", { name: "Register for this event" })).toBeVisible();
});

test("a visitor who is not logged in gets a pinned Log in to register link", async ({ page }) => {
  await openEvent(page, undefined);
  await expect(pinned(page)).toHaveText("Log in to register");
});

test("the pinned button is not shown for a full or finished event, or on a computer", async ({ page }) => {
  await openEvent(page, "student", { registeredCount: 50 });
  await expect(pinned(page)).toHaveCount(0);
  await page.unroute(`**/api/events/${EVENT_ID}`);
  await page.route(`**/api/events/${EVENT_ID}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(eventBody({ date: new Date(Date.now() - 3 * 864e5).toISOString() })) }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Robot Demo", level: 1 })).toBeVisible();
  await expect(pinned(page)).toHaveCount(0);
  await page.unroute(`**/api/events/${EVENT_ID}`);
  await page.route(`**/api/events/${EVENT_ID}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(eventBody()) }));
  await page.reload();
  await expect(pinned(page)).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(pinned(page)).toBeHidden();
});

test("the dashboard and admin menus are one swipeable row, opened on the current page", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await noLed(page);
  await page.goto("/settings");
  const menu = page.getByRole("navigation", { name: "Dashboard menu" });
  await expect(menu).toBeVisible();
  const rows = await menu.getByRole("link").evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size);
  expect(rows, "all the buttons sit on one line").toBe(1);
  // Settings is the last button, so the row has scrolled to bring it into view.
  await expect(menu.getByRole("link", { name: "Settings" })).toBeInViewport();
});

test("the admin menu opens scrolled to the current page", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.goto("/admin/activity");
  const menu = page.getByRole("navigation", { name: "Admin menu" });
  await expect(menu.getByRole("link", { name: "Activity" })).toBeInViewport();
  const rows = await menu.getByRole("link").evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size);
  expect(rows).toBe(1);
});
