import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Campus venues: admins keep the list, and an event whose location is exactly
// a venue's name shows how to find it.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const ID = "v1".padEnd(24, "0");
const DAY = 864e5;
const event = (location) => ({ _id: ID, title: "Open Day", description: "Come along.", date: new Date(Date.now() + 6 * DAY).toISOString(), location, capacity: 60, registeredCount: 10, category: "Workshop", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0 });

async function mockEventPage(page, location) {
  await page.route("**/api/venues", (route) => reply(route, { venues: [{ _id: "a1".padEnd(24, "0"), name: "Seminar Hall", directions: "Block B, second floor" }] }));
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: event(location) }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route(`**/api/events/${ID}/volunteers`, (route) => reply(route, { roles: [], mine: null, past: false }));
}

for (const lang of ["en", "ne"]) {
  test(`the event page shows how to find a known venue (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "student" });
    await mockEventPage(page, "seminar hall");
    await page.goto(`/events/${ID}`);
    await expect(page.getByTestId("venue-directions")).toContainText("Block B, second floor");
    await expect(page.getByTestId("venue-directions")).toContainText(lang === "en" ? "How to find it:" : "कसरी पुग्ने:");
    expect(await axeViolations(page)).toEqual([]);
  });
}

test("an unknown location shows no directions", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await mockEventPage(page, "Rooftop");
  await page.goto(`/events/${ID}`);
  await expect(page.getByText("Rooftop").first()).toBeVisible();
  await expect(page.getByTestId("venue-directions")).toHaveCount(0);
});

test("an admin adds, edits and removes a venue", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  let venues = [{ _id: "a1".padEnd(24, "0"), name: "Library", directions: "Ground floor" }];
  const calls = [];
  await page.route("**/api/venues", (route) => reply(route, { venues }));
  await page.route("**/api/admin/venues**", (route) => {
    const req = route.request();
    const id = new URL(req.url()).pathname.split("/").pop();
    if (req.method() === "POST") {
      const body = req.postDataJSON();
      calls.push(`add ${body.name} | ${body.directions}`);
      venues = [...venues, { _id: "b2".padEnd(24, "0"), ...body }];
      return reply(route, { message: "ok", venue: venues.at(-1) }, 201);
    }
    if (req.method() === "PUT") {
      const body = req.postDataJSON();
      calls.push(`edit ${body.name} | ${body.directions}`);
      venues = venues.map((v) => (v._id === id ? { ...v, ...body } : v));
      return reply(route, { message: "ok" });
    }
    calls.push(`delete ${id}`);
    venues = venues.filter((v) => v._id !== id);
    return reply(route, { message: "ok" });
  });
  await page.goto("/admin/venues");
  await expect(page.getByRole("heading", { name: "Campus venues" })).toBeVisible();
  await expect(page.getByText("Ground floor")).toBeVisible();

  await page.getByLabel("Venue name").fill("Seminar Hall");
  await page.getByLabel("How to find it (optional)").fill("Block B");
  await page.getByRole("button", { name: "Add venue" }).click();
  await expect(page.getByText("Venue added.")).toBeVisible();
  await expect(page.getByRole("list").getByText("Seminar Hall")).toBeVisible();

  await page.getByRole("button", { name: "Edit Seminar Hall" }).click();
  await page.getByLabel("How to find it (optional)").fill("Block C");
  await page.getByRole("button", { name: "Save venue" }).click();
  await expect(page.getByText("Venue saved.")).toBeVisible();

  await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Remove Library" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^(Remove|Delete|Yes|Confirm)/ }).click();
  await expect(page.getByText("Venue removed.")).toBeVisible();
  expect(calls).toEqual(["add Seminar Hall | Block B", "edit Seminar Hall | Block C", `delete ${"a1".padEnd(24, "0")}`]);
});

test("a registered student's Google Calendar link carries the venue's directions", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await mockEventPage(page, "Seminar Hall");
  await page.route("**/api/registrations/my", (route) =>
    reply(route, { registrations: [{ _id: "r1".padEnd(24, "0"), status: "confirmed", attended: false, event: event("Seminar Hall") }] })
  );
  await page.goto(`/events/${ID}`);
  const link = page.getByRole("link", { name: "Google Calendar" });
  await expect(link).toBeVisible();
  const details = new URL(await link.getAttribute("href")).searchParams.get("details");
  expect(details).toContain("Come along.");
  expect(details).toContain("How to find it: Block B, second floor");
});
