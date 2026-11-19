import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Profile: the student sees the clubs they are listed under as alumni and can
// take an entry off.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const club = clubs[0];
const entry = { _id: "a1".padEnd(24, "0"), clubId: club._id, clubName: club.name, year: 2024, note: "Treasurer" };

for (const lang of ["en", "ne"]) {
  test(`the Profile lists alumni entries and removes one (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "student" });
    let list = [entry];
    const removed = [];
    await page.route("**/api/club-memberships/alumni", (route) => reply(route, { alumni: list }));
    await page.route(`**/api/clubs/${club._id}/alumni/*`, (route) => {
      removed.push(new URL(route.request().url()).pathname.split("/").pop());
      list = [];
      return reply(route, { message: "removed" });
    });
    await page.goto("/profile");
    const box = page.getByTestId("my-alumni");
    await expect(box).toBeVisible();
    await expect(box.getByRole("link", { name: club.name })).toHaveAttribute("href", `/clubs?club=${club._id}`);
    await expect(box.getByText("Treasurer", { exact: false })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await box.getByRole("button").click();
    await expect(box).toHaveCount(0);
    expect(removed).toEqual([entry._id]);
  });
}

test("the card is hidden when the student is not listed anywhere", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/club-memberships/alumni", (route) => reply(route, { alumni: [] }));
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Milestones" }).or(page.locator("main h1")).first()).toBeVisible();
  await expect(page.getByTestId("my-alumni")).toHaveCount(0);
});
