import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The announcement banner at the top of every page: visitors see it and can
// close it for the session; an admin publishes, edits and removes it.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|409)/.test(p));
const notice = (message, tone = "info", updatedAt = "2026-11-01T00:00:00.000Z") => ({ message, tone, updatedAt });

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`visitors see the banner on every page and can close it (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await page.route("**/api/notice", (route) => reply(route, { notice: notice("Fest registration closes Friday") }));
    await page.goto("/");
    const banner = page.getByRole("status").filter({ hasText: "Fest registration closes Friday" });
    await expect(banner).toBeVisible();
    await page.waitForTimeout(1000); // the home page fades its sections in
    expect(await axeViolations(page)).toEqual([]);
    await page.goto("/events");
    await expect(page.getByRole("status").filter({ hasText: "Fest registration closes Friday" })).toBeVisible();
    await page.getByRole("button", { name: en ? "Dismiss announcement" : "सूचना बन्द गर्नुहोस्" }).click();
    await expect(page.getByText("Fest registration closes Friday")).toHaveCount(0);
    // Closed for the session, so it stays closed on the next page.
    await page.goto("/clubs");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Fest registration closes Friday")).toHaveCount(0);
    expect(quiet(problems)).toEqual([]);
  });
}

test("an edited announcement shows again even after the old one was closed", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route("**/api/notice", (route) => reply(route, { notice: notice("Old news") }));
  await page.goto("/");
  await page.getByRole("button", { name: "Dismiss announcement" }).click();
  await expect(page.getByText("Old news")).toHaveCount(0);
  await page.unroute("**/api/notice");
  await page.route("**/api/notice", (route) => reply(route, { notice: notice("New news", "info", "2026-11-08T00:00:00.000Z") }));
  await page.goto("/events");
  await expect(page.getByRole("status").filter({ hasText: "New news" })).toBeVisible();
});

test("with no announcement set, no banner shows", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dismiss announcement" })).toHaveCount(0);
});

test("an announcement that fails to load never blocks the page", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route("**/api/notice", (route) => reply(route, { message: "boom" }, 500));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dismiss announcement" })).toHaveCount(0);
});

test("the Important style uses the warning colours", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route("**/api/notice", (route) => reply(route, { notice: notice("Exam week schedule changed", "warning") }));
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Exam week schedule changed" })).toHaveClass(/amber/);
});

async function withNoticeAdmin(page, start = null) {
  let live = start;
  const calls = [];
  await page.route("**/api/notice", (route) => reply(route, { notice: live }));
  await page.route("**/api/admin/notice", (route) => {
    const { message, tone } = route.request().postDataJSON();
    calls.push(`${tone}: ${message}`);
    live = message.trim() ? notice(message.trim(), tone, new Date().toISOString()) : null;
    return reply(route, { notice: live });
  });
  return calls;
}

test("an admin publishes, updates and removes the announcement", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  const calls = await withNoticeAdmin(page);
  await page.goto("/admin");
  const publish = page.getByRole("button", { name: "Publish announcement" });
  await page.getByLabel("Message").fill("Fest registration closes Friday");
  await page.getByLabel("Style").selectOption("warning");
  await publish.click();
  await expect(page.getByText("Announcement is live.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Update announcement" })).toBeVisible();
  await page.getByLabel("Message").fill("Fest registration closes Saturday");
  await page.getByRole("button", { name: "Update announcement" }).click();
  await expect(page.getByLabel("Message")).toHaveValue("Fest registration closes Saturday");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Announcement removed.")).toBeVisible();
  await expect(page.getByLabel("Message")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Publish announcement" })).toBeVisible();
  expect(calls).toEqual(["warning: Fest registration closes Friday", "warning: Fest registration closes Saturday", "warning: "]);
  expect(quiet(problems)).toEqual([]);
});

test("the editor shows what is live, counts characters, and reports a failed save", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  await page.route("**/api/notice", (route) => reply(route, { notice: notice("Already live", "warning") }));
  await page.route("**/api/admin/notice", (route) => reply(route, { message: "Not allowed" }, 400));
  await page.goto("/admin");
  await expect(page.getByLabel("Message")).toHaveValue("Already live");
  await expect(page.getByLabel("Style")).toHaveValue("warning");
  await expect(page.getByText("12/200")).toBeVisible();
  await page.getByRole("button", { name: "Update announcement" }).click();
  await expect(page.getByText("Not allowed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Update announcement" })).toBeEnabled();
  expect(quiet(problems)).toEqual([]);
});
