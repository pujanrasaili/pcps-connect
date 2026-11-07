import { test, expect } from "@playwright/test";
import { setUp, axeViolations, clubs } from "./helpers.js";

// The club news box on a club's page: visitors only read; an admin or club
// leader can post (with a photo), pin, edit and delete. The posts API is a
// small in-memory stand-in so each step shows up on the page.
const PHOTO = "https://res.cloudinary.com/demo/image/upload/v1/pcps-connect/club-news/a.png";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function withPostsApi(page) {
  // The photo address points at Cloudinary; answer it with a tiny picture instead of the internet.
  await page.route(/res\.cloudinary\.com/, (route) => route.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  let posts = [{ _id: "p1".padEnd(24, "0"), body: "Hack night moved to Friday!", authorName: "Sita Leader", createdAt: new Date().toISOString() }];
  await page.route("**/api/clubs/*/posts**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    const id = path.split("/posts/")[1]?.split("/")[0];
    if (method === "GET") return reply({ posts });
    if (method === "POST") {
      const raw = req.postDataBuffer().toString("latin1");
      const post = { _id: "p2".padEnd(24, "0"), body: raw.match(/name="body"\r\n\r\n([^\r]*)/)[1], image: /name="image"/.test(raw) ? PHOTO : "", authorName: "Admin User", createdAt: new Date().toISOString() };
      posts = [post, ...posts];
      return reply({ message: "Posted", post }, 201);
    }
    if (method === "PATCH") {
      posts = posts.map((p) => (p._id === id ? { ...p, body: JSON.parse(req.postData()).body, editedAt: new Date().toISOString() } : p));
      return reply({ message: "Post updated", post: posts.find((p) => p._id === id) });
    }
    if (method === "PUT") {
      const { pinned } = JSON.parse(req.postData());
      posts = posts.map((p) => ({ ...p, pinned: p._id === id ? pinned : pinned ? false : p.pinned }));
      posts.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
      return reply({ message: "ok", pinned });
    }
    if (method === "DELETE") {
      posts = posts.filter((p) => p._id !== id);
      return reply({ message: "Post deleted" });
    }
    return reply({});
  });
}

const clubPage = `/clubs?club=${clubs[0]._id}`;

test("a visitor can read club news but not write it", async ({ page }) => {
  await setUp(page, { lang: "en" });
  await withPostsApi(page);
  await page.goto(clubPage);
  await expect(page.getByText("Hack night moved to Friday!")).toBeVisible();
  await expect(page.locator("#club-news-draft")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Delete the post/ })).toHaveCount(0);
});

for (const lang of ["en", "ne"]) {
  test(`an admin can post with a photo, pin, edit and delete club news (${lang})`, async ({ page }) => {
    const problems = await setUp(page, { lang, role: "admin" });
    await withPostsApi(page);
    await page.goto(clubPage);
    await expect(page.getByText("Hack night moved to Friday!")).toBeVisible();

    // Post with a photo.
    await page.locator("#club-news-draft").fill("New workshop next week");
    await page.locator("input[type=file]").setInputFiles({ name: "pic.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("pic.png")).toBeVisible();
    await page.locator("form button[type=submit]").first().click();
    await expect(page.getByText("New workshop next week")).toBeVisible();
    await expect(page.locator(`a[href*="club-news"]`)).toHaveCount(1);

    // Pin the older post: it moves to the top and is marked.
    await page.locator("section li").last().locator('button[aria-pressed="false"]').click();
    await expect(page.locator("section li").first()).toContainText("Hack night moved to Friday!");
    await expect(page.locator("section li button[aria-pressed=true]")).toHaveCount(1);

    // Edit it.
    await page.locator("section li").first().locator("button[aria-pressed=true] + button").click();
    await page.locator("textarea[id^=edit-]").fill("Hack night is on Friday at 5pm");
    await page.locator("form:has(textarea[id^=edit-]) button[type=submit]").click();
    await expect(page.getByText("Hack night is on Friday at 5pm")).toBeVisible();
    await expect(page.locator("textarea[id^=edit-]")).toHaveCount(0);

    // Toasts fade in and out; check the page once they are gone so a half-faded one is not judged.
    await expect(page.locator(".max-w-sm.shadow-lg")).toHaveCount(0, { timeout: 12_000 });
    expect(await axeViolations(page)).toEqual([]);

    // Delete the new post (asks first).
    await page.locator("section li", { hasText: "New workshop next week" }).locator("button[aria-pressed] + button + button").click();
    await page.getByRole("button", { name: lang === "ne" ? /मेटाउनुहोस्/ : "Delete", exact: lang !== "ne" }).last().click();
    await expect(page.getByText("New workshop next week")).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}
