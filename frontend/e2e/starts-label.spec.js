import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// Cards and the event page say how soon an event is.
const reply = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const noon = (days) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(12, 0, 0, 0); return d.toISOString(); };
const base = { description: "x", location: "Main Hall", capacity: 40, registeredCount: 3, category: "Workshop", price: "Free" };
const events = [
  { ...base, _id: "a2".padEnd(24, "0"), title: "Tomorrow Meetup", date: noon(1) },
  { ...base, _id: "a3".padEnd(24, "0"), title: "Midweek Workshop", date: noon(3) },
  { ...base, _id: "a4".padEnd(24, "0"), title: "Far Away Fest", date: noon(20) },
  { ...base, _id: "a5".padEnd(24, "0"), title: "Old Gathering", date: noon(-4) },
];

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`event cards say how soon an event starts (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "student" });
    await page.route("**/api/events*", (route) => reply(route, { events }));
    await page.goto("/events");
    const card = (title) => page.locator("div.card-surface", { has: page.getByRole("heading", { name: title }) });
    await expect(card("Tomorrow Meetup")).toContainText(en ? "Starts tomorrow" : "भोलि सुरु हुन्छ");
    await expect(card("Midweek Workshop")).toContainText(en ? "Starts in 3 days" : "3 दिनमा सुरु हुन्छ");
    await expect(card("Far Away Fest")).not.toContainText(en ? "Starts" : "सुरु हुन्छ");
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
  });
}

test("the event page shows it beside the date, and a past event shows nothing", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/events*", (route) => reply(route, { events }));
  await page.route("**/api/events/*", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    const event = events.find((e) => e._id === id);
    return event ? reply(route, { event }) : route.fallback();
  });
  const open = (title) => page.goto(`/events/${events.find((e) => e.title === title)._id}`);
  await open("Tomorrow Meetup");
  await expect(page.locator("aside").getByText("Starts tomorrow")).toBeVisible();
  await open("Old Gathering");
  await expect(page.getByRole("heading", { name: "Old Gathering" }).first()).toBeVisible();
  await expect(page.locator("aside").getByText(/Starts /)).toHaveCount(0);
});
