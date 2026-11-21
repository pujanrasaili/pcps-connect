import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// The number of unread bell messages shows in the tab title, so a tab in the
// background tells you something arrived.
const reply = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const note = (n, read) => ({ _id: `n${n}`.padEnd(24, "0"), title: `Message ${n}`, read, createdAt: new Date(Date.now() - n * 60000).toISOString() });

test("the tab title carries the unread count, follows page changes and clears when read", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  let items = [note(1, false), note(2, false), note(3, true)];
  await page.route("**/api/notifications", (route) => reply(route, { notifications: items, unreadCount: items.filter((n) => !n.read).length }));
  await page.route("**/api/notifications/read-all", (route) => { items = items.map((n) => ({ ...n, read: true })); return reply(route, { message: "ok" }); });

  await page.goto("/events");
  await expect(page).toHaveTitle(/^\(2\) Events/);
  await page.getByRole("link", { name: "Clubs" }).first().click();
  await expect(page).toHaveTitle(/^\(2\) Clubs/);

  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Notifications, 2 unread" }).click();
  await expect(page).toHaveTitle(/^Clubs/);
  await expect(page).not.toHaveTitle(/^\(/);
});

test("with nothing unread the title stays as it was", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/notifications", (route) => reply(route, { notifications: [note(1, true)], unreadCount: 0 }));
  await page.goto("/events");
  await expect(page).toHaveTitle(/^Events/);
});
