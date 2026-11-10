import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The printable activity record at /record, opened from the Profile page.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|403|404|500)/.test(p));
const RECORD = {
  studentName: "Sita Sharma", studentId: "S123", program: "BCA",
  attended: [
    { title: "Hack Night", date: "2030-03-01T10:00:00.000Z", club: "Tech Club" },
    { title: "Open Day", date: "2030-01-10T10:00:00.000Z", club: "" },
  ],
  helped: [{ title: "Fest", date: "2030-02-01T10:00:00.000Z", role: "Usher" }],
  clubs: ["Art Club", "Tech Club"],
};

test("the record lists attended events, helped events and clubs, and Print is offered", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/registrations/record", (route) => reply(route, { record: RECORD }));
  await page.goto("/record");
  await expect(page.getByRole("heading", { name: "Activity record" })).toBeVisible();
  await expect(page.getByText("Sita Sharma")).toBeVisible();
  await expect(page.getByText("BCA · ID S123")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Events attended (2)" })).toBeVisible();
  await expect(page.getByText("Hack Night · Tech Club")).toBeVisible();
  await expect(page.getByText("Open Day", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Events helped at (1)" })).toBeVisible();
  await expect(page.getByText("Fest · Usher")).toBeVisible();
  await expect(page.getByText("Art Club, Tech Club")).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();
  expect(quiet(problems)).toEqual([]);
});

test("a student with nothing yet sees a friendly note instead of empty headings", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/registrations/record", (route) => reply(route, { record: { studentName: "Sita", studentId: "", program: "", attended: [], helped: [], clubs: [] } }));
  await page.goto("/record");
  await expect(page.getByText("Nothing to show yet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Events attended/ })).toHaveCount(0);
});

test("if the record can't load, it says so and offers a way back", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/registrations/record", (route) => reply(route, { message: "x" }, 500));
  await page.goto("/record");
  await expect(page.getByRole("heading", { name: "Couldn't open your activity record" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to profile" })).toBeVisible();
});

test("the Profile page links to the record", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.route("**/api/registrations/record", (route) => reply(route, { record: RECORD }));
  await page.goto("/profile");
  await page.getByRole("link", { name: "Activity record" }).click();
  await expect(page).toHaveURL(/\/record$/);
  await expect(page.getByRole("heading", { name: "Events attended (2)" })).toBeVisible();
});

test("Nepali: headings are translated, the student's own words are not, and it passes accessibility checks", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "student" });
  await page.route("**/api/registrations/record", (route) => reply(route, { record: RECORD }));
  await page.goto("/record");
  await expect(page.getByRole("heading", { name: "गतिविधि विवरण" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "सहभागी भएका कार्यक्रम (2)" })).toBeVisible();
  await expect(page.getByText("Hack Night · Tech Club")).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});
