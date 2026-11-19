import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// A registered student can fix their answers to the sign-up questions.
const ID = "m1".padEnd(24, "0");
const REG = "r1".padEnd(24, "0");
const DAY = 864e5;
const questions = [
  { _id: "a1".padEnd(24, "0"), text: "Phone number?", required: true },
  { _id: "a2".padEnd(24, "0"), text: "Anything we should know?", required: false },
];
const event = { _id: ID, title: "Hack Night", description: "Build things.", date: new Date(Date.now() + 6 * DAY).toISOString(), location: "Lab 2", capacity: 60, registeredCount: 10, category: "Workshop", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0, signupQuestions: questions };
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

for (const lang of ["en", "ne"]) {
  test(`a student edits their sign-up answers (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "student" });
    let answers = [{ question: "Phone number?", answer: "9800000000" }];
    await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
    await page.route(`**/api/events/${ID}`, (route) => reply(route, { event }));
    await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
    await page.route(`**/api/events/${ID}/volunteers`, (route) => reply(route, { roles: [], mine: null, past: false }));
    await page.route("**/api/registrations/my", (route) =>
      reply(route, { registrations: [{ _id: REG, status: "confirmed", answers, event: { _id: ID, title: event.title, date: event.date, location: event.location } }] }));
    let put = null;
    await page.route(`**/api/registrations/${REG}/answers`, (route) => {
      put = route.request().postDataJSON();
      answers = [{ question: "Phone number?", answer: put.answers[0] }];
      return reply(route, { message: "Answers saved", answers });
    });

    await page.goto(`/events/${ID}`);
    const card = page.getByTestId("my-answers");
    await expect(card).toContainText("9800000000");
    await card.getByRole("button").first().click();
    const input = card.getByLabel("Phone number?");
    await expect(input).toHaveValue("9800000000");
    await input.fill("");
    await expect(card.locator("button[type=submit]")).toBeDisabled();
    await input.fill("9811111111");
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
    await card.locator("button[type=submit]").click();
    await expect.poll(() => put).toEqual({ answers: ["9811111111", ""] });
    await expect(card).toContainText("9811111111");
  });
}

test("no answers card when the event has no sign-up questions", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: { ...event, signupQuestions: [] } }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route(`**/api/events/${ID}/volunteers`, (route) => reply(route, { roles: [], mine: null, past: false }));
  await page.route("**/api/registrations/my", (route) =>
    reply(route, { registrations: [{ _id: REG, status: "confirmed", answers: [], event: { _id: ID, title: event.title, date: event.date, location: event.location } }] }));
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("heading", { name: "Hack Night" }).first()).toBeVisible();
  await expect(page.getByTestId("my-answers")).toHaveCount(0);
});

test("a required question added after sign-up is flagged on the card", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route(`**/api/events/${ID}/volunteers`, (route) => reply(route, { roles: [], mine: null, past: false }));
  await page.route("**/api/registrations/my", (route) =>
    reply(route, { registrations: [{ _id: REG, status: "confirmed", answers: [], event: { _id: ID, title: event.title, date: event.date, location: event.location } }] }));
  await page.goto(`/events/${ID}`);
  const note = page.getByTestId("answers-missing");
  await expect(note).toBeVisible();
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
  await page.getByTestId("my-answers").getByRole("button").first().click();
  await expect(note).toHaveCount(0);
});
