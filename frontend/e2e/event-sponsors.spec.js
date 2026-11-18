import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// "Thanks to our partners": everyone sees the sponsors, organisers edit them.
const ID = "s1".padEnd(24, "0");
const DAY = 864e5;
const sponsors = [{ name: "Acme Ltd", url: "https://acme.com.np/" }, { name: "Local Cafe", url: "" }];
const event = (extra = {}) => ({ _id: ID, title: "Open Day", description: "Come along.", date: new Date(Date.now() + 6 * DAY).toISOString(), location: "Lab 2", capacity: 60, registeredCount: 10, category: "Workshop", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0, sponsors, ...extra });
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

async function mockEvent(page, ev) {
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: ev }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route(`**/api/events/${ID}/volunteers`, (route) => reply(route, { roles: [], mine: null, past: false }));
}

for (const lang of ["en", "ne"]) {
  test(`a visitor sees the sponsors, with safe links (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "student" });
    await mockEvent(page, event());
    await page.goto(`/events/${ID}`);
    const box = page.getByTestId("event-sponsors");
    await expect(box).toBeVisible();
    const link = box.getByRole("link").first();
    await expect(link).toHaveAttribute("href", "https://acme.com.np/");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(box.getByText("Local Cafe")).toBeVisible();
    await expect(box.getByRole("button")).toHaveCount(0);
    expect(await axeViolations(page)).toEqual([]);
  });
}

test("a student sees no box when there are no sponsors", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await mockEvent(page, event({ sponsors: [] }));
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("heading", { name: "Questions & answers" })).toBeVisible();
  await expect(page.getByTestId("event-sponsors")).toHaveCount(0);
});

test("an organiser adds a sponsor and saves", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await mockEvent(page, event({ sponsors: [] }));
  let saved = null;
  await page.route(`**/api/events/${ID}/sponsors`, (route) => {
    saved = route.request().postDataJSON();
    return reply(route, { message: "Sponsors saved", sponsors: [] });
  });
  await page.goto(`/events/${ID}`);
  const box = page.getByTestId("event-sponsors");
  await box.getByRole("button", { name: "Add sponsors" }).click();
  await box.getByRole("button", { name: "Add a sponsor" }).click();
  await box.getByLabel("Sponsor name").fill("Acme Ltd");
  await box.getByLabel("Website (optional)").fill("acme.com.np");
  await box.getByRole("button", { name: "Save sponsors" }).click();
  await expect.poll(() => saved).toEqual({ sponsors: [{ name: "Acme Ltd", url: "acme.com.np" }] });
});
