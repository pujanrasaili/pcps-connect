import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";
import { readFileSync } from "node:fs";

// An organiser at the door: the attendee list (tap to mark attended, approve
// requests, find someone), walk-ins, a message to everyone, the CSV and the waitlist.
const EV = "a1".padEnd(24, "0");
const event = { _id: EV, title: "Hack Night", description: "Test event", date: new Date(Date.now() + 2 * 864e5).toISOString(), location: "Main Hall", capacity: 40, registeredCount: 3, pendingCount: 1, category: "Workshop", price: "Free", club: clubs[0] };
const reg = (i, name, extra = {}) => ({ _id: `g${i}`.padEnd(24, "0"), status: "confirmed", attended: false, createdAt: new Date().toISOString(), user: { name, email: `${name.split(" ")[0].toLowerCase()}@patancollege.edu.np`, studentId: `PCPS-${i}` }, ...extra });
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|409)/.test(p));

async function withAttendeesApi(page, { regs, waitlist = [], walkIn } = {}) {
  let rows = regs || [reg(1, "Asha Rai"), reg(2, "Bikash Thapa", { attended: true, rating: 4, feedback: "Great session" }), reg(3, "Chhori Lama"), reg(4, "Pema Sherpa", { status: "pending" })];
  const calls = [];
  await page.route("**/api/events", (route) => reply(route, { events: [event] }));
  await page.route(`**/api/admin/events/${EV}/registrations`, (route) => reply(route, { registrations: rows, waitlist }));
  await page.route(`**/api/admin/events/${EV}/announce`, (route) => { calls.push(`announce ${route.request().postDataJSON().message}`); return reply(route, { message: "Sent to 4 students." }); });
  await page.route(`**/api/admin/events/${EV}/walk-in`, (route) => {
    calls.push(`walk-in ${route.request().postDataJSON().identifier}`);
    if (walkIn) return reply(route, { message: walkIn }, 400);
    rows = [...rows, reg(9, "Walk Inn", { attended: true })];
    return reply(route, { student: { name: "Walk Inn" }, alreadyCheckedIn: false });
  });
  await page.route("**/api/admin/registrations/*/decision", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").slice(-2)[0];
    const { decision } = route.request().postDataJSON();
    calls.push(`${decision} ${id}`);
    const done = { ...rows.find((r) => r._id === id), status: "confirmed" };
    rows = decision === "approve" ? rows.map((r) => (r._id === id ? done : r)) : rows.filter((r) => r._id !== id);
    return reply(route, { registration: done });
  });
  await page.route(/\/api\/admin\/registrations\/[^/]+$/, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    const { attended } = route.request().postDataJSON();
    calls.push(`attended=${attended} ${id}`);
    rows = rows.map((r) => (r._id === id ? { ...r, attended } : r));
    return reply(route, { registration: rows.find((r) => r._id === id) });
  });
  return calls;
}

async function openAttendees(page, lang = "en") {
  await page.goto("/admin/events");
  await page.getByRole("button", { name: lang === "ne" ? "Hack Night का सहभागीहरू हेर्नुहोस्" : "View attendees for Hack Night" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`the attendee list shows progress, ratings and who is waiting for approval (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "admin" });
    await withAttendeesApi(page);
    const dialog = await openAttendees(page, lang);
    await expect(dialog.getByText("Asha Rai")).toBeVisible();
    await expect(dialog.getByText(en ? "1/3 marked attended · tap a student to toggle" : "1/3 उपस्थित चिन्ह लगाइयो · बदल्न विद्यार्थीमा थिच्नुहोस्")).toBeVisible();
    await expect(dialog.getByText("Great session")).toBeVisible();
    await expect(dialog.getByText(en ? "Waiting for your approval (1)" : "तपाईंको स्वीकृतिको प्रतीक्षामा (1)")).toBeVisible();
    await page.waitForTimeout(600); // let the dialog finish fading in before checking contrast
    expect(await axeViolations(page)).toEqual([]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("tapping a student toggles attendance and tells the server", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withAttendeesApi(page);
  const dialog = await openAttendees(page);
  await dialog.getByRole("button", { name: /Asha Rai/ }).click();
  await expect(dialog.getByText("2/3 marked attended")).toBeVisible();
  await dialog.getByRole("button", { name: /Bikash Thapa/ }).click();
  await expect(dialog.getByText("1/3 marked attended")).toBeVisible();
  expect(calls).toEqual(["attended=true " + "g1".padEnd(24, "0"), "attended=false " + "g2".padEnd(24, "0")]);
});

test("a join request can be approved or declined", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withAttendeesApi(page, { regs: [reg(1, "Asha Rai"), reg(4, "Pema Sherpa", { status: "pending" }), reg(5, "Tenzing Gurung", { status: "pending" })] });
  const dialog = await openAttendees(page);
  await dialog.getByRole("button", { name: "Approve Pema Sherpa" }).click();
  await expect(page.getByText("Approved -- the student has been emailed.")).toBeVisible();
  await expect(dialog.getByText("Waiting for your approval (1)")).toBeVisible();
  await dialog.getByRole("button", { name: "Decline Tenzing Gurung" }).click();
  await expect(page.getByText("Declined -- the student has been emailed.")).toBeVisible();
  await expect(dialog.getByText("Waiting for your approval")).toHaveCount(0);
  expect(calls).toEqual(["approve " + "g4".padEnd(24, "0"), "reject " + "g5".padEnd(24, "0")]);
});

test("a long list can be searched and narrowed to people who haven't arrived", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const many = Array.from({ length: 10 }, (_, i) => reg(i + 1, `Student${i + 1} Person`, { attended: i < 4 }));
  await withAttendeesApi(page, { regs: many });
  const dialog = await openAttendees(page);
  await dialog.getByPlaceholder("Find by name, email or student ID...").fill("student7");
  await expect(dialog.getByRole("button", { name: /Student7 Person/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Student2 Person/ })).toHaveCount(0);
  await dialog.getByPlaceholder("Find by name, email or student ID...").fill("");
  await dialog.getByLabel("Not yet attended").check();
  await expect(dialog.getByRole("button", { name: /Student2 Person/ })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /Student9 Person/ })).toBeVisible();
  await dialog.getByPlaceholder("Find by name, email or student ID...").fill("nobody");
  await expect(dialog.getByText("No one matches.")).toBeVisible();
});

test("a walk-in is added and checked in; a refusal shows the reason", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withAttendeesApi(page);
  const dialog = await openAttendees(page);
  await dialog.getByRole("button", { name: "Add a walk-in" }).click();
  const add = dialog.getByRole("button", { name: "Add and check in" });
  await expect(add).toBeDisabled();
  await dialog.getByLabel("Student who arrived without registering").fill("walk@patancollege.edu.np");
  await add.click();
  await expect(page.getByText("Walk Inn is checked in.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Walk Inn/ })).toBeVisible();
  expect(calls).toEqual(["walk-in walk@patancollege.edu.np"]);
});

test("a walk-in the server refuses (event full) shows why", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  await withAttendeesApi(page, { walkIn: "This event is full" });
  const dialog = await openAttendees(page);
  await dialog.getByRole("button", { name: "Add a walk-in" }).click();
  await dialog.getByLabel("Student who arrived without registering").fill("PCPS-123");
  await dialog.getByRole("button", { name: "Add and check in" }).click();
  await expect(page.getByText("This event is full")).toBeVisible();
  expect(quiet(problems)).toEqual([]);
});

test("messaging everyone needs text and sends it to the whole list", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withAttendeesApi(page);
  const dialog = await openAttendees(page);
  await dialog.getByRole("button", { name: "Message everyone" }).click();
  const send = dialog.getByRole("button", { name: "Send to 4" });
  await expect(send).toBeDisabled();
  await dialog.getByLabel(/Message to all 4 registered students/).fill("Moved to Room B2");
  await send.click();
  await expect(page.getByText("Sent to 4 students.")).toBeVisible();
  await expect(dialog.getByLabel(/Message to all/)).toHaveCount(0);
  expect(calls).toEqual(["announce Moved to Room B2"]);
});

test("Export CSV downloads the list, and the waitlist shows in promotion order", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withAttendeesApi(page, { waitlist: [{ _id: "w1", user: { name: "First Waiter", email: "first@x.np" } }, { _id: "w2", user: { name: "Second Waiter", email: "second@x.np" } }] });
  const dialog = await openAttendees(page);
  await expect(dialog.getByText("Waitlist (2) · promoted in this order when a seat opens")).toBeVisible();
  await expect(dialog.locator("ol li").first()).toContainText("First Waiter");
  const [download] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toBe("hack-night-attendance.csv");
  const csv = readFileSync(await download.path(), "utf8");
  expect(csv).toContain('"Name","Email","Student ID"');
  expect(csv).toContain("Asha Rai");
  expect(csv).toContain("Pending approval");
});

test("an event nobody has registered for says so", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withAttendeesApi(page, { regs: [] });
  const dialog = await openAttendees(page);
  await expect(dialog.getByText("No one has registered for this event yet.")).toBeVisible();
});
