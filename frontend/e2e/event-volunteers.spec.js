import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Helper roles on an event page: students sign up for one role, organisers
// see who signed up and edit the roles, visitors can only read.
const ID = "v1".padEnd(24, "0");
const DAY = 864e5;
const event = (offsetDays = 6) => ({ _id: ID, title: "Open Mic", description: "Bring a song.", date: new Date(Date.now() + offsetDays * DAY).toISOString(), location: "Main Hall", capacity: 60, registeredCount: 10, category: "Social", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0 });
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|409|429)/.test(p));
const role = (n, name, slots, filled, volunteers) => ({ _id: `r${n}`.padEnd(24, "0"), name, slots, filled, ...(volunteers ? { volunteers } : {}) });

async function withVolunteerApi(page, { ev = event(), roles = [role(1, "Registration desk", 2, 1), role(2, "Setup crew", 3, 0)], mine = null, staff = false, failPost } = {}) {
  const state = { roles, mine, calls: [] };
  const view = () => ({
    roles: state.roles.map((r) => ({ ...r, ...(staff ? { volunteers: r.volunteers || [] } : {}) })),
    mine: state.mine,
    past: false,
  });
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: ev }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route(`**/api/events/${ID}/volunteer-roles`, (route) => {
    const body = route.request().postDataJSON();
    state.calls.push({ saved: body.roles });
    state.roles = body.roles.map((r, i) => ({ _id: r._id || `n${i}`.padEnd(24, "0"), name: r.name, slots: r.slots, filled: 0, volunteers: [] }));
    return reply(route, { message: "Volunteer roles saved", ...view() });
  });
  await page.route(`**/api/events/${ID}/volunteers`, (route) => {
    const method = route.request().method();
    if (method === "GET") return reply(route, view());
    if (method === "POST") {
      if (failPost) return reply(route, { message: failPost }, 400);
      const { role: id } = route.request().postDataJSON();
      state.calls.push(`join ${id}`);
      state.mine = id;
      state.roles = state.roles.map((r) => (r._id === id ? { ...r, filled: r.filled + 1 } : r));
      return reply(route, { message: "You're signed up to help!" }, 201);
    }
    state.calls.push("leave");
    state.roles = state.roles.map((r) => (r._id === state.mine ? { ...r, filled: r.filled - 1 } : r));
    state.mine = null;
    return reply(route, { message: "You're no longer helping at this event." });
  });
  return state;
}

test("a student signs up for a role, sees it taken, and can cancel", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  const state = await withVolunteerApi(page);
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  await expect(section.getByText("1 of 2 places taken")).toBeVisible();
  await expect(section.getByText("0 of 3 places taken")).toBeVisible();
  await section.getByRole("listitem").filter({ hasText: "Setup crew" }).getByRole("button", { name: "Sign up to help" }).click();
  await expect(section.getByText("You're helping here")).toBeVisible();
  await expect(section.getByText("1 of 3 places taken")).toBeVisible();
  // One role per event: the other sign-up button is switched off.
  await expect(section.getByRole("button", { name: "Sign up to help" })).toBeDisabled();
  expect(state.calls).toEqual([`join ${"r2".padEnd(24, "0")}`]);
  await section.getByRole("button", { name: "Cancel" }).click();
  await expect(section.getByText("You're helping here")).toHaveCount(0);
  await expect(section.getByText("0 of 3 places taken")).toBeVisible();
  expect(state.calls).toEqual([`join ${"r2".padEnd(24, "0")}`, "leave"]);
  expect(quiet(problems)).toEqual([]);
});

test("a full role shows Full instead of a button", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withVolunteerApi(page, { roles: [role(1, "Desk", 1, 1), role(2, "Setup crew", 3, 0)] });
  await page.goto(`/events/${ID}`);
  const item = page.getByRole("region", { name: "Help out" }).getByRole("listitem").filter({ hasText: "Desk" });
  await expect(item.getByText("Full", { exact: true })).toBeVisible();
  await expect(item.getByRole("button")).toHaveCount(0);
});

test("a refused sign-up shows the server's reason", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withVolunteerApi(page, { failPost: "This role is full" });
  await page.goto(`/events/${ID}`);
  await page.getByRole("button", { name: "Sign up to help" }).first().click();
  await expect(page.getByText("This role is full").first()).toBeVisible();
});

test("a visitor can read the roles but is asked to log in; no roles means no section", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await withVolunteerApi(page);
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  await expect(section.getByText("Registration desk")).toBeVisible();
  await expect(section.getByRole("button")).toHaveCount(0);
  await expect(section.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  await page.unroute(`**/api/events/${ID}/volunteers`);
  await page.route(`**/api/events/${ID}/volunteers`, (route) => reply(route, { roles: [], mine: null, past: false }));
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("heading", { name: "Open Mic" }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Help out" })).toHaveCount(0);
});

test("an event that is over shows the roles but no sign-up buttons", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withVolunteerApi(page, { ev: event(-3) });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  await expect(section.getByText("Registration desk")).toBeVisible();
  await expect(section.getByRole("button")).toHaveCount(0);
});

test("an organiser sees who signed up and edits the roles", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  const state = await withVolunteerApi(page, {
    staff: true,
    roles: [role(1, "Registration desk", 2, 1, [{ name: "Ram Thapa", email: "ram@x.np" }]), role(2, "Setup crew", 3, 0, [])],
  });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  await expect(section.getByText("Ram Thapa")).toBeVisible();
  await expect(section.getByText("No one yet.")).toBeVisible();
  await section.getByRole("button", { name: "Edit roles" }).click();
  await section.getByLabel("Role name").first().fill("Front desk");
  await section.getByRole("button", { name: "Remove Setup crew" }).click();
  await section.getByRole("button", { name: "Add a role" }).click();
  await section.getByLabel("Role name").last().fill("Stage helpers");
  await section.getByLabel("Places").last().fill("4");
  await section.getByRole("button", { name: "Save roles" }).click();
  await expect(section.getByText("Stage helpers")).toBeVisible();
  expect(state.calls).toEqual([
    { saved: [{ _id: "r1".padEnd(24, "0"), name: "Front desk", slots: 2 }, { name: "Stage helpers", slots: 4 }] },
  ]);
  expect(quiet(problems)).toEqual([]);
});

test("with no roles an organiser can add the first one, up to five in all", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withVolunteerApi(page, { staff: true, roles: [] });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  await section.getByRole("button", { name: "Add volunteer roles" }).click();
  for (let i = 0; i < 5; i++) await section.getByRole("button", { name: "Add a role" }).click();
  await expect(section.getByLabel("Role name")).toHaveCount(5);
  await expect(section.getByRole("button", { name: "Add a role" })).toHaveCount(0);
  await section.getByRole("button", { name: "Cancel" }).click();
  await expect(section.getByRole("button", { name: "Add volunteer roles" })).toBeVisible();
});

test("Nepali: headings, counts and the sign-up pop-up are translated, and the page is accessible", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "student" });
  await withVolunteerApi(page);
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "सहयोग गर्नुहोस्" });
  await expect(section.getByText("2 मध्ये 1 स्थान भरिए")).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await section.getByRole("button", { name: "सहयोग गर्न साइन अप गर्नुहोस्" }).first().click();
  await expect(page.getByText("तपाईं सहयोग गर्न साइन अप हुनुभयो!").first()).toBeVisible();
  await expect(section.getByText("तपाईं यहाँ सहयोग गर्दै हुनुहुन्छ")).toBeVisible();
});

test("the Help out box, including its edit form, passes the accessibility checks in dark mode", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.addInitScript(() => localStorage.setItem("pcps_theme", "dark"));
  await withVolunteerApi(page, { staff: true, roles: [role(1, "Registration desk", 2, 1, [{ name: "Ram Thapa", email: "ram@x.np" }]), role(2, "Setup crew", 1, 1, [{ name: "Gita K", email: "g@x.np" }])] });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  await expect(section.getByText("Ram Thapa")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
  await section.getByRole("button", { name: "Edit roles" }).click();
  await expect(section.getByLabel("Role name").first()).toBeVisible();
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
});

test("an organiser can download the helpers as a CSV (formula-looking names are made safe)", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withVolunteerApi(page, {
    staff: true,
    roles: [role(1, "Registration desk", 2, 2, [{ name: "Ram Thapa", email: "ram@x.np" }, { name: '=HYPERLINK("http://evil")', email: "e@x.np" }]), role(2, "Setup crew", 3, 0, [])],
  });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  const [download] = await Promise.all([page.waitForEvent("download"), section.getByRole("button", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toBe("open-mic-volunteers.csv");
  const body = await (await import("node:fs/promises")).readFile(await download.path(), "utf8");
  // The file starts with a byte-order mark so Excel shows Nepali names correctly.
  expect(body.startsWith("\uFEFF")).toBe(true);
  expect(body.slice(1).split("\r\n")).toEqual([
    '"Role","Name","Email"',
    '"Registration desk","Ram Thapa","ram@x.np"',
    `"Registration desk","'=HYPERLINK(""http://evil"")","e@x.np"`,
  ]);
});

test("the CSV button only appears for organisers when someone has signed up", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withVolunteerApi(page, { staff: true, roles: [role(1, "Desk", 2, 0, [])] });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  await expect(section.getByRole("button", { name: "Edit roles" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Export CSV" })).toHaveCount(0);
});

test("a student never sees the CSV button", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withVolunteerApi(page);
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("region", { name: "Help out" }).getByText("Registration desk")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV" })).toHaveCount(0);
});
