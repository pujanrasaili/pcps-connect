import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Organisers tick who really helped; only those students get a volunteering certificate.
const ID = "c1".padEnd(24, "0");
const DAY = 864e5;
const event = (offsetDays) => ({ _id: ID, title: "Open Mic", description: "Bring a song.", date: new Date(Date.now() + offsetDays * DAY).toISOString(), location: "Main Hall", capacity: 60, registeredCount: 10, category: "Social", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0 });
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|409|429)/.test(p));
const R1 = "r1".padEnd(24, "0");

async function api(page, { days = -2, staff = false, mine = null, mineAttended = false, helpers = [], certificate } = {}) {
  const state = { helpers, marks: [] };
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: event(days) }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route(`**/api/events/${ID}/volunteers/*/attended`, (route) => {
    const userId = new URL(route.request().url()).pathname.split("/").slice(-2)[0];
    const { attended } = route.request().postDataJSON();
    state.marks.push([userId, attended]);
    state.helpers = state.helpers.map((h) => (h.userId === userId ? { ...h, attended } : h));
    return reply(route, { message: "ok", attended });
  });
  await page.route(`**/api/events/${ID}/volunteers/certificate`, (route) => (certificate ? reply(route, certificate.body, certificate.status || 200) : reply(route, { message: "no" }, 404)));
  await page.route(`**/api/events/${ID}/volunteers`, (route) =>
    reply(route, {
      roles: [{ _id: R1, name: "Registration desk", slots: 3, filled: state.helpers.length, ...(staff ? { volunteers: state.helpers } : {}) }],
      mine,
      mineAttended,
      past: days < 0,
    })
  );
  return state;
}

const helpers = () => [
  { userId: "u1".padEnd(24, "0"), name: "Ram Thapa", email: "ram@x.np", attended: false },
  { userId: "u2".padEnd(24, "0"), name: "Gita K", email: "g@x.np", attended: true },
];
const certificate = { certificate: { studentName: "Ram Thapa", studentId: "S1", program: "BIT", eventTitle: "Open Mic", eventDate: new Date(Date.now() - 2 * DAY).toISOString(), eventLocation: "Main Hall", clubName: "Music Club", role: "Registration desk", code: `${"a".repeat(24)}.sig` } };

test("after the event an organiser ticks who helped", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  const state = await api(page, { staff: true, helpers: helpers() });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  const ram = section.getByRole("checkbox", { name: /Ram Thapa/ });
  await expect(ram).not.toBeChecked();
  await expect(section.getByRole("checkbox", { name: /Gita K/ })).toBeChecked();
  await ram.click();
  await expect(ram).toBeChecked();
  expect(state.marks).toEqual([["u1".padEnd(24, "0"), true]]);
  await ram.click();
  await expect(ram).not.toBeChecked();
  expect(state.marks.at(-1)).toEqual(["u1".padEnd(24, "0"), false]);
  expect(quiet(problems)).toEqual([]);
});

test("before the event there is nothing to tick, only the names", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await api(page, { days: 3, staff: true, helpers: helpers() });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Help out" });
  await expect(section.getByText("Ram Thapa, Gita K")).toBeVisible();
  await expect(section.getByRole("checkbox")).toHaveCount(0);
});

test("a student marked as helped opens a printable volunteering certificate", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await api(page, { mine: R1, mineAttended: true, helpers: [helpers()[0]], certificate: { body: certificate } });
  await page.goto(`/events/${ID}`);
  await page.getByRole("link", { name: "Volunteer certificate" }).click();
  await expect(page).toHaveURL(new RegExp(`/volunteer-certificate/${ID}`));
  await expect(page.getByRole("heading", { level: 1, name: "Certificate of Volunteering" })).toBeVisible();
  await expect(page.getByText("Ram Thapa", { exact: true })).toBeVisible();
  await expect(page.getByText("volunteered as Registration desk at")).toBeVisible();
  await expect(page.getByText("Open Mic", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the event" })).toHaveAttribute("href", `/events/${ID}`);
  expect(await axeViolations(page)).toEqual([]);
  expect(quiet(problems)).toEqual([]);
});

test("a student who was not marked as helped has no certificate link, and the page refuses them", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await api(page, { mine: R1, mineAttended: false, helpers: [helpers()[0]], certificate: { status: 400, body: { message: "Certificates are only available for events where you helped" } } });
  await page.goto(`/events/${ID}`);
  await expect(page.getByText("You're helping here")).toBeVisible();
  await expect(page.getByRole("link", { name: "Volunteer certificate" })).toHaveCount(0);
  await page.goto(`/volunteer-certificate/${ID}`);
  await expect(page.getByRole("heading", { name: "Couldn't open this certificate" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("only available for events where you helped");
});

test("the public verify page shows the volunteering role", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route("**/api/certificates/verify/**", (route) => reply(route, { valid: true, student: { name: "Ram Thapa" }, event: { title: "Open Mic", date: new Date().toISOString() }, volunteerRole: "Registration desk" }));
  await page.goto("/verify/abc.def");
  await expect(page.getByRole("heading", { name: "Genuine certificate" })).toBeVisible();
  await expect(page.getByText("volunteered as Registration desk at")).toBeVisible();
  await expect(page.getByText("attended", { exact: true })).toHaveCount(0);
});

test("Nepali: the helped tick is translated", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "admin" });
  await api(page, { staff: true, helpers: helpers() });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "सहयोग गर्नुहोस्" });
  await expect(section.getByRole("checkbox", { name: /Ram Thapa.*सहयोग गर्नुभयो/ })).toBeVisible();
});

test("Nepali: the certificate link is translated", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "student" });
  await api(page, { days: -2, mine: R1, mineAttended: true, helpers: [helpers()[0]] });
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("link", { name: "स्वयंसेवक प्रमाणपत्र" })).toBeVisible();
});
