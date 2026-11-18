import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Extra sign-up questions: students answer them when registering, organisers
// edit them on the event page.
const ID = "q1".padEnd(24, "0");
const DAY = 864e5;
const questions = [
  { _id: "a1".padEnd(24, "0"), text: "T-shirt size?", required: true },
  { _id: "a2".padEnd(24, "0"), text: "Anything we should know?", required: false },
];
const event = (extra = {}) => ({ _id: ID, title: "Hack Night", description: "Build things.", date: new Date(Date.now() + 6 * DAY).toISOString(), location: "Lab 2", capacity: 60, registeredCount: 10, category: "Workshop", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0, signupQuestions: questions, ...extra });
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

async function mockEvent(page, ev) {
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: ev }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route(`**/api/events/${ID}/volunteers`, (route) => reply(route, { roles: [], mine: null, past: false }));
}

for (const lang of ["en", "ne"]) {
  test(`a student answers the questions when registering (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "student" });
    await mockEvent(page, event());
    let posted = null;
    await page.route("**/api/registrations/register", (route) => {
      posted = route.request().postDataJSON();
      return reply(route, { registration: { status: "confirmed" } }, 201);
    });
    await page.goto(`/events/${ID}`);
    await page.locator("[data-register-cta]").click();
    const fields = page.getByTestId("signup-questions");
    await expect(fields).toBeVisible();
    const required = fields.getByLabel("T-shirt size?");
    const confirm = page.getByRole("dialog").locator("button.btn-primary");
    await expect(confirm).toBeDisabled();
    await required.fill("M");
    await expect(confirm).toBeEnabled();
    await page.waitForTimeout(600); // let the dialog finish fading in
    expect(await axeViolations(page)).toEqual([]);
    await confirm.click();
    await expect.poll(() => posted).toEqual({ eventId: ID, answers: ["M", ""] });
  });
}

test("an organiser adds and saves sign-up questions", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await mockEvent(page, event({ signupQuestions: [] }));
  let saved = null;
  await page.route(`**/api/events/${ID}/signup-questions`, (route) => {
    saved = route.request().postDataJSON();
    return reply(route, { message: "Sign-up questions saved", signupQuestions: [] });
  });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Sign-up questions" });
  await section.getByRole("button", { name: "Add questions" }).click();
  await section.getByRole("button", { name: "Add a question" }).click();
  await section.getByLabel("Question").fill("Phone number?");
  await section.getByLabel("Required").check();
  await section.getByRole("button", { name: "Save questions" }).click();
  await expect.poll(() => saved).toEqual({ questions: [{ text: "Phone number?", required: true }] });
});
