import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

const id = "e1".padEnd(24, "0");

// On a phone the date, place, price and spots come before the long description,
// so people see the key facts without scrolling. On a wide screen they stay in the side column.
test("phone: the event facts come before the description", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const problems = await setUp(page, { role: "student" });
  await page.goto(`/events/${id}`);
  const facts = await page.getByRole("complementary").getByText("20/50 registered").boundingBox();
  const about = await page.getByRole("heading", { name: "About this event" }).boundingBox();
  expect(facts.y).toBeLessThan(about.y);
  expect(problems).toEqual([]);
});

test("desktop: the event facts stay beside the description", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const problems = await setUp(page, { role: "student" });
  await page.goto(`/events/${id}`);
  const facts = await page.getByRole("complementary").getByText("20/50 registered").boundingBox();
  const about = await page.getByRole("heading", { name: "About this event" }).boundingBox();
  expect(facts.x).toBeGreaterThan(about.x + 300);
  expect(problems).toEqual([]);
});
