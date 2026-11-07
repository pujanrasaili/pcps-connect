import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// An admin managing events: create (one-off and weekly series), edit, delete.
const text = {
  en: { add: "Add Event", create: "Create event", created: "Event created.", updated: "Event updated.", deleted: "Event deleted.", save: "Save changes", del: "Delete", edit: (t) => `Edit ${t}`, remove: (t) => `Delete ${t}`, title: "Event title" },
  ne: { add: "कार्यक्रम थप्नुहोस्", create: "कार्यक्रम सिर्जना गर्नुहोस्", created: "कार्यक्रम सिर्जना गरियो।", updated: "कार्यक्रम अपडेट गरियो।", deleted: "कार्यक्रम हटाइयो।", save: "परिवर्तन सुरक्षित गर्नुहोस्", del: "मेटाउनुहोस्", edit: (t) => `${t} सम्पादन गर्नुहोस्`, remove: (t) => `${t} हटाउनुहोस्`, title: "कार्यक्रमको शीर्षक" },
};

// Reads one text field out of a multipart body.
const field = (raw, name) => (raw.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`)) || [])[1];

async function withEventsApi(page) {
  let events = [];
  const calls = [];
  const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  const make = (i, raw) => ({ _id: `n${i}`.padEnd(24, "0"), title: field(raw, "title"), description: field(raw, "description"), date: field(raw, "date"), location: field(raw, "location"), capacity: Number(field(raw, "capacity")), category: field(raw, "category") || "General", price: field(raw, "price") || "Free", club: clubs.find((c) => c._id === field(raw, "club")) || null, registeredCount: 0, pendingCount: 0 });
  await page.route("**/api/events", (route) => reply(route, { events }));
  await page.route("**/api/events/**", (route) => {
    const req = route.request();
    const method = req.method();
    const path = new URL(req.url()).pathname;
    if (method === "POST" && path.endsWith("/events/create")) {
      const raw = req.postDataBuffer().toString("utf8");
      const count = field(raw, "repeat") ? Number(field(raw, "repeatCount")) : 1;
      calls.push(`create x${count} ${field(raw, "title")}`);
      events = [...events, ...Array.from({ length: count }, (_, k) => make(events.length + k + 1, raw))];
      return reply(route, { message: "Created", createdCount: count }, 201);
    }
    const id = path.split("/").pop();
    if (method === "PUT") {
      const raw = req.postDataBuffer().toString("utf8");
      calls.push(`update ${field(raw, "title")}`);
      events = events.map((e) => (e._id === id ? { ...e, title: field(raw, "title") } : e));
      return reply(route, { message: "Updated" });
    }
    if (method === "DELETE") {
      calls.push("delete");
      events = events.filter((e) => e._id !== id);
      return reply(route, { message: "Deleted" });
    }
    return reply(route, {});
  });
  return calls;
}

async function fillEvent(page, title) {
  await page.locator("#ev-title").fill(title);
  await page.locator("#ev-description").fill("Bring a laptop and a friend.");
  await page.locator("#ev-date").fill("2030-05-10T10:00");
  await page.locator("#ev-location").fill("Seminar Room");
  await page.locator("#ev-club").selectOption(clubs[0]._id);
}

for (const lang of ["en", "ne"]) {
  test(`an admin can create, edit and delete an event (${lang})`, async ({ page }) => {
    const l = text[lang];
    const problems = await setUp(page, { lang, role: "admin" });
    const calls = await withEventsApi(page);
    await page.goto("/admin/events");

    await page.getByRole("button", { name: l.add }).click();
    await expect(page.locator("#ev-title")).toBeVisible();
    await fillEvent(page, "Python Basics");
    await page.getByRole("button", { name: l.create, exact: true }).click();
    await expect(page.getByText(l.created)).toBeVisible();
    await expect(page.getByText("Python Basics", { exact: true })).toBeVisible();
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole("button", { name: l.edit("Python Basics") }).click();
    await page.locator("#ev-title").fill("Python Basics, Part 2");
    await page.getByRole("button", { name: l.save }).click();
    await expect(page.getByText(l.updated)).toBeVisible();
    await expect(page.getByText("Python Basics, Part 2", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: l.remove("Python Basics, Part 2") }).click();
    await page.getByRole("dialog").getByRole("button", { name: l.del, exact: true }).click();
    await expect(page.getByText(l.deleted)).toBeVisible();
    await expect(page.getByText("Python Basics, Part 2", { exact: true })).toHaveCount(0);

    expect(calls).toEqual(["create x1 Python Basics", "update Python Basics, Part 2", "delete"]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("a weekly repeat creates the whole series at once", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withEventsApi(page);
  await page.goto("/admin/events");
  await page.getByRole("button", { name: "Add Event" }).click();
  await fillEvent(page, "Weekly Meetup");
  await page.locator("#ev-repeat").selectOption("weekly");
  await page.locator("#ev-repeat-count").fill("3");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page.getByText("3 events created.")).toBeVisible();
  await expect(page.getByText("Weekly Meetup", { exact: true })).toHaveCount(3);
  expect(calls).toEqual(["create x3 Weekly Meetup"]);
});

test("the form refuses to send an event with no title", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withEventsApi(page);
  await page.goto("/admin/events");
  await page.getByRole("button", { name: "Add Event" }).click();
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page.locator("#ev-title")).toBeVisible();
  expect(calls).toEqual([]);
});
