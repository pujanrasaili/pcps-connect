import { test, expect } from "@playwright/test";
import { setUp, student, clubs, axeViolations } from "./helpers.js";

// Feedback questions: organisers add up to three short questions on the event
// page; people who attended can answer them with their star rating.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|403|404|500)/.test(p));

const pastEvent = {
  _id: "f9".padEnd(24, "0"),
  title: "Photo Walk",
  date: new Date(Date.now() - 10 * 864e5).toISOString(),
  location: "Old Town",
  club: clubs[0],
  category: "Workshop",
  price: "Free",
  feedbackQuestions: [{ _id: "q1".padEnd(24, "0"), text: "Was the meeting point easy to find?" }, { _id: "q2".padEnd(24, "0"), text: "What should we change?" }],
};

for (const lang of ["en", "ne"]) {
  test(`a student answers the feedback questions with their rating (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    let registration = { _id: "r9".padEnd(24, "0"), event: pastEvent, status: "confirmed", attended: true, rating: 0, feedback: "", feedbackAnswers: [] };
    let sent = null;
    await page.route("**/api/auth/me", (route) => reply(route, { user: { ...student, language: lang } }));
    await page.route("**/api/registrations/my", (route) => reply(route, { registrations: [registration] }));
    await page.route("**/api/registrations/*/feedback", (route) => {
      sent = route.request().postDataJSON();
      registration = { ...registration, rating: sent.rating, feedbackAnswers: [{ question: pastEvent.feedbackQuestions[0].text, answer: sent.answers[0] }] };
      return reply(route, { message: "Saved" });
    });
    await page.goto("/profile");
    await page.getByRole("button", { name: lang === "en" ? "Rate" : "मूल्याङ्कन", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Was the meeting point easy to find?").fill("Yes, near the gate");
    await expect(dialog.getByLabel("What should we change?")).toBeVisible();
    await dialog.getByRole("radio", { name: lang === "en" ? "5 stars" : /5/ }).first().click();
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
    await dialog.locator("button[type=submit]").click();
    await expect.poll(() => sent).toEqual({ rating: 5, feedback: "", answers: ["Yes, near the gate", ""] });
    expect(quiet(problems)).toEqual([]);
  });
}

test("no extra fields and no answers are sent when the event has no feedback questions", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const registration = { _id: "r9".padEnd(24, "0"), event: { ...pastEvent, feedbackQuestions: [] }, status: "confirmed", attended: true, rating: 0, feedback: "" };
  let sent = null;
  await page.route("**/api/auth/me", (route) => reply(route, { user: student }));
  await page.route("**/api/registrations/my", (route) => reply(route, { registrations: [registration] }));
  await page.route("**/api/registrations/*/feedback", (route) => {
    sent = route.request().postDataJSON();
    return reply(route, { message: "Saved" });
  });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Rate", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByPlaceholder("Optional")).toHaveCount(0);
  await dialog.getByRole("radio", { name: "3 stars" }).click();
  await dialog.getByRole("button", { name: "Submit feedback" }).click();
  await expect.poll(() => sent).toEqual({ rating: 3, feedback: "" });
});

const ID = "fq".padEnd(24, "0");
const event = (extra = {}) => ({ _id: ID, title: "Hack Night", description: "Build things.", date: new Date(Date.now() + 6 * 864e5).toISOString(), location: "Lab 2", capacity: 60, registeredCount: 10, category: "Social", price: "Free", club: clubs[0], ...extra });

test("an organiser adds and saves feedback questions", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: event() }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route(`**/api/events/${ID}/volunteers`, (route) => reply(route, { roles: [], mine: null, past: false }));
  let saved = null;
  await page.route(`**/api/events/${ID}/feedback-questions`, (route) => {
    saved = route.request().postDataJSON();
    return reply(route, { message: "Feedback questions saved", feedbackQuestions: [] });
  });
  await page.goto(`/events/${ID}`);
  const section = page.getByRole("region", { name: "Feedback questions" });
  await section.getByRole("button", { name: "Add feedback questions" }).click();
  await section.getByRole("button", { name: "Add a question" }).click();
  await section.getByLabel("Question").fill("Was the venue easy to find?");
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
  await section.getByRole("button", { name: "Save questions" }).click();
  await expect.poll(() => saved).toEqual({ questions: [{ text: "Was the venue easy to find?" }] });
  await expect(page.getByText("Feedback questions saved")).toBeVisible();
  expect(quiet(problems)).toEqual([]);
});

test("a student does not see the feedback questions editor", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [] }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: event({ feedbackQuestions: [{ text: "Venue?" }] }) }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("heading", { name: "Hack Night", level: 1 })).toBeVisible();
  await expect(page.getByTestId("feedback-questions-editor")).toHaveCount(0);
});
