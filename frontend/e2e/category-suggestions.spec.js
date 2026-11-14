import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// The event form suggests categories already in use (once each, ignoring case, never "General").
test("the category field suggests the categories events already use", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  const future = new Date(Date.now() + 6 * 864e5).toISOString();
  const make = (i, category) => ({ _id: `e${i}`.padEnd(24, "0"), title: `Event ${i}`, description: "d", date: future, location: "Hall", capacity: 50, registeredCount: 1, category, price: "Free" });
  const events = [make(1, "Workshop"), make(2, "workshop"), make(3, "Technology"), make(4, "General"), make(5, " Sports ")];
  await page.route("**/api/events", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events }) }));
  await page.goto("/admin/events");
  await page.getByRole("button", { name: "Add Event" }).click();
  const input = page.locator("#ev-category");
  await expect(input).toHaveAttribute("list", "ev-category-options");
  const options = await page.locator("#ev-category-options option").evaluateAll((els) => els.map((o) => o.getAttribute("value")));
  expect(options).toEqual(["Sports", "Technology", "Workshop"]);
  expect(problems).toEqual([]);
});
