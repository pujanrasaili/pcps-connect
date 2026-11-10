import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The Help & FAQ page: 22 questions that open and close, a link to Contact,
// the footer link to the page, and an address like /help#club-ideas that jumps to one.
const TOPICS = 24;

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`every question starts closed, opens to an answer, and the page is accessible (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await page.goto("/help");
    await expect(page.getByRole("heading", { level: 1, name: en ? "Questions students ask" : "विद्यार्थीहरूले सोध्ने प्रश्नहरू" })).toBeVisible();
    const topics = page.locator("main details");
    await expect(topics).toHaveCount(TOPICS);
    await expect(page.locator("main details[open]")).toHaveCount(0);
    const first = topics.first();
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await expect(first.locator("p").first()).toBeVisible();
    expect(((await first.locator("p").first().innerText()) || "").length).toBeGreaterThan(20);
    await first.locator("summary").click();
    await expect(page.locator("main details[open]")).toHaveCount(0);
    // Open them all at once so the checker sees every answer.
    for (const summary of await topics.locator("summary").all()) await summary.click();
    await expect(page.locator("main details[open]")).toHaveCount(TOPICS);
    await page.waitForTimeout(500);
    expect(await axeViolations(page)).toEqual([]);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("no question or answer is left in English in Nepali mode", async ({ page }) => {
  await setUp(page, { lang: "ne" });
  await page.goto("/help");
  const topics = page.locator("main details");
  await expect(topics).toHaveCount(TOPICS);
  for (const summary of await topics.locator("summary").all()) await summary.click();
  const text = await page.locator("main details").allInnerTexts();
  // Every question and answer paragraph must contain Nepali (Devanagari) text.
  const paragraphs = text.flatMap((block) => block.split("\n").map((l) => l.trim()).filter((l) => l.length > 25));
  expect(paragraphs.length).toBeGreaterThan(TOPICS);
  const english = paragraphs.filter((l) => !/[ऀ-ॿ]/.test(l));
  expect(english).toEqual([]);
});

test("the question about club ideas is there and explains the idea box", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/help");
  const topic = page.locator("details#club-ideas");
  await expect(topic).toHaveCount(1);
  await topic.locator("summary").click();
  await expect(topic).toContainText(/idea/i);
});

test("an address with #topic opens that question and brings it into view", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/help#club-ideas");
  const topic = page.locator("details#club-ideas");
  await expect(topic).toHaveAttribute("open", "");
  await expect(topic).toBeInViewport();
  await expect(page.locator("main details[open]")).toHaveCount(1);
});

test("a #topic that doesn't exist (or is malformed) just shows the page", async ({ page }) => {
  const problems = await setUp(page, { lang: "en" });
  await page.goto("/help#no-such-question");
  await expect(page.getByRole("heading", { level: 1, name: "Questions students ask" })).toBeVisible();
  await expect(page.locator("main details[open]")).toHaveCount(0);
  await page.goto("/help#%E0%A4%A");
  await expect(page.getByRole("heading", { level: 1, name: "Questions students ask" })).toBeVisible();
  expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
});

test("the Contact us link in the intro goes to the contact form", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/help");
  await page.getByRole("main").getByRole("link", { name: "Contact us" }).click();
  await expect(page).toHaveURL(/\/contact/);
});

test("the footer's Help & FAQ link opens the page", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Help & FAQ" }).click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole("heading", { level: 1, name: "Questions students ask" })).toBeVisible();
});

test("the question list is keyboard-operable: Enter opens, Enter closes", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/help");
  const first = page.locator("main details").first();
  await first.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(first).not.toHaveAttribute("open", "");
});
