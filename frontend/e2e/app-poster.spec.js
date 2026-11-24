import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The printable "PCPS Connect" poster for notice boards: what the app does, and a
// QR code that opens the site. Anyone can open it from the Help page.
test("the PCPS Connect poster is reachable from Help and shows the text and a QR code", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/help");
  await page.getByRole("link", { name: "Print the PCPS Connect poster" }).click();
  await expect(page).toHaveURL(/\/poster$/);
  const poster = page.getByRole("article");
  await expect(poster.getByRole("heading", { name: "PCPS Connect" })).toBeVisible();
  await expect(poster.getByText("Every club and event at PCPS, in one place")).toBeVisible();
  await expect(poster.getByText("Join the clubs you like")).toBeVisible();
  await expect(poster.getByText("Scan to open PCPS Connect")).toBeVisible();
  await expect(poster.locator("svg[role='img']").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test("the poster reads in Nepali", async ({ page }) => {
  await setUp(page, { lang: "ne" });
  await page.goto("/poster");
  await expect(page.getByText("PCPS का सबै क्लब र कार्यक्रम, एकै ठाउँमा")).toBeVisible();
  await expect(page.getByText("PCPS Connect खोल्न स्क्यान गर्नुहोस्")).toBeVisible();
});
