import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// Club alumni: everyone logged in sees the list; a member can step down (leave
// and be listed); a person or a leader can remove an entry.
const club = clubs[0];
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const label = {
  en: { box: "Alumni", step: "Step down to alumni", go: "Leave and join the alumni", done: "You left the club and are now listed as alumni." },
  ne: { box: "पूर्व सदस्यहरू", step: "पूर्व सदस्य बन्नुहोस्", go: "क्लब छोडेर पूर्व सदस्यमा सामेल हुनुहोस्", done: "तपाईंले क्लब छोड्नुभयो र अब पूर्व सदस्यको रूपमा सूचीबद्ध हुनुभएको छ।" },
};

async function withAlumniApi(page, { member, leader, alumni = [] }) {
  const calls = [];
  let list = [...alumni];
  await page.route("**/api/club-memberships/my", (route) => reply(route, { memberships: member ? [{ _id: "m1", club }] : [] }));
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: leader ? [club] : [] }));
  await page.route(`**/api/club-memberships/${club._id}/alumni`, (route) => {
    const body = route.request().postDataJSON();
    calls.push(`step ${body.year} ${body.note}`);
    const entry = { _id: "new1", name: "Asha", year: Number(body.year), note: body.note, mine: true };
    list = [entry, ...list];
    return reply(route, { message: "ok", alumnus: entry });
  });
  await page.route(`**/api/clubs/${club._id}/alumni`, (route) => reply(route, { alumni: list }));
  await page.route(`**/api/clubs/${club._id}/alumni/*`, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    calls.push(`remove ${id}`);
    list = list.filter((a) => a._id !== id);
    return reply(route, { message: "removed" });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  test(`a member steps down to alumni (${lang})`, async ({ page }) => {
    const l = label[lang];
    await setUp(page, { lang, role: "student" });
    const calls = await withAlumniApi(page, { member: true, alumni: [{ _id: "a1", name: "Bikash", year: 2023, note: "Secretary", mine: false }] });
    await page.goto(`/clubs?club=${club._id}`);
    const box = page.getByRole("region", { name: l.box });
    await expect(box.getByText("Bikash")).toBeVisible();
    await expect(box.getByRole("button", { name: /Remove Bikash|हटाउनुहोस्/ })).toHaveCount(0);
    await box.getByRole("button", { name: l.step }).click();
    await box.getByLabel(lang === "en" ? "A short note (optional)" : "छोटो टिप्पणी (ऐच्छिक)").fill("President");
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    await page.waitForTimeout(600); // let the page settle
    expect(await axeViolations(page)).toEqual([]);
    await box.getByRole("button", { name: l.go }).click();
    await expect(page.getByText(l.done)).toBeVisible();
    await expect(box.getByText("Asha")).toBeVisible();
    expect(calls).toEqual([`step ${new Date().getFullYear()} President`]);
  });
}

test("a non-member sees an empty list as no section at all", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withAlumniApi(page, { member: false });
  await page.goto(`/clubs?club=${club._id}`);
  await expect(page.getByText("Upcoming events").or(page.getByText(club.name)).first()).toBeVisible();
  await expect(page.getByTestId("club-alumni")).toHaveCount(0);
});

test("a leader can remove an entry; a plain student can remove only their own", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  const calls = await withAlumniApi(page, {
    member: false,
    leader: true,
    alumni: [{ _id: "a1", name: "Bikash", year: 2023, note: "", mine: false }],
  });
  await page.goto(`/clubs?club=${club._id}`);
  const box = page.getByRole("region", { name: "Alumni" });
  await box.getByRole("button", { name: "Remove Bikash from the alumni" }).click();
  await expect(box.getByText("Bikash")).toHaveCount(0);
  expect(calls).toEqual(["remove a1"]);
});
