import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The campus notice board: post, filter, remove, and who may remove what.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|403|404|500)/.test(p));
const post = (id, category, title, mine = false) => ({
  _id: id, category, title, body: `Details of ${title}`, contact: mine ? "98xxxxxxxx" : "", authorName: mine ? "Sita" : "Ram",
  createdAt: "2030-01-05T10:00:00.000Z", expiresAt: "2030-01-19T10:00:00.000Z", mine,
});
const POSTS = [post("p1", "lost", "Black umbrella", true), post("p2", "found", "Blue keyring"), post("p3", "notice", "Study group")];

test("the board lists live posts and the filter narrows them", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/board", (route) => reply(route, { posts: POSTS }));
  await page.goto("/board");
  await expect(page.getByRole("heading", { name: "Notice board" })).toBeVisible();
  await expect(page.getByText("Black umbrella", { exact: true })).toBeVisible();
  await expect(page.getByText("Blue keyring", { exact: true })).toBeVisible();
  await expect(page.getByText("Contact: 98xxxxxxxx")).toBeVisible();
  await page.getByRole("button", { name: "Found" }).click();
  await expect(page.getByText("Blue keyring", { exact: true })).toBeVisible();
  await expect(page.getByText("Black umbrella", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Found" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Lost" }).click();
  await expect(page.getByText("Black umbrella", { exact: true })).toBeVisible();
  expect(quiet(problems)).toEqual([]);
});

test("a student can post, and the new post appears at the top", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  let sent = null;
  await page.route("**/api/board", (route) => {
    if (route.request().method() === "POST") {
      sent = route.request().postDataJSON();
      return reply(route, { message: "Posted on the notice board", post: { ...post("p9", "found", "Library card", true) } }, 201);
    }
    return reply(route, { posts: [] });
  });
  await page.goto("/board");
  await expect(page.getByText("Nothing here right now.")).toBeVisible();
  const submit = page.getByRole("button", { name: "Post", exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel("Type").selectOption("found");
  await page.getByLabel("Title").fill("Library card");
  await page.getByLabel("Details").fill("Near the canteen");
  await submit.click();
  await expect(page.getByText("Posted on the notice board").first()).toBeVisible();
  await expect(page.getByText("Library card", { exact: true })).toBeVisible();
  expect(sent).toEqual({ category: "found", title: "Library card", body: "Near the canteen", contact: "" });
  await expect(page.getByLabel("Title")).toHaveValue("");
});

test("a student can remove only their own post, after confirming", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/board", (route) => reply(route, { posts: POSTS }));
  let deleted = "";
  await page.route("**/api/board/p1", (route) => {
    deleted = route.request().method();
    return reply(route, { message: "Post removed" });
  });
  await page.goto("/board");
  await expect(page.getByRole("button", { name: /Remove the post/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Remove the post Black umbrella" }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Post removed").first()).toBeVisible();
  await expect(page.getByText("Black umbrella", { exact: true })).toHaveCount(0);
  expect(deleted).toBe("DELETE");
});

test("an admin sees a remove button on every post", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.route("**/api/board", (route) => reply(route, { posts: POSTS }));
  await page.goto("/board");
  await expect(page.getByRole("button", { name: /Remove the post/ })).toHaveCount(3);
});

test("a server refusal is shown and the board stays as it was", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/board", (route) => {
    if (route.request().method() === "POST") return reply(route, { message: "You already have 3 posts on the board. Remove one to add another." }, 400);
    return reply(route, { posts: POSTS });
  });
  await page.goto("/board");
  await page.getByLabel("Title").fill("Another");
  await page.getByLabel("Details").fill("More");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("You already have 3 posts on the board. Remove one to add another.").first()).toBeVisible();
  await expect(page.getByText("Black umbrella", { exact: true })).toBeVisible();
});

test("if the board can't load, it says so instead of looking empty", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/board", (route) => reply(route, { message: "x" }, 500));
  await page.goto("/board");
  await expect(page.getByText("Couldn't load the notice board. Please try again.")).toBeVisible();
});

test("the Dashboard menu links to the board", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/board", (route) => reply(route, { posts: [] }));
  await page.goto("/settings");
  await page.getByRole("navigation", { name: "Dashboard menu" }).getByRole("link", { name: "Notice board" }).click();
  await expect(page).toHaveURL(/\/board$/);
});

test("Nepali: the page is translated and passes the accessibility checks", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "student" });
  await page.route("**/api/board", (route) => reply(route, { posts: POSTS }));
  await page.goto("/board");
  await expect(page.getByRole("heading", { name: "सूचना पाटी" })).toBeVisible();
  await expect(page.getByText("कालो छाता")).toHaveCount(0); // posts are the students' own words, never translated
  expect(await axeViolations(page)).toEqual([]);
});

test("a student can report someone else's post once; their own post has no Report button", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/board", (route) => reply(route, { posts: POSTS }));
  let reports = 0;
  await page.route("**/api/board/p2/report", (route) => {
    reports += 1;
    return reply(route, { message: "Thanks, an admin will take a look." });
  });
  await page.goto("/board");
  await expect(page.getByRole("button", { name: /^Report the post/ })).toHaveCount(2); // p2 and p3, not their own p1
  await page.getByRole("button", { name: "Report the post Blue keyring" }).click();
  await expect(page.getByText("Thanks, an admin will take a look.").first()).toBeVisible();
  await expect(page.getByText("You reported this post")).toBeVisible();
  await expect(page.getByRole("button", { name: "Report the post Blue keyring" })).toHaveCount(0);
  expect(reports).toBe(1);
});

test("an already-reported post shows that, and a failed report says so", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/board", (route) => reply(route, { posts: [{ ...post("p2", "found", "Blue keyring"), reported: true }, post("p3", "notice", "Study group")] }));
  await page.route("**/api/board/p3/report", (route) => reply(route, { message: "boom" }, 500));
  await page.goto("/board");
  await expect(page.getByText("You reported this post")).toBeVisible();
  await page.getByRole("button", { name: "Report the post Study group" }).click();
  await expect(page.getByText("boom").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Report the post Study group" })).toBeVisible();
});

test("an admin sees the report count and no Report button", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.route("**/api/board", (route) => reply(route, { posts: [{ ...post("p2", "found", "Blue keyring"), reportCount: 3 }] }));
  await page.goto("/board");
  await expect(page.getByText("Reported 3 times")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Report the post/ })).toHaveCount(0);
});
