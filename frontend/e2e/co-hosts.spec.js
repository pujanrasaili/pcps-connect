import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// An admin can name up to two co-hosting clubs; the event page shows all hosts.
const field = (raw, name) => (raw.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`)) || [])[1];
const more = [...clubs, { ...clubs[1], _id: "c30000000000000000000000", name: "Film Society" }, { ...clubs[1], _id: "c40000000000000000000000", name: "Debate Club" }];
const EVENT_ID = "e1".padEnd(24, "0");

test("an admin picks co-hosting clubs, at most two", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  let sent = null;
  await page.route("**/api/clubs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clubs: more }) }));
  await page.route("**/api/events", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [] }) }));
  await page.route("**/api/events/create", (route) => {
    sent = field(route.request().postDataBuffer().toString("utf8"), "coHosts");
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ message: "Created", createdCount: 1 }) });
  });
  await page.goto("/admin/events");
  await page.getByRole("button", { name: "Add Event" }).click();
  await page.locator("#ev-title").fill("Joint Night");
  await page.locator("#ev-description").fill("Two clubs, one evening.");
  await page.locator("#ev-date").fill("2030-05-10T10:00");
  await page.locator("#ev-location").fill("Hall");

  // No co-host list until a main club is chosen.
  await expect(page.getByRole("group", { name: /Co-hosting clubs/ })).toHaveCount(0);
  await page.locator("#ev-club").selectOption(clubs[0]._id);
  const group = page.getByRole("group", { name: /Co-hosting clubs/ });
  await expect(group).toBeVisible();
  await expect(group.getByLabel(clubs[0].name)).toHaveCount(0); // not its own co-host

  await group.getByLabel(clubs[1].name).check();
  await group.getByLabel(more[2].name).check();
  const rest = group.getByRole("checkbox", { disabled: true });
  expect(await rest.count()).toBeGreaterThan(0); // a third is not allowed
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page.getByText("Event created.")).toBeVisible();
  expect(JSON.parse(sent)).toEqual([clubs[1]._id, more[2]._id]);
  expect(problems).toEqual([]);
});

test("the event page names every hosting club", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  const event = { _id: EVENT_ID, title: "Joint Night", description: "d", date: "2030-05-10T10:00:00Z", location: "Hall", capacity: 50, registeredCount: 1, club: clubs[0], coHosts: [clubs[1]], category: "General", price: "Free" };
  await page.route("**/api/events", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [event] }) }));
  await page.route(`**/api/events/${EVENT_ID}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ event }) }));
  await page.goto(`/events/${EVENT_ID}`);
  await expect(page.getByText(`Hosted by ${clubs[0].name} + ${clubs[1].name}`)).toBeVisible();
  expect(problems).toEqual([]);
});
