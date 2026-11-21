import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// The server sends upcoming and recent events by default; the full history is
// fetched (once) only where it is needed.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const day = (n) => new Date(Date.now() + n * 864e5).toISOString();
const base = { description: "x", location: "Main Hall", capacity: 40, registeredCount: 3, category: "Workshop", price: "Free" };
const recent = [
  { ...base, _id: "b1".padEnd(24, "0"), title: "Coming Up Soon", date: day(3) },
  { ...base, _id: "b2".padEnd(24, "0"), title: "Finished Last Month", date: day(-30) },
];
const everything = [...recent, { ...base, _id: "b3".padEnd(24, "0"), title: "Finished Long Ago", date: day(-400) }];

async function withEventsApi(page, { failOlder = false, delayOlder = 0 } = {}) {
  const asked = [];
  await page.route((url) => url.pathname.endsWith("/api/events"), async (route) => {
    const scope = new URL(route.request().url()).searchParams.get("scope");
    asked.push(scope);
    if (scope === "all") {
      if (delayOlder) await new Promise((r) => setTimeout(r, delayOlder));
      if (failOlder) return reply(route, { message: "down" }, 500);
      return reply(route, { events: everything });
    }
    return reply(route, { events: recent });
  });
  return asked;
}

test("the Events page and Home ask for the recent list only", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const asked = await withEventsApi(page);
  await page.goto("/events");
  await expect(page.getByText("Coming Up Soon")).toBeVisible();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(asked.every((scope) => scope === null)).toBe(true);
});

test("opening Past fetches the whole history, once, and shows the old event", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const asked = await withEventsApi(page);
  await page.goto("/events");
  await expect(page.getByText("Coming Up Soon")).toBeVisible();
  await page.getByRole("button", { name: "Past", exact: true }).click();
  await expect(page.getByText("Finished Long Ago")).toBeVisible();
  await expect(page.getByText("Finished Last Month")).toBeVisible();
  await page.getByRole("button", { name: "Upcoming", exact: true }).click();
  await page.getByRole("button", { name: "Past", exact: true }).click();
  expect(asked.filter((scope) => scope === "all")).toHaveLength(1);
});

for (const lang of ["en", "ne"]) {
  test(`while older events load the page says so (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "student" });
    await withEventsApi(page, { delayOlder: 1500 });
    await page.goto("/events?when=past");
    await expect(page.getByRole("status").filter({ hasText: lang === "en" ? "Loading older events..." : "पुराना कार्यक्रमहरू लोड हुँदैछ..." })).toBeVisible();
    await expect(page.getByText("Finished Long Ago")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /older events|पुराना कार्यक्रम/ })).toHaveCount(0);
  });
}

test("if the full history cannot be fetched, the recent events stay on screen", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withEventsApi(page, { failOlder: true });
  await page.goto("/events?when=past");
  await expect(page.getByText("Finished Last Month")).toBeVisible();
  await expect(page.getByText("Finished Long Ago")).toHaveCount(0);
});

test("the admin pages load everything", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const asked = await withEventsApi(page);
  await page.goto("/admin/events");
  await expect(page.getByText("Finished Long Ago")).toBeVisible();
  expect(asked).toContain("all");
  asked.length = 0;
  await page.goto("/admin");
  await expect.poll(() => asked.includes("all")).toBe(true);
});
