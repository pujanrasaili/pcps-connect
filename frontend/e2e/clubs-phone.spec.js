import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

test.use({ viewport: { width: 390, height: 844 } });

// On a phone the clubs filters share one row and the intro line is hidden, so
// the first club card is on screen sooner. The sort menu keeps its label for screen readers.
test("clubs filters fit on one row on a phone", async ({ page }) => {
  const problems = await setUp(page, { role: "student" });
  await page.goto("/clubs");
  const mine = page.getByRole("checkbox", { name: "Only clubs I've joined" });
  const sort = page.getByLabel("Sort by");
  await expect(mine).toBeVisible();
  const a = await mine.boundingBox();
  const b = await sort.boundingBox();
  expect(Math.abs(a.y - b.y)).toBeLessThan(20);
  const card = page.locator("div.card-surface").first();
  const box = await card.boundingBox();
  expect(box.y).toBeLessThan(560);
  expect(problems).toEqual([]);
});
