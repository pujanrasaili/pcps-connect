import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// A club's leaders edit its description, activities, meeting line and email themselves.
const club = clubs[0];

async function open(page, role, lang = "en") {
  const problems = await setUp(page, { lang, role });
  let sent = null;
  let status = 200;
  await page.route("**/api/clubs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clubs }) }));
  if (role === "student") {
    await page.route("**/api/leader/clubs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clubs: [] }) }));
  }
  if (role === "leader") {
    await page.route("**/api/leader/clubs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clubs: [{ _id: club._id, name: club.name }] }) }));
  }
  await page.route(`**/api/leader/clubs/${club._id}`, (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(status === 200 ? { message: "Club updated", club: { ...club, ...sent } } : { message: "Short description can't be empty" }) });
  });
  return { problems, sent: () => sent, fail: () => (status = 400) };
}

test("a leader edits their club's details", async ({ page }) => {
  const h = await open(page, "leader");
  await page.goto(`/clubs?club=${club._id}`);
  await page.getByRole("button", { name: "Edit club details" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit club details" });
  await expect(dialog.getByLabel("Short description")).toHaveValue(club.description);
  await dialog.getByLabel("Regular meetings").fill("Fridays 4 PM, Lab 2");
  await dialog.getByLabel("Activities (one per line)").fill("Hack nights\n\n  Talks  ");
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  expect(await axeViolations(page)).toEqual([]);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Club details saved.")).toBeVisible();
  expect(h.sent()).toMatchObject({ meetings: "Fridays 4 PM, Lab 2", activities: ["Hack nights", "Talks"], description: club.description });
  expect(h.sent().name).toBeUndefined(); // a leader can't rename the club
  expect(h.problems).toEqual([]);
});

test("a student does not get the edit button", async ({ page }) => {
  await open(page, "student");
  await page.goto(`/clubs?club=${club._id}`);
  await expect(page.getByRole("button", { name: "Share this club" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit club details" })).toHaveCount(0);
});

test("an empty short description is refused before sending, and server errors show", async ({ page }) => {
  const h = await open(page, "leader");
  await page.goto(`/clubs?club=${club._id}`);
  await page.getByRole("button", { name: "Edit club details" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit club details" });
  await dialog.getByLabel("Short description").fill("   ");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Short description can't be empty");
  expect(h.sent()).toBeNull();
  h.fail();
  await dialog.getByLabel("Short description").fill("Fine now");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
});

test("the dialog is translated in Nepali", async ({ page }) => {
  const h = await open(page, "leader", "ne");
  await page.goto(`/clubs?club=${club._id}`);
  await page.getByRole("button", { name: "क्लबको विवरण सम्पादन गर्नुहोस्" }).click();
  await expect(page.getByRole("dialog", { name: "क्लबको विवरण सम्पादन गर्नुहोस्" })).toBeVisible();
  expect(h.problems).toEqual([]);
});
