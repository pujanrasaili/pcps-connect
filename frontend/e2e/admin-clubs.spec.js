import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// An admin managing clubs: create, edit, delete.
const text = {
  en: { add: "Add Club", create: "Create club", created: "Club created.", updated: "Club updated.", deleted: "Club deleted.", save: "Save changes", del: "Delete", edit: (n) => `Edit ${n}`, remove: (n) => `Delete ${n}` },
  ne: { add: "क्लब थप्नुहोस्", create: "क्लब बनाउनुहोस्", created: "क्लब बनाइयो।", updated: "क्लब अपडेट भयो।", deleted: "क्लब मेटियो।", save: "परिवर्तन सुरक्षित गर्नुहोस्", del: "मेटाउनुहोस्", edit: (n) => `${n} सम्पादन गर्नुहोस्`, remove: (n) => `${n} लाई मेटाउनुहोस्` },
};

async function withClubsApi(page) {
  let list = [...clubs];
  const calls = [];
  const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/clubs", (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const body = req.postDataJSON();
      calls.push(`create ${body.name} [${body.activities.join("|")}]`);
      list = [...list, { _id: "cnew".padEnd(24, "0"), memberCount: 0, leaders: [], ...body }];
      return reply(route, { message: "Created" }, 201);
    }
    return reply(route, { clubs: list });
  });
  await page.route("**/api/clubs/*", (route) => {
    const req = route.request();
    const id = new URL(req.url()).pathname.split("/").pop();
    if (req.method() === "PUT") {
      const body = req.postDataJSON();
      calls.push(`update ${body.name}`);
      list = list.map((c) => (c._id === id ? { ...c, ...body } : c));
      return reply(route, { message: "Updated" });
    }
    if (req.method() === "DELETE") {
      calls.push("delete");
      list = list.filter((c) => c._id !== id);
      return reply(route, { message: "Deleted" });
    }
    return reply(route, { club: list.find((c) => c._id === id) });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  test(`an admin can create, edit and delete a club (${lang})`, async ({ page }) => {
    const l = text[lang];
    const problems = await setUp(page, { lang, role: "admin" });
    const calls = await withClubsApi(page);
    await page.goto("/admin/clubs");

    await page.getByRole("button", { name: l.add }).click();
    await page.locator("#club-name").fill("Chess Club");
    await page.locator("#club-category").fill("Games");
    await page.locator("#club-description").fill("Weekly games and puzzles.");
    await page.locator("#club-activities").fill("Tournaments\n\nPuzzle night");
    await page.getByRole("button", { name: l.create, exact: true }).click();
    await expect(page.getByText(l.created)).toBeVisible();
    await expect(page.getByText("Chess Club", { exact: true })).toBeVisible();
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole("button", { name: l.edit("Chess Club"), exact: true }).click();
    await page.locator("#club-name").fill("Chess and Go Club");
    await page.getByRole("button", { name: l.save }).click();
    await expect(page.getByText(l.updated)).toBeVisible();
    await expect(page.getByText("Chess and Go Club", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: l.remove("Chess and Go Club"), exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: l.del, exact: true }).click();
    await expect(page.getByText(l.deleted)).toBeVisible();
    await expect(page.getByText("Chess and Go Club", { exact: true })).toHaveCount(0);

    expect(calls).toEqual(["create Chess Club [Tournaments|Puzzle night]", "update Chess and Go Club", "delete"]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("the club form will not send without a name, category and description", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withClubsApi(page);
  await page.goto("/admin/clubs");
  await page.getByRole("button", { name: "Add Club" }).click();
  await page.getByRole("button", { name: "Create club", exact: true }).click();
  await expect(page.locator("#club-name")).toBeVisible();
  expect(calls).toEqual([]);
});
