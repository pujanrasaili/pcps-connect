import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Joining a club: an open club is joined straight away, a club that approves
// its members takes a request that can be withdrawn, and a visitor is sent to
// log in first.
const open = clubs[0];
const approval = { ...clubs[1], requiresApproval: true };
const label = {
  en: { join: "Join Club", joined: "Joined", request: "Request to join", sent: "Request sent" },
  ne: { join: "क्लबमा सामेल हुनुहोस्", joined: "सामेल भइसक्नुभयो", request: "सामेल हुन अनुरोध गर्नुहोस्", sent: "अनुरोध पठाइयो" },
};

// The buttons inside the open club window (the club card behind it has its own).
const btn = (page, name) => page.getByRole("dialog").getByRole("button", { name, exact: true });

async function withMembershipApi(page) {
  const calls = [];
  let memberships = [];
  let requests = [];
  const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/clubs", (route) => reply(route, { clubs: [open, approval] }));
  await page.route("**/api/club-memberships/**", (route) => {
    const req = route.request();
    const method = req.method();
    const path = new URL(req.url()).pathname;
    if (path.endsWith("/club-memberships/my")) return reply(route, { memberships });
    if (path.endsWith("/requests/my")) return reply(route, { requests });
    if (method === "POST" && path.endsWith("/join")) {
      const { clubId } = req.postDataJSON();
      calls.push(`join ${clubId === open._id ? "open" : "approval"}`);
      if (clubId === approval._id) {
        requests = [{ _id: "q1", club: clubId }];
        return reply(route, { message: "Request sent", pending: true }, 201);
      }
      memberships = [{ _id: "m1", club: open }];
      return reply(route, { message: "Joined" }, 201);
    }
    if (method === "DELETE") {
      const clubId = path.split("/").pop();
      calls.push(`leave ${clubId === open._id ? "open" : "approval"}`);
      memberships = memberships.filter((m) => m.club._id !== clubId);
      requests = requests.filter((r) => r.club !== clubId);
      return reply(route, { message: "Left" });
    }
    return reply(route, {});
  });
  return calls;
}

test("a visitor who taps Join is sent to log in", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await withMembershipApi(page);
  await page.goto(`/clubs?club=${open._id}`);
  await btn(page, label.en.join).click();
  await expect(page).toHaveURL(/\/login/);
});

for (const lang of ["en", "ne"]) {
  test(`a student can join and leave an open club (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    const calls = await withMembershipApi(page);
    await page.goto(`/clubs?club=${open._id}`);
    await btn(page, label[lang].join).click();
    await expect(btn(page, label[lang].joined)).toBeVisible();
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);
    await btn(page, label[lang].joined).click();
    await expect(btn(page, label[lang].join)).toBeVisible();
    expect(calls).toEqual(["join open", "leave open"]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });

  test(`a student can request to join a club that approves members, then withdraw (${lang})`, async ({ page }) => {
    await setUp(page, { lang, role: "student" });
    const calls = await withMembershipApi(page);
    await page.goto(`/clubs?club=${approval._id}`);
    await btn(page, label[lang].request).click();
    await expect(btn(page, label[lang].sent)).toBeVisible();
    await expect(btn(page, label[lang].joined)).toHaveCount(0);
    await btn(page, label[lang].sent).click();
    await expect(btn(page, label[lang].request)).toBeVisible();
    expect(calls).toEqual(["join approval", "leave approval"]);
  });
}
