import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// A club leader's "My Clubs": who is waiting to join (approve / decline with a
// note), the member list, and an email to all members.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404)/.test(p));
const C = clubs[0];
const member = (n, name) => ({ _id: `m${n}`.padEnd(24, "0"), name, email: `${name.split(" ")[0].toLowerCase()}@patancollege.edu.np`, studentId: `PCPS-${n}`, joinedAt: new Date().toISOString() });
const request = (n, name) => ({ _id: `q${n}`.padEnd(24, "0"), name, email: `${name.split(" ")[0].toLowerCase()}@patancollege.edu.np`, studentId: `PCPS-9${n}`, requestedAt: new Date(Date.now() - 3 * 3600e3).toISOString() });

async function withLeader(page, { members = [member(1, "Asha Rai"), member(2, "Bikash Thapa")], requests = [request(1, "Pema Sherpa"), request(2, "Tenzing Gurung")], led = [C], failDecision } = {}) {
  let reqs = requests;
  const calls = [];
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: led }));
  await page.route("**/api/admin/club-request-counts", (route) => reply(route, { counts: { [C._id]: reqs.length } }));
  await page.route(`**/api/admin/clubs/${C._id}/members`, (route) => reply(route, { members }));
  await page.route(`**/api/admin/clubs/${C._id}/requests`, (route) => reply(route, { requests: reqs }));
  await page.route(`**/api/admin/clubs/${C._id}/requests/*/decision`, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").slice(-2)[0];
    const body = route.request().postDataJSON();
    if (failDecision) return reply(route, { message: failDecision }, failDecision === "gone" ? 404 : 400);
    calls.push(`${body.decision} ${id}${body.reason ? ` "${body.reason}"` : ""}`);
    reqs = reqs.filter((r) => r._id !== id);
    return reply(route, { message: "ok" });
  });
  await page.route(`**/api/admin/clubs/${C._id}/announce`, (route) => {
    calls.push(`announce ${route.request().postDataJSON().message}`);
    return reply(route, { message: "Sent to 12 members." });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`My Clubs lists the clubs led, with how many are waiting (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    await withLeader(page);
    await page.goto("/admin/my-clubs");
    await expect(page.getByRole("heading", { level: 1, name: en ? "My Clubs" : "मेरा क्लबहरू" })).toBeVisible();
    await expect(page.getByText(C.name, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: en ? /View members.*2 waiting/ : /सदस्यहरू हेर्नुहोस्/ })).toBeVisible();
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("a member of no club's staff has nothing to open here", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withLeader(page, { led: [] });
  await page.goto("/admin/my-clubs");
  await expect(page).not.toHaveURL(/\/admin\/my-clubs/);
});

test("the member list shows who joined and who is waiting", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withLeader(page);
  await page.goto("/admin/my-clubs");
  await page.getByRole("button", { name: /View members/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("2 members, newest first")).toBeVisible();
  await expect(dialog.getByText("Bikash Thapa")).toBeVisible();
  await expect(dialog.getByText("2 students waiting for your decision")).toBeVisible();
  await expect(dialog.getByText(/pema@patancollege.edu.np · PCPS-91 · 3 h ago/)).toBeVisible();
  await page.waitForTimeout(600);
  expect(await axeViolations(page)).toEqual([]);
});

test("approving a request makes the student a member straight away", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await withLeader(page);
  await page.goto("/admin/my-clubs");
  await page.getByRole("button", { name: /View members/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Approve Pema Sherpa" }).click();
  await expect(page.getByText("Pema Sherpa is now a member.")).toBeVisible();
  await expect(dialog.getByText("1 student waiting for your decision")).toBeVisible();
  await expect(dialog.getByText("3 members, newest first")).toBeVisible();
  expect(calls).toEqual(["approve " + "q1".padEnd(24, "0")]);
});

test("declining can carry a note for the student, and is optional", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await withLeader(page);
  await page.goto("/admin/my-clubs");
  await page.getByRole("button", { name: /View members/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Decline Tenzing Gurung" }).click();
  await dialog.getByLabel("Note for Tenzing Gurung (optional)").fill("Come back next semester");
  await dialog.getByRole("button", { name: "Send decline" }).click();
  await expect(page.getByText("Declined Tenzing Gurung.")).toBeVisible();
  await dialog.getByRole("button", { name: "Decline Pema Sherpa" }).click();
  await dialog.getByRole("button", { name: "Send decline" }).click();
  await expect(page.getByText("Declined Pema Sherpa.")).toBeVisible();
  await expect(dialog.getByText(/waiting for your decision/)).toHaveCount(0);
  expect(calls).toEqual(['reject ' + "q2".padEnd(24, "0") + ' "Come back next semester"', "reject " + "q1".padEnd(24, "0")]);
});

test("a request someone else already handled just disappears with an error", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await withLeader(page, { failDecision: "gone" });
  await page.goto("/admin/my-clubs");
  await page.getByRole("button", { name: /View members/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Approve Pema Sherpa" }).click();
  await expect(page.getByText("gone")).toBeVisible();
  await expect(dialog.getByText("Pema Sherpa")).toHaveCount(0);
  await expect(dialog.getByText("Tenzing Gurung")).toBeVisible();
  expect(quiet(problems)).toEqual([]);
});

test("a long member list can be searched, and a club with no members says so", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withLeader(page, { requests: [], members: Array.from({ length: 10 }, (_, i) => member(i + 1, `Member${i + 1} Person`)) });
  await page.goto("/admin/my-clubs");
  await page.getByRole("button", { name: /View members/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Find by name, email or student ID...").fill("member7");
  await expect(dialog.getByText("Member7 Person")).toBeVisible();
  await expect(dialog.getByText("Member2 Person")).toHaveCount(0);
  await dialog.getByPlaceholder("Find by name, email or student ID...").fill("nobody");
  await expect(dialog.getByText("No one matches that search.")).toBeVisible();
});

test("an empty club says no one has joined", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withLeader(page, { members: [], requests: [] });
  await page.goto("/admin/my-clubs");
  await page.getByRole("button", { name: /View members/ }).click();
  await expect(page.getByRole("dialog").getByText("No one has joined this club yet.")).toBeVisible();
});

test("messaging members needs text, shows the count, and sends once", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await withLeader(page);
  await page.goto("/admin/my-clubs");
  await page.getByRole("button", { name: "Message members" }).click();
  const dialog = page.getByRole("dialog");
  const send = dialog.getByRole("button", { name: "Send", exact: true });
  await expect(send).toBeDisabled();
  await expect(dialog.getByLabel(/Message to everyone who joined this club/)).toBeFocused();
  await dialog.getByLabel(/Message to everyone who joined this club/).fill("Meeting moved to Friday");
  await expect(dialog.getByText(/^23\/1000/)).toBeVisible();
  await send.click();
  await expect(page.getByText("Sent to 12 members.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls).toEqual(["announce Meeting moved to Friday"]);
});
