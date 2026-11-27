import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// When the server cannot be reached (for example while it wakes up), the lists
// say so and offer a retry. They must not claim there are no clubs or events,
// and the home page must not show zeros as if they were real numbers.
const text = {
  en: { clubs: "Couldn't load clubs.", events: "Couldn't load events.", retry: "Try again", none: "No clubs yet" },
  ne: { clubs: "क्लबहरू लोड गर्न सकिएन।", events: "कार्यक्रमहरू लोड गर्न सकिएन।", retry: "फेरि प्रयास गर्नुहोस्", none: "अहिलेसम्म कुनै क्लब छैन" },
};

async function serverDown(page, { recoverAfter = Infinity } = {}) {
  let calls = 0;
  await page.route("**/api/**", (route) => {
    if (route.request().resourceType() === "document") return route.fallback();
    const path = new URL(route.request().url()).pathname;
    if (/\/(clubs|events|stats)$/.test(path)) {
      calls += 1;
      if (calls <= recoverAfter) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Service Unavailable" }) });
    }
    return route.fallback();
  });
}

for (const lang of ["en", "ne"]) {
  test.describe(lang, () => {
    test("the Clubs page offers a retry that works once the server is back", async ({ page }) => {
      await setUp(page, { lang });
      await serverDown(page, { recoverAfter: 1 });
      await page.goto("/clubs");
      await expect(page.getByText(text[lang].clubs)).toBeVisible();
      await expect(page.getByText(text[lang].none)).toHaveCount(0);
      await page.getByRole("button", { name: text[lang].retry }).click();
      await expect(page.getByText(text[lang].clubs)).toHaveCount(0);
      await expect(page.getByText("Coding Club").first()).toBeVisible();
    });

    test("the Events page says it could not load, with a retry", async ({ page }) => {
      await setUp(page, { lang });
      await serverDown(page);
      await page.goto("/events");
      await expect(page.getByText(text[lang].events)).toBeVisible();
      await expect(page.getByRole("button", { name: text[lang].retry })).toBeVisible();
    });

    test("the home page shows failures, not 'nothing yet' or zero counts", async ({ page }) => {
      await setUp(page, { lang });
      await serverDown(page);
      await page.goto("/");
      await expect(page.getByText(text[lang].clubs)).toBeVisible();
      await expect(page.getByText(text[lang].events)).toBeVisible();
      await expect(page.getByText(text[lang].none)).toHaveCount(0);
      await expect(page.getByText(lang === "en" ? "Registered Students" : "दर्ता भएका विद्यार्थीहरू")).toHaveCount(0);
    });
  });
}
