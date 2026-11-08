import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// The club idea box: a member suggests something and can take it back, a
// non-member sees no box at all, and a leader reads every member's ideas.
const club = clubs[0];
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const label = {
  en: { box: "Suggest an idea", field: "Your idea for the club", send: "Send idea", sent: "Idea sent to the club's leaders.", removed: "Idea removed.", leaderBox: "Ideas from members" },
  ne: { box: "विचार सुझाउनुहोस्", field: "क्लबका लागि तपाईंको विचार", send: "विचार पठाउनुहोस्", sent: "विचार क्लबका नेताहरूलाई पठाइयो।", removed: "विचार हटाइयो।", leaderBox: "सदस्यहरूका विचारहरू" },
};

async function withIdeasApi(page, { member, leader, others = [] }) {
  const calls = [];
  let ideas = [...others];
  await page.route("**/api/club-memberships/my", (route) => reply(route, { memberships: member ? [{ _id: "m1", club }] : [] }));
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: leader ? [club] : [] }));
  await page.route(`**/api/clubs/${club._id}/ideas`, (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const { body } = req.postDataJSON();
      calls.push(`send ${body}`);
      const idea = { _id: `i${ideas.length + 1}`, body, authorName: "Asha", createdAt: new Date().toISOString(), mine: true };
      ideas = [idea, ...ideas];
      return reply(route, { message: "ok", idea }, 201);
    }
    return reply(route, { ideas: leader ? ideas : ideas.filter((i) => i.mine), canReadAll: !!leader });
  });
  await page.route(`**/api/clubs/${club._id}/ideas/*`, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    calls.push(`remove ${id}`);
    ideas = ideas.filter((i) => i._id !== id);
    return reply(route, { message: "Idea removed" });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  test(`a member can suggest an idea and take it back (${lang})`, async ({ page }) => {
    const l = label[lang];
    const problems = await setUp(page, { lang, role: "student" });
    const calls = await withIdeasApi(page, { member: true });
    await page.goto(`/clubs?club=${club._id}`);
    const box = page.getByRole("region", { name: l.box });
    await expect(box).toBeVisible();
    await box.getByLabel(l.field).fill("A quiz night with the Robotics Society");
    await box.getByRole("button", { name: l.send }).click();
    await expect(page.getByText(l.sent)).toBeVisible();
    await expect(box.getByText("A quiz night with the Robotics Society")).toBeVisible();
    expect(calls).toEqual(["send A quiz night with the Robotics Society"]);
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);

    await box.getByRole("button", { name: lang === "en" ? /^Remove the idea from/ : /विचार हटाउनुहोस्$/ }).click();
    await expect(page.getByText(l.removed)).toBeVisible();
    await expect(box.getByText("A quiz night with the Robotics Society")).toHaveCount(0);
    expect(calls).toEqual(["send A quiz night with the Robotics Society", "remove i1"]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("a member who already has three ideas waiting must remove one first", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const mine = (n) => ({ _id: `i${n}`, body: `Idea ${n}`, authorName: "Asha", createdAt: new Date().toISOString(), mine: true });
  await withIdeasApi(page, { member: true, others: [mine(1), mine(2), mine(3)] });
  await page.goto(`/clubs?club=${club._id}`);
  const box = page.getByRole("region", { name: "Suggest an idea" });
  await expect(box.getByText("You have 3 ideas waiting. Remove one to add another.")).toBeVisible();
  await expect(box.getByLabel("Your idea for the club")).toBeDisabled();
  await expect(box.getByRole("button", { name: "Send idea" })).toBeDisabled();
});

test("someone who has not joined the club sees no idea box", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withIdeasApi(page, { member: false });
  await page.goto(`/clubs?club=${club._id}`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("region", { name: /idea/i })).toHaveCount(0);
});

test("a leader reads everyone's ideas, and can remove one", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const others = [{ _id: "i9", body: "A trip to Nagarkot", authorName: "Ram", createdAt: new Date().toISOString(), mine: false }];
  const calls = await withIdeasApi(page, { member: false, leader: true, others });
  await page.goto(`/clubs?club=${club._id}`);
  const box = page.getByRole("region", { name: "Ideas from members" });
  await expect(box.getByText("A trip to Nagarkot")).toBeVisible();
  await expect(box.getByText(/Ram ·/)).toBeVisible();
  await expect(box.getByLabel("Your idea for the club")).toHaveCount(0); // not a member, so no form
  await box.getByRole("button", { name: /^Remove the idea from/ }).click();
  await expect(box.getByText("No ideas yet.")).toBeVisible();
  expect(calls).toEqual(["remove i9"]);
});

test("a leader reaches the idea box from My Clubs", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withIdeasApi(page, { member: false, leader: true });
  await page.goto("/admin/my-clubs");
  await page.getByRole("link", { name: "Ideas" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/clubs\\?club=${club._id}`));
  await expect(page.getByRole("region", { name: "Ideas from members" })).toBeVisible();
});

test("the idea box passes the accessibility checks in dark mode, in Nepali", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "student" });
  await page.addInitScript(() => localStorage.setItem("pcps_theme", "dark"));
  const mine = { _id: "i1", body: "A quiz night", authorName: "Asha", createdAt: new Date().toISOString(), mine: true };
  await withIdeasApi(page, { member: true, others: [mine] });
  await page.goto(`/clubs?club=${club._id}`);
  await expect(page.getByRole("region", { name: label.ne.box })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  expect(await axeViolations(page)).toEqual([]);
});
