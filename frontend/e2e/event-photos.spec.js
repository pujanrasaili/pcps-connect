import { test, expect } from "@playwright/test";
import { setUp, clubs, axeViolations } from "./helpers.js";

// The photo gallery on an event page: everyone sees it, organisers add and
// remove photos (up to 8), and a viewer who can't manage an empty gallery sees nothing.
const ID = "p1".padEnd(24, "0");
const photo = (n) => `https://res.cloudinary.com/demo/image/upload/v1/event-${n}.jpg`;
// 1x1 transparent PNG, so the page's image shrinker has a real picture to read.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const event = (photos) => ({ _id: ID, title: "Open Mic", description: "Bring a song.", date: new Date(Date.now() + 6 * 864e5).toISOString(), location: "Main Hall", capacity: 60, registeredCount: 10, category: "Social", price: "Free", club: clubs[0], photos, averageRating: 0, ratingCount: 0 });
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|409|413)/.test(p));

async function withPhotosApi(page, { start = [], led = [], failUpload } = {}) {
  let photos = start;
  const calls = [];
  await page.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: led }));
  await page.route(`**/api/events/${ID}`, (route) => reply(route, { event: event(photos) }));
  await page.route(`**/api/events/${ID}/questions**`, (route) => reply(route, { questions: [] }));
  await page.route(`**/api/events/${ID}/photos**`, (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      if (failUpload) return reply(route, { message: failUpload }, 413);
      calls.push("upload");
      photos = [...photos, photo(photos.length + 1)];
      return reply(route, { photos }, 201);
    }
    const url = new URL(req.url()).searchParams.get("url");
    calls.push(`remove ${url}`);
    photos = photos.filter((p) => p !== url);
    return reply(route, { photos });
  });
  return calls;
}

for (const lang of ["en", "ne"]) {
  const en = lang === "en";
  test(`an organiser adds a photo to the gallery (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "admin" });
    const calls = await withPhotosApi(page);
    await page.goto(`/events/${ID}`);
    await expect(page.getByRole("heading", { name: en ? "Photos" : "फोटोहरू" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]); // before the toast appears, which fades in
    await page.locator('input[type="file"]').setInputFiles({ name: "stage.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText(en ? "Photo added." : "फोटो थपियो।")).toBeVisible();
    await expect(page.locator("#event-photos-heading").locator("xpath=ancestor::section").getByRole("link")).toHaveCount(1);
    expect(calls).toEqual(["upload"]);
    expect(quiet(problems)).toEqual([]);
  });
}

test("everyone sees the photos, and each opens full size in a new tab", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await withPhotosApi(page, { start: [photo(1), photo(2)] });
  await page.goto(`/events/${ID}`);
  const links = page.locator("#event-photos-heading").locator("xpath=ancestor::section").getByRole("link");
  await expect(links).toHaveCount(2);
  await expect(links.first()).toHaveAttribute("target", "_blank");
  await expect(links.first()).toHaveAttribute("rel", /noopener/);
  await expect(links.first()).toHaveAccessibleName("Open photo 1 of 2 from Open Mic");
  // Viewers can't change the gallery.
  await expect(page.getByRole("button", { name: "Add photo" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Remove photo/ })).toHaveCount(0);
});

test("a student sees no Photos section at all when there are none", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withPhotosApi(page);
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("heading", { name: "Open Mic", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Photos" })).toHaveCount(0);
});

test("an empty gallery tells an organiser what to do", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withPhotosApi(page);
  await page.goto(`/events/${ID}`);
  await expect(page.getByText("No photos yet. Add up to 8 (jpg, png, webp or gif).")).toBeVisible();
});

test("removing a photo asks first; Cancel keeps it", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  const calls = await withPhotosApi(page, { start: [photo(1), photo(2)] });
  await page.goto(`/events/${ID}`);
  await page.getByRole("button", { name: "Remove photo 2" }).click();
  await expect(page.getByRole("dialog")).toContainText("Remove this photo?");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Remove photo 2" })).toBeVisible();
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: "Remove photo 2" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Photo removed.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove photo 2" })).toHaveCount(0);
  expect(calls).toEqual([`remove ${photo(2)}`]);
});

test("at 8 photos the gallery is full and Add photo is disabled", async ({ page }) => {
  await setUp(page, { lang: "en", role: "admin" });
  await withPhotosApi(page, { start: Array.from({ length: 8 }, (_, i) => photo(i + 1)) });
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Gallery full" })).toBeDisabled();
});

test("a refused upload (too large) shows the reason and adds nothing", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "admin" });
  await withPhotosApi(page, { failUpload: "That photo is too large" });
  await page.goto(`/events/${ID}`);
  await page.locator('input[type="file"]').setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("That photo is too large")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add photo" })).toBeEnabled();
  expect(quiet(problems)).toEqual([]);
});

test("a leader of this event's club can manage photos; another club's leader can't", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await withPhotosApi(page, { led: [clubs[0]] });
  await page.goto(`/events/${ID}`);
  await expect(page.getByRole("button", { name: "Add photo" })).toBeVisible();
  await page.unroute("**/api/leader/clubs");
  await page.route("**/api/leader/clubs", (route) => reply(route, { clubs: [clubs[1]] }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Open Mic", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add photo" })).toHaveCount(0);
});
