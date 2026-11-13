import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// The core student flow: open an event, register, see the ticket, unregister.
const EVENT_ID = "e2".padEnd(24, "0");
const event = {
  _id: EVENT_ID, title: "Robot Demo", description: "An event used by the browser tests.", date: new Date(Date.now() + 9 * 864e5).toISOString(),
  location: "Main Hall", capacity: 50, registeredCount: 20, category: "Workshop", price: "Free", club: clubs[1], averageRating: 0, ratingCount: 0,
};

async function withRegistrationApi(page) {
  let registration = null;
  const calls = [];
  const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/registrations/**", (route) => {
    const req = route.request();
    const method = req.method();
    const path = new URL(req.url()).pathname;
    if (path.endsWith("/registrations/my")) return reply(route, { registrations: registration ? [registration] : [] });
    if (method === "POST" && path.endsWith("/registrations/register")) {
      calls.push(`register ${JSON.parse(req.postData()).eventId}`);
      registration = { _id: "r1".padEnd(24, "0"), event, status: "confirmed", attended: false, ticketCode: "TICKET-1", createdAt: new Date().toISOString() };
      return reply(route, { message: "Registered", registration }, 201);
    }
    if (method === "DELETE") {
      calls.push("unregister");
      registration = null;
      return reply(route, { message: "Unregistered" });
    }
    return reply(route, {});
  });
  return calls;
}

test("a visitor is asked to log in before registering", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route(`**/api/events/${EVENT_ID}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ event }) }));
  await page.goto(`/events/${EVENT_ID}`);
  await expect(page.getByRole("link", { name: "Log in to register" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Register now" })).toHaveCount(0);
});

for (const lang of ["en", "ne"]) {
  test(`a student can register for an event and unregister (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    const calls = await withRegistrationApi(page);
    await page.route(`**/api/events/${EVENT_ID}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ event }) }));
    await page.goto(`/events/${EVENT_ID}`);

    const en = lang === "en";
    const label = { register: en ? "Register now" : "अहिले दर्ता गर्नुहोस्", qr: en ? "Show my check-in QR" : "मेरो चेक-इन QR देखाउनुहोस्", unregister: en ? "Unregister" : "दर्ता रद्द गर्नुहोस्" };
    const registerNow = page.getByRole("button", { name: label.register }).first();
    await registerNow.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button").last().click();

    await expect.poll(() => calls).toEqual([`register ${EVENT_ID}`]);
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: label.qr })).toBeVisible();
    await expect(page.getByRole("button", { name: label.register })).toHaveCount(0);

    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole("button", { name: label.unregister, exact: true }).first().click();
    await expect.poll(() => calls).toEqual([`register ${EVENT_ID}`, "unregister"]);
    await expect(page.getByRole("button", { name: label.register }).first()).toBeVisible();
    expect(problems).toEqual([]);
  });
}
