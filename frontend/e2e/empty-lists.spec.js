import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// When there is simply nothing yet, the lists say so plainly instead of
// claiming "no match for your search" to someone who did not search.
const text = {
  en: { clubsNone: "No clubs yet", eventsNone: "No upcoming events yet", noMatch: "No clubs match your search." },
  ne: { clubsNone: "अहिलेसम्म कुनै क्लब छैन", eventsNone: "अहिलेसम्म कुनै आगामी कार्यक्रम छैन", noMatch: "तपाईंको खोजसँग मिल्ने कुनै क्लब छैन।" },
};

async function withNothing(page) {
  await page.route("**/api/**", (route) => {
    if (route.request().resourceType() === "document") return route.fallback();
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith("/clubs") ? { clubs: [] } : path.endsWith("/events") ? { events: [] } : null;
    return body ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }) : route.fallback();
  });
}

for (const lang of ["en", "ne"]) {
  test.describe(lang, () => {
    test("the Clubs page says there are no clubs yet", async ({ page }) => {
      await setUp(page, { lang });
      await withNothing(page);
      await page.goto("/clubs");
      await expect(page.getByText(text[lang].clubsNone)).toBeVisible();
    });

    test("the Events page says there are no upcoming events yet", async ({ page }) => {
      await setUp(page, { lang });
      await withNothing(page);
      await page.goto("/events");
      await expect(page.getByText(text[lang].eventsNone)).toBeVisible();
    });

    test("the home page explains an empty Featured Clubs section", async ({ page }) => {
      await setUp(page, { lang });
      await withNothing(page);
      await page.goto("/");
      await expect(page.getByText(text[lang].clubsNone)).toBeVisible();
    });
  });
}

test("a search with no results still says nothing matches", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/clubs");
  await page.getByPlaceholder("Search by name, topic or category...").fill("zzzz-no-such-club");
  await expect(page.getByText(text.en.noMatch)).toBeVisible();
});
