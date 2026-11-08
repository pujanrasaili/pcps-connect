import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The admin's Contact-form inbox (search, filter, mark handled, delete) and the
// door check-in page (scan link, pasted code, already-checked-in, errors).
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|409)/.test(p));
const msg = (i, name, subject, handled) => ({ _id: `m${i}`.padEnd(24, "0"), name, email: `${name.split(" ")[0].toLowerCase()}@example.com`, subject, message: `Hello from ${name}, please reply.`, handled, createdAt: new Date().toISOString() });

async function withInbox(page) {
  let messages = [msg(1, "Maya Shrestha", "Join the robotics club", false), msg(2, "Sam Thapa", "Certificate question", false), msg(3, "Riya Karki", "Thanks!", true)];
  const calls = [];
  await page.route("**/api/admin/messages**", (route) => {
    const req = route.request();
    const id = new URL(req.url()).pathname.split("/").pop();
    if (req.method() === "GET") return reply(route, { messages });
    if (req.method() === "PUT") {
      const { handled } = req.postDataJSON();
      calls.push(`handled=${handled} ${id}`);
      messages = messages.map((m) => (m._id === id ? { ...m, handled } : m));
      return reply(route, { message: "ok" });
    }
    if (req.method() === "DELETE") {
      calls.push(`delete ${id}`);
      messages = messages.filter((m) => m._id !== id);
      return reply(route, { message: "gone" });
    }
    return reply(route, {});
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`the inbox lists messages, with the count still waiting (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "admin" });
    await withInbox(page);
    await page.goto("/admin/messages");
    await expect(page.getByRole("heading", { level: 1, name: en ? "Messages" : "सन्देशहरू" })).toBeVisible();
    await expect(page.getByText("Join the robotics club")).toBeVisible();
    await expect(page.getByText(en ? "2 still waiting for a reply." : "2 अझै जवाफको प्रतीक्षामा।").first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("filtering to New hides handled messages; search narrows the rest", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withInbox(page);
  await page.goto("/admin/messages");
  await expect(page.getByText("Thanks!")).toBeVisible();
  await page.getByRole("button", { name: /^New \(2\)/ }).click();
  await expect(page.getByText("Thanks!")).toHaveCount(0);
  await expect(page.getByText("Certificate question")).toBeVisible();
  await page.getByPlaceholder("Search by name, email or text...").fill("robotics");
  await expect(page.getByText("Certificate question")).toHaveCount(0);
  await expect(page.getByText("Join the robotics club")).toBeVisible();
  await page.getByPlaceholder("Search by name, email or text...").fill("zzzz");
  await expect(page.getByText("No messages match.")).toBeVisible();
});

test("marking handled and un-marking updates the list and tells the server", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withInbox(page);
  await page.goto("/admin/messages");
  const item = page.locator("li", { hasText: "Join the robotics club" });
  await item.getByRole("button", { name: "Mark handled" }).click();
  await expect(item.getByRole("button", { name: "Mark as new" })).toBeVisible();
  await expect(page.getByText("1 still waiting for a reply.")).toBeVisible();
  await item.getByRole("button", { name: "Mark as new" }).click();
  await expect(page.getByText("2 still waiting for a reply.")).toBeVisible();
  expect(calls).toEqual(["handled=true " + "m1".padEnd(24, "0"), "handled=false " + "m1".padEnd(24, "0")]);
});

test("Reply opens the admin's email app addressed to the sender", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withInbox(page);
  await page.goto("/admin/messages");
  const href = await page.locator("li", { hasText: "Certificate question" }).getByRole("link", { name: "Reply" }).getAttribute("href");
  expect(href).toBe("mailto:sam@example.com?subject=Re%3A%20Certificate%20question");
});

test("deleting asks first, and Cancel keeps the message", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withInbox(page);
  await page.goto("/admin/messages");
  await page.getByRole("button", { name: "Delete message from Sam Thapa" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("permanently delete the message from Sam Thapa");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Certificate question")).toBeVisible();
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: "Delete message from Sam Thapa" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Certificate question")).toHaveCount(0);
  await expect(page.getByText("Message deleted.")).toBeVisible();
  expect(calls).toEqual(["delete " + "m2".padEnd(24, "0")]);
});

test("an inbox that fails to load says so; an empty one says there is nothing", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await page.route("**/api/admin/messages", (route) => reply(route, { message: "Database is down" }, 500));
  await page.goto("/admin/messages");
  await expect(page.getByRole("alert")).toContainText("Database is down");
  await page.unroute("**/api/admin/messages");
  await page.route("**/api/admin/messages", (route) => reply(route, { messages: [] }));
  await page.reload();
  await expect(page.getByText("No messages yet.")).toBeVisible();
  await expect(page.getByText("Nothing waiting.")).toBeVisible();
});

test("a student can't open the inbox", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.goto("/admin/messages");
  await expect(page).not.toHaveURL(/\/admin\/messages/);
});

const scan = { alreadyCheckedIn: false, student: { name: "Asha Rai", studentId: "PCPS-77" }, event: { title: "Hack Night", date: "2026-10-01T10:00:00.000Z" } };

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`opening a scanned link checks the student in straight away (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "admin" });
    const sent = [];
    await page.route("**/api/admin/check-in", (route) => { sent.push(route.request().postDataJSON()); return reply(route, scan); });
    await page.goto("/admin/check-in?code=signed.code.1");
    await expect(page.getByRole("status")).toContainText("Asha Rai");
    await expect(page.getByRole("status")).toContainText(en ? "Checked in" : "चेक-इन भयो");
    await expect(page.getByText("PCPS-77").first()).toBeVisible();
    expect(sent).toEqual([{ code: "signed.code.1" }]);
    expect(await axeViolations(page)).toEqual([]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("a pasted code works, a repeat is flagged, and the session list grows", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  let n = 0;
  await page.route("**/api/admin/check-in", (route) => { n += 1; return reply(route, { ...scan, alreadyCheckedIn: n > 1 }); });
  await page.goto("/admin/check-in");
  const submit = page.getByRole("button", { name: "Check in", exact: true });
  await expect(submit).toBeDisabled();
  await page.locator("#manual-code").fill("  pasted.code  ");
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Checked in");
  await expect(page.locator("#manual-code")).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Checked in this session: 1" })).toBeVisible();
  await page.locator("#manual-code").fill("pasted.code");
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Already checked in earlier");
});

test("an invalid or wrong-event code shows the server's reason, not a success", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  await page.route("**/api/admin/check-in", (route) => reply(route, { message: "This ticket is for a different event" }, 400));
  await page.goto("/admin/check-in?code=bad");
  await expect(page.getByRole("alert")).toContainText("This ticket is for a different event");
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(quiet(problems)).toEqual([]);
});
