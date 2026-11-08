import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Public questions and answers on an event page: a student asks, an organiser
// answers, the asker or an organiser can delete, and visitors can only read.
const ID = "q1".padEnd(24, "0");
const DAY = 864e5;
const event = (offsetDays = 6) => ({ _id: ID, title: "Open Mic", description: "Bring a song.", date: new Date(Date.now() + offsetDays * DAY).toISOString(), location: "Main Hall", capacity: 60, registeredCount: 10, category: "Social", price: "Free", club: clubs[0], averageRating: 0, ratingCount: 0 });
const q = (n, question, extra = {}) => ({ _id: `qq${n}`.padEnd(24, "0"), question, authorName: "Sita", createdAt: new Date().toISOString(), answer: "", mine: false, ...extra });
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|409|429)/.test(p));

async function withQuestionsApi(page, { ev = event(), list = [], failPost, led = [] } = {}) {
  let questions = list;
  const calls = [];
  // The shared mock answers every "/clubs" URL with all clubs; a student leads none.
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: led }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: ev }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => {
    const req = route.request();
    const method = req.method();
    const path = new URL(req.url()).pathname;
    if (method === "GET") return reply(route, { questions });
    if (method === "POST") {
      if (failPost) return reply(route, { message: failPost }, 429);
      const { question } = req.postDataJSON();
      calls.push(`ask ${question}`);
      const made = q(questions.length + 1, question, { authorName: "Asha", mine: true });
      questions = [made, ...questions];
      return reply(route, { question: made }, 201);
    }
    if (method === "PUT") {
      const id = path.split("/").slice(-2)[0];
      const { answer } = req.postDataJSON();
      calls.push(`answer ${answer}`);
      questions = questions.map((x) => (x._id === id ? { ...x, answer, answeredByName: "Admin User" } : x));
      return reply(route, { question: questions.find((x) => x._id === id) });
    }
    calls.push("delete " + path.split("/").pop());
    questions = questions.filter((x) => x._id !== path.split("/").pop());
    return reply(route, { message: "deleted" });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`a student asks a question and sees it posted (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    const calls = await withQuestionsApi(page);
    await page.goto(`/events/${ID}`);
    await expect(page.getByRole("heading", { name: en ? "Questions & answers" : "प्रश्न र उत्तर" })).toBeVisible();
    await expect(page.getByText(en ? "No questions yet." : "अहिलेसम्म कुनै प्रश्न छैन।")).toBeVisible();
    const ask = page.getByRole("button", { name: en ? "Ask" : "सोध्नुहोस्", exact: true });
    await expect(ask).toBeDisabled();
    await page.getByLabel(en ? "Ask the organisers" : "आयोजकलाई सोध्नुहोस्").fill("Do I need to bring a laptop?");
    await ask.click();
    await expect(page.getByText(en ? "Question posted. You'll get an email when it's answered." : "प्रश्न पोस्ट भयो। जवाफ आएपछि तपाईंलाई इमेल आउनेछ।")).toBeVisible();
    await expect(page.locator("li", { hasText: "Do I need to bring a laptop?" })).toContainText(en ? "Waiting for an answer" : "जवाफको प्रतीक्षामा");
    await expect(page.getByLabel(en ? "Ask the organisers" : "आयोजकलाई सोध्नुहोस्")).toHaveValue("");
    expect(calls).toEqual(["ask Do I need to bring a laptop?"]);
    expect(await axeViolations(page)).toEqual([]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("a visitor can read questions but is asked to log in to ask", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await withQuestionsApi(page, { list: [q(1, "Is food provided?", { answer: "Yes, snacks.", answeredByName: "Admin User" })] });
  await page.goto(`/events/${ID}`);
  const item = page.locator("li", { hasText: "Is food provided?" });
  await expect(item).toContainText("Yes, snacks.");
  await expect(item).toContainText("Answered by Admin User");
  await expect(item).toContainText("Sita asked");
  await expect(page.getByLabel("Ask the organisers")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Log in" }).last()).toBeVisible();
  await expect(item.getByRole("button")).toHaveCount(0);
});

test("a refused question shows the reason and keeps the text", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await withQuestionsApi(page, { failPost: "You're asking too fast. Try again later." });
  await page.goto(`/events/${ID}`);
  await page.getByLabel("Ask the organisers").fill("Is there parking?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByText("You're asking too fast. Try again later.")).toBeVisible();
  await expect(page.getByLabel("Ask the organisers")).toHaveValue("Is there parking?");
  expect(quiet(problems)).toEqual([]);
});

test("a student can delete their own question but not someone else's", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await withQuestionsApi(page, { list: [q(1, "Mine to remove", { mine: true }), q(2, "Someone else's")] });
  await page.goto(`/events/${ID}`);
  await expect(page.locator("li", { hasText: "Someone else's" }).getByRole("button")).toHaveCount(0);
  await page.getByRole("button", { name: "Delete the question from Sita" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Mine to remove")).toBeVisible();
  await page.getByRole("button", { name: "Delete the question from Sita" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Question deleted.")).toBeVisible();
  await expect(page.getByText("Mine to remove")).toHaveCount(0);
  expect(calls).toEqual(["delete " + "qq1".padEnd(24, "0")]);
});

test("an admin answers a question, then edits the answer", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withQuestionsApi(page, { list: [q(1, "Is food provided?")] });
  await page.goto(`/events/${ID}`);
  const item = page.locator("li", { hasText: "Is food provided?" });
  await item.getByRole("button", { name: "Answer" }).click();
  const save = item.getByRole("button", { name: "Save answer" });
  await expect(save).toBeDisabled();
  await item.getByLabel("Your answer").fill("Snacks yes");
  await save.click();
  await expect(page.getByText("Answer saved.")).toBeVisible();
  await expect(item).toContainText("Snacks yes");
  await expect(item).toContainText("Answered by Admin User");
  await item.getByRole("button", { name: "Edit answer" }).click();
  await expect(item.getByLabel("Your answer")).toHaveValue("Snacks yes");
  await item.getByRole("button", { name: "Cancel" }).click();
  await expect(item.getByLabel("Your answer")).toHaveCount(0);
  expect(calls).toEqual(["answer Snacks yes"]);
});

test("after the event, students can't ask any more; old answers stay readable", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withQuestionsApi(page, { ev: event(-3), list: [q(1, "Was it recorded?", { answer: "Yes.", answeredByName: "Admin User" })] });
  await page.goto(`/events/${ID}`);
  await expect(page.getByText("Was it recorded?")).toBeVisible();
  await expect(page.getByLabel("Ask the organisers")).toHaveCount(0);
});

test("a finished event with no questions leaves the section out", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withQuestionsApi(page, { ev: event(-3) });
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("heading", { name: "Open Mic", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questions & answers" })).toHaveCount(0);
});

test("a club leader can answer questions on their own club's events only", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withQuestionsApi(page, { led: [clubs[0]], list: [q(1, "Is food provided?")] });
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Answer" })).toBeVisible();
});

test("a leader of a different club can't answer on this event", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withQuestionsApi(page, { led: [clubs[1]], list: [q(1, "Is food provided?")] });
  await page.goto(`/events/${ID}`);
  await expect(page.getByText("Is food provided?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Answer" })).toHaveCount(0);
});
