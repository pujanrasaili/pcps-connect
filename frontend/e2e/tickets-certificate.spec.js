import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// "My tickets" (check-in codes saved on the phone, works offline) and the
// printable certificate of attendance.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const HOUR = 36e5;
const ticket = (id, title, hoursFromNow) => ({ id, code: `code-${id}`, title, date: new Date(Date.now() + hoursFromNow * HOUR).toISOString(), location: "Main Hall" });
const save = (page, tickets) => page.addInitScript((list) => localStorage.setItem("pcps_tickets_v1", JSON.stringify(list)), tickets);

for (const lang of ["en", "ne"]) {
  const en = lang === "en";

  test(`saved tickets show a QR each, soonest first, and drop old ones (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await save(page, [ticket("b", "Later Workshop", 48), ticket("a", "Hack Night", 5), ticket("old", "Finished Long Ago", -30)]);
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { level: 1, name: en ? "My tickets" : "मेरा टिकट" })).toBeVisible();
    const titles = await page.locator("li h2").allInnerTexts();
    expect(titles).toEqual(["Hack Night", "Later Workshop"]);
    await expect(page.locator("svg title")).toHaveCount(2);
    await expect(page.getByText("Finished Long Ago")).toHaveCount(0);
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });

  test(`with nothing saved the page explains how a ticket gets here (${lang})`, async ({ page }) => {
    await setUp(page, { lang });
    await page.goto("/tickets");
    await expect(page.getByText(en ? "No saved tickets yet" : "अहिलेसम्म कुनै सुरक्षित टिकट छैन")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole("link", { name: en ? "Go to my dashboard" : "मेरो ड्यासबोर्डमा जानुहोस्" }).click();
    await expect(page).toHaveURL(/\/dashboard|\/login/);
  });
}

test("tickets still show, with a notice, when the phone goes offline", async ({ page, context }) => {
  await setUp(page, { lang: "en" });
  await save(page, [ticket("a", "Hack Night", 5)]);
  await page.goto("/tickets");
  await expect(page.getByRole("status")).toHaveCount(0);
  await context.setOffline(true);
  await expect(page.getByRole("status")).toContainText("You're offline");
  await expect(page.locator("li h2", { hasText: "Hack Night" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("a broken saved-tickets entry is ignored instead of crashing the page", async ({ page }) => {
  const problems = await setUp(page, { lang: "en" });
  await page.addInitScript(() => localStorage.setItem("pcps_tickets_v1", "{not json"));
  await page.goto("/tickets");
  await expect(page.getByText("No saved tickets yet")).toBeVisible();
  expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
});

const cert = { code: "ABC-123", studentName: "Asha Rai", studentId: "PCPS-77", program: "BCA", eventTitle: "Hack Night", eventDate: "2026-10-01T10:00:00.000Z", eventLocation: "Main Hall", clubName: "Coding Club" };

test("the certificate shows the attendance and a QR to the public check page", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/registrations/r1/certificate", (route) => reply(route, { certificate: cert }));
  await page.goto("/certificate/r1");
  await expect(page.getByRole("heading", { level: 1, name: "Certificate of Attendance" })).toBeVisible();
  await expect(page.getByText("Asha Rai")).toBeVisible();
  await expect(page.getByText("BCA · ID PCPS-77")).toBeVisible();
  await expect(page.getByText("Hack Night")).toBeVisible();
  await expect(page.getByText(/Main Hall · hosted by Coding Club/)).toBeVisible();
  await expect(page.locator("svg title")).toHaveCount(1);
  // Standalone page: no site navigation, so a printout is just the certificate.
  await expect(page.getByRole("navigation")).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);
  expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
});

test("Print asks the browser to print", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/registrations/r1/certificate", (route) => reply(route, { certificate: cert }));
  await page.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
  await page.goto("/certificate/r1");
  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(1);
});

test("a certificate the student can't have explains why and leads back", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/registrations/r2/certificate", (route) => reply(route, { message: "No certificate: attendance was not recorded" }, 403));
  await page.goto("/certificate/r2");
  await expect(page.getByRole("heading", { name: "Couldn't open this certificate" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("attendance was not recorded");
  await page.getByRole("link", { name: "Back to profile" }).click();
  await expect(page).toHaveURL(/\/profile/);
});

test("logged-out visitors are sent to log in before a certificate", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/certificate/r1");
  await expect(page).toHaveURL(/\/login/);
});
