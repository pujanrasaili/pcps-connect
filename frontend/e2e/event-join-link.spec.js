import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// The online meeting link of an event: only organisers and students with a
// confirmed registration are offered it, and only organisers can change it.
const ID = "j1".padEnd(24, "0");
const LINK = "https://meet.google.com/abc-defg-hij";
const event = (daysAhead = 6) => ({ _id: ID, title: "Webinar", description: "Online talk.", date: new Date(Date.now() + daysAhead * 864e5).toISOString(), location: "Online", capacity: 60, registeredCount: 10, category: "Social", price: "Free", club: clubs[0], photos: [], averageRating: 0, ratingCount: 0 });
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|403|404|500)/.test(p));

async function api(page, { registered = false, link = LINK, daysAhead = 6, status = "confirmed", linkStatus = 200 } = {}) {
  const calls = [];
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: event(daysAhead) }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route("**/api/registrations/my", (route) =>
    reply(route, { registrations: registered ? [{ _id: "r1".padEnd(24, "0"), event: event(daysAhead), status, attended: false, rating: 0, feedback: "" }] : [] })
  );
  let current = link;
  await page.route(`**/api/events/${ID}/join-link`, (route) => {
    const req = route.request();
    if (linkStatus !== 200) return reply(route, { message: "Register for this event to see its link" }, linkStatus);
    if (req.method() === "PUT") {
      current = req.postDataJSON().link;
      calls.push(`put ${current}`);
      return reply(route, { message: current ? "Link saved" : "Link removed", link: current });
    }
    calls.push("get");
    return reply(route, { link: current });
  });
  return calls;
}

test("a registered student sees Join online, opening the link in a new tab", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await api(page, { registered: true });
  await page.goto(`/events/${ID}`);
  const join = page.getByRole("link", { name: "Join online" });
  await expect(join).toHaveAttribute("href", LINK);
  await expect(join).toHaveAttribute("target", "_blank");
  await expect(join).toHaveAttribute("rel", /noopener/);
  await expect(page.getByLabel("Meeting link (https://...)")).toHaveCount(0); // students can't edit
  expect(quiet(problems)).toEqual([]);
});

test("a student who isn't registered never asks for, or sees, the link", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await api(page, { registered: false });
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Share this event" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join online" })).toHaveCount(0);
  expect(calls).toEqual([]);
});

test("a pending (not yet approved) registration gets no link", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await api(page, { registered: true, status: "pending" });
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Share this event" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join online" })).toHaveCount(0);
  expect(calls).toEqual([]);
});

test("after the event the Join online button is gone", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await api(page, { registered: true, daysAhead: -2 });
  await page.goto(`/events/${ID}`);
  await expect(page.getByText("You attended this event").or(page.getByText("You were registered for this event"))).toBeVisible();
  await expect(page.getByRole("link", { name: "Join online" })).toHaveCount(0);
});

test("if the server refuses the link, nothing is shown", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await api(page, { registered: true, linkStatus: 403 });
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Share this event" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join online" })).toHaveCount(0);
});

test("an admin sets, then removes, the link", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  const calls = await api(page, { link: "" });
  await page.goto(`/events/${ID}`);
  const input = page.getByLabel("Meeting link (https://...)");
  await expect(input).toBeVisible();
  await expect(page.getByRole("button", { name: "Save link" })).toBeDisabled();
  await input.fill(LINK);
  await page.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByText("Link saved").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Join online" })).toHaveAttribute("href", LINK);
  await input.fill("");
  await page.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByText("Link removed").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Join online" })).toHaveCount(0);
  expect(calls).toEqual(["get", `put ${LINK}`, "put "]);
  expect(quiet(problems)).toEqual([]);
});

test("an admin's bad link shows the server's reason", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await api(page, { link: "" });
  await page.route(`**/api/events/${ID}/join-link`, (route) =>
    route.request().method() === "PUT" ? reply(route, { message: "Paste a link that starts with https://" }, 400) : reply(route, { link: "" })
  );
  await page.goto(`/events/${ID}`);
  await page.getByLabel("Meeting link (https://...)").fill("http://example.com");
  await page.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByText("Paste a link that starts with https://").first()).toBeVisible();
});

test("Nepali: the heading, button and note are translated and accessible", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "admin" });
  await api(page);
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("heading", { name: "अनलाइन लिङ्क" })).toBeVisible();
  await expect(page.getByRole("link", { name: "अनलाइन सामेल हुनुहोस्" })).toBeVisible();
  await expect(page.getByRole("button", { name: "लिङ्क सुरक्षित गर्नुहोस्" })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});
