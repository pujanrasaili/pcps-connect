import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// "My Clubs" links to one club's events; the events page can show a single club
// (as host or co-host), says so, and offers the way back.
const [coding, robotics] = clubs;
const t = {
  en: { chip: `Showing events of ${coding.name}`, all: "Show all clubs" },
  ne: { chip: `${coding.name} का कार्यक्रमहरू देखाइँदै`, all: "सबै क्लबहरू देखाउनुहोस्" },
};

for (const lang of ["en", "ne"]) {
  test(`the events page can be narrowed to one club and widened again (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "admin" });
    await page.goto(`/admin/events?club=${coding._id}`);
    await expect(page.getByText(t[lang].chip)).toBeVisible();
    await expect(page.getByText("Robot Demo")).toBeVisible();
    await expect(page.getByText("Photo Walk")).toHaveCount(0);
    await expect(page.getByText(/^Hack Night/)).toHaveCount(0);
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole("button", { name: t[lang].all }).click();
    await expect(page.getByText("Photo Walk")).toBeVisible();
    await expect(page.getByText("Robot Demo")).toBeVisible();
    await expect(page.getByText(t[lang].chip)).toHaveCount(0);
    await expect(page).not.toHaveURL(/club=/);
  });
}

test("Add Event starts with the filtered club already chosen", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.goto(`/admin/events?club=${robotics._id}`);
  await page.getByRole("button", { name: "Add Event" }).click();
  await expect(page.getByLabel(/Hosting club/)).toHaveValue(robotics._id);
});

test("an unknown club in the link shows everything instead of nothing", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.goto("/admin/events?club=000000000000000000000000");
  await expect(page.getByText("Photo Walk")).toBeVisible();
  await expect(page.getByText(/Showing events of/)).toHaveCount(0);
});

test("My Clubs has an Events button for each club that opens that club's events", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/leader/clubs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clubs: [coding] }) }));
  await page.route("**/api/admin/club-request-counts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ counts: {} }) }));
  await page.goto("/admin/my-clubs");
  const link = page.getByRole("main").getByRole("link", { name: "Events", exact: true });
  await expect(link).toHaveAttribute("href", `/admin/events?club=${coding._id}`);
});
