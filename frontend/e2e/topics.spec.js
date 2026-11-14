import { test, expect } from "@playwright/test";
import { setUp, student, axeViolations } from "./helpers.js";

// Settings > "Topics you follow": categories used by events, saved on each tap, at most 5.
const CATEGORIES = ["Workshop", "Technology", "Sports", "Music", "Art", "Debate", "Career", "General"];

async function mock(page, lang) {
  let user = { ...student, language: lang, interests: [] };
  const calls = [];
  const future = new Date(Date.now() + 6 * 864e5).toISOString();
  const events = CATEGORIES.map((category, i) => ({ _id: `e${i}`.padEnd(24, "0"), title: `Event ${i}`, description: "d", date: future, location: "Hall", capacity: 50, registeredCount: 1, category, price: "Free" }));
  await page.route("**/api/events", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events }) }));
  await page.route("**/api/auth/profile", (route) => {
    const body = route.request().postDataJSON();
    calls.push(body);
    user = { ...user, ...body };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user }) });
  });
  return calls;
}

test("a student follows and unfollows topics, up to five", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  const calls = await mock(page, "en");
  await page.goto("/settings");
  const group = page.getByRole("group", { name: "Topics you follow" });
  await expect(group).toBeVisible();
  // The default "General" category is not a topic.
  await expect(group.getByRole("button", { name: "General" })).toHaveCount(0);

  await group.getByRole("button", { name: "Workshop" }).click();
  await expect(group.getByRole("button", { name: "Workshop" })).toHaveAttribute("aria-pressed", "true");
  expect(calls).toEqual([{ interests: ["workshop"] }]);

  for (const name of ["Technology", "Sports", "Music", "Art"]) {
    await group.getByRole("button", { name }).click();
    await expect(group.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
  }
  // Five chosen: the others are locked, the chosen ones can still be removed.
  await expect(group.getByRole("button", { name: "Debate" })).toBeDisabled();
  expect(await axeViolations(page)).toEqual([]);
  await group.getByRole("button", { name: "Art" }).click();
  await expect(group.getByRole("button", { name: "Debate" })).toBeEnabled();
  expect(calls.at(-1)).toEqual({ interests: ["workshop", "technology", "sports", "music"] });
  expect(problems).toEqual([]);
});

test("the topic picker is translated in Nepali", async ({ page }) => {
  const problems = await setUp(page, { lang: "ne", role: "student" });
  await mock(page, "ne");
  await page.goto("/settings");
  await expect(page.getByRole("group", { name: "तपाईंले पछ्याएका विषयहरू" })).toBeVisible();
  expect(problems).toEqual([]);
});
