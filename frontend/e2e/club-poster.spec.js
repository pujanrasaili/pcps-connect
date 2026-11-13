import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// The printable club poster: staff open it from a club's window, it shows the club
// and a QR code that opens the club's page.
const club = clubs[0];
const quiet = (problems) => problems.filter((p) => !/status of (400|401|403|404|500)/.test(p));

test("an admin opens the club poster and sees the name, the text and a QR code", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  await page.goto(`/clubs?club=${club._id}`);
  await page.getByRole("link", { name: "Print a club poster" }).click();
  await expect(page).toHaveURL(new RegExp(`/clubs/${club._id}/poster$`));
  const poster = page.getByRole("article");
  await expect(poster.getByRole("heading", { name: club.name })).toBeVisible();
  await expect(poster.getByText("Scan to see the club and join")).toBeVisible();
  await expect(page.getByText(`/clubs?club=${club._id}`).first()).toBeVisible();
  await expect(page.locator("svg[role='img']").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  expect(quiet(problems)).toEqual([]);
  await page.getByRole("link", { name: "Back to the club" }).click();
  await expect(page).toHaveURL(new RegExp(`/clubs\\?club=${club._id}`));
});

test("the club poster reads in Nepali", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "admin" });
  await page.goto(`/clubs/${club._id}/poster`);
  await expect(page.getByText("क्लब हेर्न र सामेल हुन स्क्यान गर्नुहोस्")).toBeVisible();
  await expect(page.getByRole("link", { name: "क्लबमा फर्कनुहोस्" })).toBeVisible();
});

test("a student does not see the poster link", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  // This student leads no club (the default answer would list every club).
  await page.route("**/api/leader/clubs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clubs: [] }) }));
  await page.goto(`/clubs?club=${club._id}`);
  await expect(page.getByRole("dialog", { name: club.name })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share this club" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Print a club poster" })).toHaveCount(0);
});

test("a missing club shows a friendly message", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.route("**/api/clubs/zz**", (route) => route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Club not found" }) }));
  await page.goto(`/clubs/${"zz".padEnd(24, "0")}/poster`);
  await expect(page.getByRole("heading", { name: "Couldn't open this poster" })).toBeVisible();
});
