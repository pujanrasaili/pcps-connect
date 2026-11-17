import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// What search engines read from the page: public pages carry their own
// description and may be listed; sign-in, account and unknown pages ask not to be.
const content = (page, selector) => page.locator(selector).getAttribute("content");
const robots = (page) => page.locator('meta[name="robots"]').count();

test("public pages have their own description and no noindex; account pages ask not to be listed", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/clubs");
  await expect(page).toHaveTitle("Clubs | PCPS Connect");
  expect(await content(page, 'meta[name="description"]')).toMatch(/^Browse the student clubs/);
  expect(await content(page, 'meta[property="og:description"]')).toMatch(/^Browse the student clubs/);
  expect(await content(page, 'meta[property="og:url"]')).toBe("https://pcps-connect.vercel.app/clubs");
  expect(await robots(page)).toBe(0);

  await page.goto("/login");
  expect(await content(page, 'meta[name="robots"]')).toBe("noindex, nofollow");
  await page.goto("/nowhere-at-all");
  expect(await content(page, 'meta[name="robots"]')).toBe("noindex, nofollow");
});

test("moving between pages in the app updates the description and the noindex tag", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
  // An in-app move (no page load), the way the router changes pages.
  await page.evaluate(() => {
    window.history.pushState({}, "", "/events");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page).toHaveURL(/\/events/);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /^Upcoming and past events/);
});

test("the description follows the language", async ({ page }) => {
  await setUp(page, { lang: "ne" });
  await page.goto("/help");
  await expect.poll(() => content(page, 'meta[name="description"]')).toMatch(/^PCPS Connect मा क्लब/);
});
