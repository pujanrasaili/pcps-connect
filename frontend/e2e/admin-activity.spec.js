import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The admin activity log: readable labels, colour-coded kinds, filter chips,
// search, paging at 15 a page, and empty / error states.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (401|500)/.test(p));
const entry = (n, action, summary, actorName = "Admin User") => ({ _id: `a${String(n).padStart(3, "0")}`.padEnd(24, "0"), action, summary, actorName, createdAt: new Date(Date.now() - n * 3600e3).toISOString() });
const few = [
  entry(1, "user.approved", "Approved Maya Shrestha"),
  entry(2, "user.deleted", "Deleted Sam Thapa", "Second Admin"),
  entry(3, "event.created", "Created event Hack Night"),
  entry(4, "club.updated", "Edited club Coding Club"),
  entry(5, "notice.set", "Published a site announcement"),
  entry(6, "weird.new_thing", "Something added in a future version"),
];
const serve = (page, entries) => page.route("**/api/admin/audit", (route) => reply(route, { entries }));

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`the log lists who did what, with a readable label for each (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "admin" });
    await serve(page, few);
    await page.goto("/admin/activity");
    await expect(page.getByRole("heading", { level: 1, name: en ? "Activity" : "गतिविधि" })).toBeVisible();
    await expect(page.getByText("Approved Maya Shrestha")).toBeVisible();
    await expect(page.getByText(en ? "by Second Admin" : /Second Admin/)).toBeVisible();
    if (en) {
      const row = page.locator("div.py-3", { hasText: "Deleted Sam Thapa" });
      await expect(row).toContainText("User deleted");
      await expect(row.locator(".badge")).toHaveClass(/rose/); // destructive = red
      await expect(page.locator("div.py-3", { hasText: "Approved Maya Shrestha" }).locator(".badge")).toHaveClass(/emerald/);
      // An action this version doesn't know still reads sensibly.
      await expect(page.locator("div.py-3", { hasText: "Something added in a future version" })).toContainText("Weird new thing");
    }
    await page.waitForTimeout(500);
    expect(await axeViolations(page)).toEqual([]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("the filter chips narrow the log by kind and show which is selected", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await serve(page, few);
  await page.goto("/admin/activity");
  const chips = page.getByRole("group", { name: "Filter by kind of action" });
  await expect(chips.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  await chips.getByRole("button", { name: "People" }).click();
  await expect(chips.getByRole("button", { name: "People" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Approved Maya Shrestha")).toBeVisible();
  await expect(page.getByText("Created event Hack Night")).toHaveCount(0);
  await chips.getByRole("button", { name: "Events" }).click();
  await expect(page.getByText("Created event Hack Night")).toBeVisible();
  await expect(page.getByText("Approved Maya Shrestha")).toHaveCount(0);
  await chips.getByRole("button", { name: "Clubs" }).click();
  await expect(page.getByText("Edited club Coding Club")).toBeVisible();
  // Site announcements have no chip of their own, but are in "All".
  await expect(page.getByText("Published a site announcement")).toHaveCount(0);
  await chips.getByRole("button", { name: "All" }).click();
  await expect(page.getByText("Published a site announcement")).toBeVisible();
});

test("search matches the person who acted or the detail, and says when nothing matches", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await serve(page, few);
  await page.goto("/admin/activity");
  const box = page.getByPlaceholder("Search by person or detail...");
  await box.fill("second admin");
  await expect(page.getByText("Deleted Sam Thapa")).toBeVisible();
  await expect(page.getByText("Approved Maya Shrestha")).toHaveCount(0);
  await box.fill("hack night");
  await expect(page.getByText("Created event Hack Night")).toBeVisible();
  await box.fill("zzzzqq");
  await expect(page.getByText("No activity matches your filter.")).toBeVisible();
});

test("a long log is paged 15 at a time", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await serve(page, Array.from({ length: 20 }, (_, i) => entry(i + 1, "event.created", `Created event Number ${i + 1}`)));
  await page.goto("/admin/activity");
  await expect(page.getByText(/Created event Number/)).toHaveCount(15);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText(/Created event Number/)).toHaveCount(5);
  await expect(page.getByText("Created event Number 20")).toBeVisible();
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.getByText("Created event Number 1", { exact: true })).toBeVisible();
});

test("an empty log and a failed load each say so", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await serve(page, []);
  await page.goto("/admin/activity");
  await expect(page.getByText("No admin activity recorded yet.")).toBeVisible();
  await page.unroute("**/api/admin/audit");
  await page.route("**/api/admin/audit", (route) => reply(route, { message: "Log service is down" }, 500));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Log service is down");
});

test("a student can't open the activity log", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.goto("/admin/activity");
  await expect(page).not.toHaveURL(/\/admin\/activity/);
});
