import { test, expect } from "@playwright/test";
import { setUp } from "./helpers.js";

// An admin deciding on new sign-ups: approve one, reject one, approve the rest.
const user = (i, name, approvalStatus) => ({ _id: `s${i}`.padEnd(24, "0"), name, email: `${name.split(" ")[1].toLowerCase()}@patancollege.edu.np`, role: "user", approvalStatus, emailVerified: true, studentId: `PCPS-${i}`, createdAt: new Date().toISOString() });
const start = () => [user(1, "Pending Priya", "pending"), user(2, "Pending Prakash", "pending"), user(3, "Pending Pema", "pending"), user(4, "Approved Anil", "approved")];

async function withUsersApi(page) {
  let users = start();
  const calls = [];
  const reply = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/admin/users**", (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() === "GET") return reply(route, { users });
    if (path.endsWith("/bulk-approve")) {
      const { userIds } = req.postDataJSON ? req.postDataJSON() : JSON.parse(req.postData());
      calls.push(`bulk ${userIds.length}`);
      users = users.map((u) => (userIds.includes(u._id) ? { ...u, approvalStatus: "approved" } : u));
      return reply(route, { approvedCount: userIds.length });
    }
    if (req.method() === "PUT") {
      const { approvalStatus } = JSON.parse(req.postData());
      const id = path.split("/").pop();
      calls.push(`${approvalStatus} ${users.find((u) => u._id === id).name}`);
      users = users.map((u) => (u._id === id ? { ...u, approvalStatus } : u));
      return reply(route, { message: "Updated" });
    }
    return reply(route, {});
  });
  return calls;
}
const row = (page, name) => page.locator("div.p-4", { hasText: name });

for (const lang of ["en", "ne"]) {
  test(`an admin can approve or reject a new sign-up (${lang})`, async ({ page }) => {
    const en = lang === "en";
    const problems = await setUp(page, { lang, role: "admin" });
    const calls = await withUsersApi(page);
    await page.goto("/admin/users");
    await expect(page.getByText("Pending Priya")).toBeVisible();

    await row(page, "Pending Priya").getByTitle(en ? "Approve" : "स्वीकृत गर्नुहोस्", { exact: true }).click();
    await expect(page.getByText(en ? "Pending Priya approved -- they can now log in." : "Pending Priya स्वीकृत भयो -- अब उनीहरू लगइन गर्न सक्छन्।")).toBeVisible();
    await row(page, "Pending Prakash").getByTitle(en ? "Reject" : "अस्वीकृत गर्नुहोस्", { exact: true }).click();
    await expect(page.getByText(en ? "Pending Prakash's registration was rejected." : "Pending Prakash को दर्ता अस्वीकृत गरियो।")).toBeVisible();
    await expect.poll(() => calls).toEqual(["approved Pending Priya", "rejected Pending Prakash"]);
    // Only Pema is still waiting, so only her row has the two decision buttons.
    await expect(page.getByTitle(en ? "Approve" : "स्वीकृत गर्नुहोस्", { exact: true })).toHaveCount(1);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("'Approve all' approves everyone still waiting", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withUsersApi(page);
  await page.goto("/admin/users");
  await page.getByRole("button", { name: /^pending \(3\)/ }).click();
  await page.getByRole("button", { name: /^Approve all \(3\)/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve all", exact: true }).click();
  await expect.poll(() => calls).toEqual(["bulk 3"]);
  await expect(page.getByRole("button", { name: /^pending \(0\)/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^approved \(4\)/ })).toBeVisible();
});

test("search narrows the list of students", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withUsersApi(page);
  await page.goto("/admin/users");
  await page.getByPlaceholder("Search by name, email or student ID...").fill("anil");
  await expect(page.getByText("Approved Anil")).toBeVisible();
  await expect(page.getByText("Pending Priya")).toHaveCount(0);
});
