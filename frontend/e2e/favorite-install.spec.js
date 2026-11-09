import { test, expect } from "@playwright/test";
import { setUp, clubs, student, axeViolations } from "./helpers.js";

// Two small student-facing features: the heart that sets a favourite club, and
// the "add to your home screen" card on the Dashboard.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|500)/.test(p));

async function withFavorites(page, lang, { start = null, fail } = {}) {
  let favoriteClub = start;
  const calls = [];
  await page.route("**/api/auth/me", (route) => reply(route, { user: { ...student, language: lang, favoriteClub } }));
  await page.route("**/api/auth/favorite-club", (route) => {
    const { clubId } = route.request().postDataJSON();
    if (fail) return reply(route, { message: fail }, 500);
    calls.push(clubId);
    favoriteClub = favoriteClub === clubId ? null : clubId;
    return reply(route, { favoriteClub });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  const set = en ? "Set as favorite club" : "मनपर्ने क्लब बनाउनुहोस्";
  const remove = en ? "Remove from favorite club" : "मनपर्ने क्लबबाट हटाउनुहोस्";
  test(`the heart sets a favourite club and tapping it again removes it (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "student" });
    const calls = await withFavorites(page, lang);
    await page.goto("/clubs");
    const hearts = page.getByRole("button", { name: set });
    await expect(hearts).toHaveCount(2);
    await hearts.first().click();
    await expect(page.getByRole("button", { name: remove })).toHaveCount(1);
    await expect(page.getByRole("button", { name: remove })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(en ? "Set as your favorite club!" : "तपाईंको मनपर्ने क्लब बनाइयो!")).toBeVisible();
    await page.getByRole("button", { name: remove }).click();
    await expect(page.getByRole("button", { name: set })).toHaveCount(2);
    await expect(page.getByText(en ? "Removed from favorites." : "मनपर्ने क्लबबाट हटाइयो।")).toBeVisible();
    expect(calls).toEqual([clubs[0]._id, clubs[0]._id]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("choosing a different club moves the heart, and the Dashboard shows it", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withFavorites(page, "en", { start: clubs[0]._id });
  await page.goto("/clubs");
  await expect(page.getByRole("button", { name: "Remove from favorite club" })).toHaveCount(1);
  await page.getByRole("button", { name: "Set as favorite club" }).click();
  await expect(page.getByRole("button", { name: "Remove from favorite club" })).toHaveCount(1);
  await page.goto("/dashboard");
  const value = page.getByText("Favorite Club", { exact: true }).first().locator("xpath=preceding-sibling::p[1]");
  await expect(value).toHaveText("Robotics Society");
});

test("a failed heart tap shows the reason and changes nothing", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await withFavorites(page, "en", { fail: "Couldn't update just now" });
  await page.goto("/clubs");
  await page.getByRole("button", { name: "Set as favorite club" }).first().click();
  await expect(page.getByText("Couldn't update just now")).toBeVisible();
  await expect(page.getByRole("button", { name: "Set as favorite club" })).toHaveCount(2);
  expect(quiet(problems)).toEqual([]);
});

test("a logged-out visitor tapping the heart is sent to log in, then back", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await page.goto("/clubs");
  await page.getByRole("button", { name: "Set as favorite club" }).first().click();
  await expect(page).toHaveURL(/\/login/);
});

const prompt = () => {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  event.prompt = () => { window.__installPrompted = (window.__installPrompted || 0) + 1; };
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  window.dispatchEvent(event);
};

test("when the browser offers an install, the Dashboard shows an Install button that asks once", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: /Welcome back/ })).toBeVisible(); // the page is listening now
  await expect(page.getByText("Add PCPS Connect to your home screen")).toHaveCount(0);
  await page.evaluate(prompt);
  await expect(page.getByText("Add PCPS Connect to your home screen")).toBeVisible();
  await page.waitForTimeout(500);
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole("button", { name: "Install" }).click();
  expect(await page.evaluate(() => window.__installPrompted)).toBe(1);
  // A browser prompt can be used once, so the card goes away.
  await expect(page.getByText("Add PCPS Connect to your home screen")).toHaveCount(0);
});

test("when the app is already installed, nothing is offered", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q) => (q.includes("display-mode: standalone") ? { ...real(q), matches: true } : real(q));
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: /Welcome back/ })).toBeVisible();
  await page.evaluate(prompt);
  await expect(page.getByText("Add PCPS Connect to your home screen")).toHaveCount(0);
});

test.describe("on an iPhone", () => {
  test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
  test("the card explains Share > Add to Home Screen instead of a button", async ({ page }) => {
    await setUp(page, { lang: "en", role: "student" });
    await page.goto("/dashboard");
    await expect(page.getByText("Add PCPS Connect to your home screen")).toBeVisible();
    await expect(page.getByText(/Tap the Share button in Safari/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Install" })).toHaveCount(0);
  });
});
