import { test, expect } from "@playwright/test";
import { setUp, student, clubs } from "./helpers.js";

// "Save for later" follows the account to other devices.
const id = (n) => String(n).padStart(24, "a");
const ev = (n, title) => ({ _id: id(n), title, description: "d", date: new Date(Date.now() + n * 864e5).toISOString(), location: "Hall", capacity: 40, registeredCount: 0, category: "Workshop", price: "Free", club: clubs[0] });

async function start(page, { server, local, owner }) {
  await setUp(page, { lang: "en", role: "student" });
  const puts = [];
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { ...student, language: "en", savedEvents: server } }) }));
  await page.route("**/api/events*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [ev(1, "Hack Night"), ev(2, "Robot Day"), ev(3, "Photo Walk")] }) }));
  await page.route("**/api/auth/profile", (route) => {
    puts.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { ...student, savedEvents: route.request().postDataJSON().savedEvents } }) });
  });
  await page.addInitScript(([l, o]) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("pcps.savedEvents", JSON.stringify(l));
    if (o) localStorage.setItem("pcps.savedEvents.owner", o);
  }, [local, owner]);
  return puts;
}
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("pcps.savedEvents") || "[]"));

test("the first time on a device, saves made before logging in join the account's", async ({ page }) => {
  const puts = await start(page, { server: [id(2)], local: [id(1)] });
  await page.goto("/events");
  await expect(page.getByRole("button", { name: "Remove Hack Night from saved events" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Robot Day from saved events" })).toBeVisible();
  await expect.poll(() => puts.length).toBe(1);
  expect(puts[0]).toEqual({ savedEvents: [id(1), id(2)] });
  expect(await stored(page)).toEqual([id(1), id(2)]);
});

test("after that the account's list wins and nothing is sent back", async ({ page }) => {
  const puts = await start(page, { server: [id(2)], local: [id(1)], owner: student.id });
  await page.goto("/events");
  await expect(page.getByRole("button", { name: "Remove Robot Day from saved events" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Hack Night for later" })).toBeVisible();
  expect(await stored(page)).toEqual([id(2)]);
  await page.waitForTimeout(1200);
  expect(puts).toEqual([]);
});

test("saving an event sends the new list to the account after a short pause", async ({ page }) => {
  const puts = await start(page, { server: [id(2)], local: [], owner: student.id });
  await page.goto("/events");
  await page.getByRole("button", { name: "Save Photo Walk for later" }).click();
  await expect.poll(() => puts.length).toBe(1);
  expect(puts[0]).toEqual({ savedEvents: [id(3), id(2)] });
});

test("logging out clears the list so the next person on this computer starts empty", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await start(page, { server: [id(2)], local: [], owner: student.id });
  await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Logged out" }) }));
  await page.goto("/settings");
  await expect.poll(() => stored(page)).toEqual([id(2)]);
  await page.getByRole("button", { name: "Asha" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect.poll(() => stored(page)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("pcps.savedEvents.owner"))).toBeNull();
});
