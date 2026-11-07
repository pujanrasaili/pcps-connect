import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The Contact form: fields are checked first, a send empties the form and says
// so, a refusal from the server stays visible, and a hidden trap field exists
// for spam robots (a person never sees or fills it).
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const fill = async (page) => {
  await page.locator("#c-name").fill("Maya Tamang");
  await page.locator("#c-email").fill("maya@example.com");
  await page.locator("#c-subject").fill("Venue question");
  await page.locator("#c-message").fill("Is the hall open on Friday evening?");
};

test("the form checks the fields before sending", async ({ page }) => {
  await setUp(page, { lang: "en" });
  const sent = [];
  await page.route("**/api/contact", (route) => { sent.push(route.request().postDataJSON()); return reply(route, { message: "ok" }, 201); });
  await page.goto("/contact");
  const submit = page.locator("form button[type=submit]");
  await submit.click();
  await expect(page.getByText("Name is required.")).toBeVisible();
  await expect(page.getByText("Enter a valid email.")).toBeVisible();
  await expect(page.getByText("Please write a message.")).toBeVisible();
  expect(sent).toEqual([]);
});

for (const lang of ["en", "ne"]) {
  test(`a message is sent and the form is cleared (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    const sent = [];
    await page.route("**/api/contact", (route) => { sent.push(route.request().postDataJSON()); return reply(route, { message: "ok" }, 201); });
    await page.goto("/contact");
    await fill(page);
    await page.locator("form button[type=submit]").click();
    await expect(page.getByText(lang === "en" ? "Message sent — we'll reply to the email address you gave." : "सन्देश पठाइयो — तपाईंले दिनुभएको इमेल ठेगानामा हामी जवाफ दिनेछौं।")).toBeVisible();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ name: "Maya Tamang", email: "maya@example.com", subject: "Venue question", message: "Is the hall open on Friday evening?" });
    await expect(page.locator("#c-name")).toHaveValue("");
    await expect(page.locator("#c-message")).toHaveValue("");
    await page.waitForFunction(() => !document.querySelector(".max-w-sm.shadow-lg"));
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("a refusal from the server is shown and what was typed is kept", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.route("**/api/contact", (route) => reply(route, { message: "Too many messages. Try again later." }, 429));
  await page.goto("/contact");
  await fill(page);
  await page.locator("form button[type=submit]").click();
  await expect(page.getByRole("alert").filter({ hasText: "Too many messages. Try again later." })).toBeVisible();
  await expect(page.locator("#c-message")).toHaveValue("Is the hall open on Friday evening?");
});

test("the spam-trap field is out of reach for people", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/contact");
  const trap = page.locator("input[name=website]");
  await expect(trap).toHaveAttribute("tabindex", "-1");
  // Hidden from screen readers and parked far off-screen, so only a robot fills it.
  await expect(trap.locator("xpath=ancestor::div[@aria-hidden='true'][1]")).toHaveCount(1);
  expect((await trap.boundingBox()).x).toBeLessThan(-1000);
});
