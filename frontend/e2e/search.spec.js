import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// The site-wide search box: the magnifier button or the "/" key, clubs and
// events that match, and a click on a result opens it.
const trigger = (page, lang = "en") => page.getByRole("button", { name: lang === "en" ? "Search clubs and events" : "क्लब र कार्यक्रम खोज्नुहोस्" }).first();

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`search finds a club and an event and opens the one picked (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang });
    await page.goto("/");
    await trigger(page, lang).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(en ? "Type to search every club and event." : "सबै क्लब र कार्यक्रम खोज्न टाइप गर्नुहोस्।")).toBeVisible();
    const box = dialog.getByLabel(en ? "What are you looking for?" : "तपाईं के खोज्दै हुनुहुन्छ?");
    await expect(box).toBeFocused();
    await box.fill("robot");
    const clubsList = dialog.getByRole("region", { name: en ? "Clubs" : "क्लबहरू" });
    await expect(clubsList.getByRole("link", { name: /Robotics Society/ })).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Robot Demo/ })).toBeVisible();
    await expect(clubsList.getByRole("link", { name: /Coding Club/ })).toHaveCount(0);
    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
    await dialog.getByRole("link", { name: /Robot Demo/ }).click();
    await expect(page).toHaveURL(/\/events\/e2/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(problems.filter((p) => !/status of 401/.test(p))).toEqual([]);
  });
}

test("a club result goes to that club", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await trigger(page).click();
  await page.getByRole("dialog").getByLabel("What are you looking for?").fill("coding");
  await page.getByRole("dialog").getByRole("region", { name: "Clubs" }).getByRole("link", { name: /Coding Club/ }).click();
  await expect(page).toHaveURL(/\/clubs\?club=c1/);
});

test("search also matches an event's place and a club's category", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await trigger(page).click();
  const box = page.getByRole("dialog").getByLabel("What are you looking for?");
  await box.fill("main hall");
  await expect(page.getByRole("dialog").getByRole("link", { name: /Robot Demo/ })).toBeVisible();
  await box.fill("technology");
  await expect(page.getByRole("dialog").getByRole("region", { name: "Clubs" }).getByRole("link", { name: /Coding Club/ })).toBeVisible();
});

test("a search with no match says so and shows no results", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await trigger(page).click();
  await page.getByRole("dialog").getByLabel("What are you looking for?").fill("zzzzqq");
  await expect(page.getByRole("dialog").getByText("Nothing matches “zzzzqq”. Try a shorter word.")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link")).toHaveCount(0);
});

test("pressing / opens search, but not while typing in a field", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("main input").first().focus();
  await page.keyboard.type("a/b");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByLabel("What are you looking for?")).toBeFocused();
});

test("Escape closes the search and the next time it opens empty", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await trigger(page).click();
  await page.getByRole("dialog").getByLabel("What are you looking for?").fill("robot");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await trigger(page).click();
  await expect(page.getByRole("dialog").getByLabel("What are you looking for?")).toHaveValue("");
});

test("upcoming events come before past ones in the results", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/");
  await trigger(page).click();
  await page.getByRole("dialog").getByLabel("What are you looking for?").fill("workshop");
  const names = await page.getByRole("dialog").getByRole("listitem").locator("span.font-medium").allInnerTexts();
  expect(names.length).toBe(3);
  expect(names[names.length - 1]).toBe("Photo Walk");
});
