import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Club polls: a member votes (and can change the vote), a leader starts and
// removes polls, a closed poll can't be voted on, and a non-member sees nothing.
const club = clubs[0];
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const label = {
  en: { box: "Polls", start: "Start a poll", question: "Your question", a1: "Answer 1", a2: "Answer 2", go: "Start poll", started: "Poll started.", saved: "Vote saved.", removed: "Poll removed.", closed: "Closed" },
  ne: { box: "मतदानहरू", start: "मतदान सुरु गर्नुहोस्", question: "तपाईंको प्रश्न", a1: "उत्तर 1", a2: "उत्तर 2", go: "मतदान सुरु गर्नुहोस्", started: "मतदान सुरु भयो।", saved: "मत सुरक्षित गरियो।", removed: "मतदान हटाइयो।", closed: "बन्द भयो" },
};
const day = 86400000;
const makePoll = (over = {}) => ({
  _id: "p1",
  question: "Which day works?",
  options: [{ text: "Friday", count: 2 }, { text: "Saturday", count: 1 }],
  total: 3,
  myVote: null,
  closesAt: new Date(Date.now() + 3 * day).toISOString(),
  closed: false,
  createdAt: new Date().toISOString(),
  ...over,
});

async function withPollsApi(page, { member, leader, polls = [] }) {
  const calls = [];
  let list = [...polls];
  await page.route("**/api/club-memberships/my", (route) => reply(route, { memberships: member ? [{ _id: "m1", club }] : [] }));
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: leader ? [club] : [] }));
  await page.route(`**/api/clubs/${club._id}/polls`, (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const body = req.postDataJSON();
      calls.push(`start ${body.question} | ${body.options.join(",")} | ${body.days}`);
      const poll = makePoll({ _id: `p${list.length + 10}`, question: body.question, options: body.options.map((text) => ({ text, count: 0 })), total: 0 });
      list = [poll, ...list];
      return reply(route, { message: "ok", poll }, 201);
    }
    return reply(route, { polls: list });
  });
  await page.route(`**/api/clubs/${club._id}/polls/*/vote`, (route) => {
    const { option } = route.request().postDataJSON();
    const id = new URL(route.request().url()).pathname.split("/").slice(-2)[0];
    calls.push(`vote ${id} ${option}`);
    list = list.map((p) => {
      if (p._id !== id) return p;
      const options = p.options.map((o, i) => {
        let count = o.count;
        if (p.myVote === i) count -= 1;
        if (i === option) count += 1;
        return { ...o, count };
      });
      return { ...p, options, myVote: option, total: options.reduce((n, o) => n + o.count, 0) };
    });
    return reply(route, { message: "ok", poll: list.find((p) => p._id === id) });
  });
  await page.route(`**/api/clubs/${club._id}/polls/*/close`, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").slice(-2)[0];
    calls.push(`close ${id}`);
    list = list.map((p) => (p._id === id ? { ...p, closed: true } : p));
    return reply(route, { message: "Poll closed", poll: list.find((p) => p._id === id) });
  });
  await page.route(`**/api/clubs/${club._id}/polls/*`, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    calls.push(`remove ${id}`);
    list = list.filter((p) => p._id !== id);
    return reply(route, { message: "Poll removed" });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  test(`a member votes, sees live counts and can change the vote (${lang})`, async ({ page }) => {
    const l = label[lang];
    const problems = await setUp(page, { lang, role: "student" });
    const calls = await withPollsApi(page, { member: true, polls: [makePoll()] });
    await page.goto(`/clubs?club=${club._id}`);
    const box = page.getByRole("region", { name: l.box });
    await expect(box).toBeVisible();
    await expect(box.getByText("Which day works?")).toBeVisible();
    await expect(box.getByRole("button", { name: /Friday/ })).toContainText("67%");
    await box.getByRole("button", { name: /Saturday/ }).click();
    await expect(page.getByText(l.saved)).toBeVisible();
    await expect(box.getByRole("button", { name: /Saturday/ })).toHaveAttribute("aria-pressed", "true");
    await expect(box.getByRole("button", { name: /Saturday/ })).toContainText("50%");
    await box.getByRole("button", { name: /Friday/ }).click();
    await expect(box.getByRole("button", { name: /Friday/ })).toHaveAttribute("aria-pressed", "true");
    expect(calls).toEqual(["vote p1 1", "vote p1 0"]);
    expect(problems).toEqual([]);
  });

  test(`a leader starts a poll and removes it (${lang})`, async ({ page }) => {
    const l = label[lang];
    await setUp(page, { lang, role: "student" });
    const calls = await withPollsApi(page, { member: true, leader: true });
    await page.goto(`/clubs?club=${club._id}`);
    const box = page.getByRole("region", { name: l.box });
    await box.getByRole("button", { name: l.start }).click();
    await box.getByLabel(l.question).fill("Next meeting?");
    await box.getByLabel(l.a1).fill("Friday");
    await box.getByLabel(l.a2).fill("Saturday");
    await box.getByRole("button", { name: l.go }).click();
    await expect(page.getByText(l.started)).toBeVisible();
    await expect(box.getByText("Next meeting?")).toBeVisible();
    await box.getByRole("button", { name: /Next meeting\?/ }).last().click();
    await expect(page.getByText(l.removed)).toBeVisible();
    await expect(box.getByText("Next meeting?")).toHaveCount(0);
    expect(calls).toEqual(["start Next meeting? | Friday,Saturday | 7", "remove p10"]);
  });
}

test("a leader can close an open poll early, after which it can't be voted on or closed again", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await withPollsApi(page, { member: true, leader: true, polls: [makePoll()] });
  await page.goto(`/clubs?club=${club._id}`);
  const box = page.getByRole("region", { name: "Polls" });
  await box.getByRole("button", { name: /Close the poll now: Which day works\?/ }).click();
  await expect(page.getByText("Poll closed.")).toBeVisible();
  await expect(box.getByText("Closed")).toBeVisible();
  await expect(box.getByRole("button", { name: /Friday|Saturday/ })).toHaveCount(0);
  await expect(box.getByRole("button", { name: /Close the poll now/ })).toHaveCount(0);
  expect(calls).toEqual(["close p1"]);
});

test("a closed poll shows results but no vote buttons", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withPollsApi(page, { member: true, polls: [makePoll({ closed: true, myVote: 0 })] });
  await page.goto(`/clubs?club=${club._id}`);
  const box = page.getByRole("region", { name: "Polls" });
  await expect(box.getByText("Closed")).toBeVisible();
  await expect(box.getByText(/Friday/)).toContainText("(your vote)");
  await expect(box.getByRole("button", { name: /Friday|Saturday/ })).toHaveCount(0);
});

test("someone who has not joined the club sees no polls", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withPollsApi(page, { member: false, polls: [makePoll()] });
  await page.goto(`/clubs?club=${club._id}`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("region", { name: "Polls" })).toHaveCount(0);
});

test("the poll box passes the accessibility checks", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withPollsApi(page, { member: true, leader: true, polls: [makePoll()] });
  await page.goto(`/clubs?club=${club._id}`);
  await expect(page.getByRole("region", { name: "Polls" })).toBeVisible();
  // Let the cards behind the popup finish their fade-in before checking colours.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  expect(await axeViolations(page)).toEqual([]);
});
