import { test, expect } from "@playwright/test";
import { setUp, clubs } from "./helpers.js";

// A club with no banner photo gets its initials on the banner instead of a bare
// coloured block; a club with a photo shows the photo and no initials.
const reply = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

test("a club without a banner shows its initials; one with a banner does not", async ({ page }) => {
  await setUp(page, { lang: "en" });
  const plain = { ...clubs[0], name: "Coding Club", image: "" };
  const photo = { ...clubs[1], name: "Robotics Society", image: "https://example.com/banner.jpg" };
  await page.route("**/api/clubs", (route) => reply(route, { clubs: [plain, photo] }));
  await page.goto("/clubs");
  await expect(page.getByRole("heading", { name: "Coding Club" })).toBeVisible();
  const initials = page.getByTestId("club-cover-initials");
  await expect(initials).toHaveCount(1);
  await expect(initials).toHaveText("CC");
});
