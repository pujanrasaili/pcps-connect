import { test, expect } from "@playwright/test";
import { setUp, axeViolations } from "./helpers.js";

// "Alerts on this device" in Settings. A real push service can't be reached from
// a test, so the browser's push pieces are stood in for; what's checked is what
// the page asks of them and of the server.
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const quiet = (problems) => problems.filter((p) => !/status of (400|401|404|500|503)/.test(p));
const ENDPOINT = "https://push.example/device-1";

async function fakeBrowser(page, { hasWorker = true, permission = "default", answer = "granted", subscribed = false } = {}) {
  await page.addInitScript(
    ({ hasWorker, permission, answer, subscribed, ENDPOINT }) => {
      window.__push = { subscribeArgs: null, unsubscribed: 0, asked: 0 };
      let sub = subscribed ? mk() : null;
      function mk() {
        return {
          endpoint: ENDPOINT,
          toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: "k", auth: "a" } }),
          unsubscribe: async () => {
            window.__push.unsubscribed += 1;
            sub = null;
            return true;
          },
        };
      }
      let current = permission;
      Object.defineProperty(Notification, "permission", { get: () => current, configurable: true });
      Notification.requestPermission = async () => {
        window.__push.asked += 1;
        current = answer;
        return answer;
      };
      const registration = {
        pushManager: {
          getSubscription: async () => sub,
          subscribe: async (opts) => {
            window.__push.subscribeArgs = { userVisibleOnly: opts.userVisibleOnly, keyLength: opts.applicationServerKey.length };
            sub = mk();
            return sub;
          },
        },
      };
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: { getRegistration: async () => (hasWorker ? registration : undefined), register: async () => registration, ready: Promise.resolve(registration), addEventListener() {} },
      });
    },
    { hasWorker, permission, answer, subscribed, ENDPOINT }
  );
}
const serverKey = (page, enabled = true) => page.route("**/api/push/key", (route) => reply(route, enabled ? { enabled: true, key: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U" } : { enabled: false }));
const SWITCH = (page, en = true) => page.getByRole("switch", { name: en ? "Toggle Alerts on this device" : /यो उपकरणमा अलर्ट/ });

test("turning alerts on asks the browser, subscribes, tells the server and says so", async ({ page }) => {
  const problems = await setUp(page, { lang: "en", role: "student" });
  await fakeBrowser(page);
  await serverKey(page);
  let body = null;
  await page.route("**/api/push/subscribe", (route) => {
    body = route.request().postDataJSON();
    return reply(route, { message: "Alerts are on for this device." }, 201);
  });
  await page.goto("/settings");
  const toggle = SWITCH(page);
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(page.getByText("Alerts are on for this device.")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(body).toEqual({ subscription: { endpoint: ENDPOINT, keys: { p256dh: "k", auth: "a" } } });
  const seen = await page.evaluate(() => window.__push);
  expect(seen.asked).toBe(1);
  expect(seen.subscribeArgs).toEqual({ userVisibleOnly: true, keyLength: 65 });
  expect(quiet(problems)).toEqual([]);
});

test("a device that already has alerts shows the switch on, and turning it off tells the server", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await fakeBrowser(page, { permission: "granted", subscribed: true });
  await serverKey(page);
  let deleted = null;
  await page.route("**/api/push/subscribe", (route) => {
    deleted = route.request().postDataJSON();
    return reply(route, { message: "Alerts are off for this device." });
  });
  await page.goto("/settings");
  const toggle = SWITCH(page);
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(page.getByText("Alerts are off for this device.")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  expect(deleted).toEqual({ endpoint: ENDPOINT });
  expect((await page.evaluate(() => window.__push)).unsubscribed).toBe(1);
});

test("if the browser's permission is refused, it says so, stays off and tells the server nothing", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await fakeBrowser(page, { answer: "denied" });
  await serverKey(page);
  let calls = 0;
  await page.route("**/api/push/subscribe", (route) => {
    calls += 1;
    return reply(route, {}, 201);
  });
  await page.goto("/settings");
  await SWITCH(page).click();
  await expect(page.getByText("Alerts are blocked in your browser's settings for this site.")).toBeVisible();
  await expect(SWITCH(page)).toHaveAttribute("aria-checked", "false");
  expect(calls).toBe(0);
});

test("if the server refuses, the switch stays off and an error is shown", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await fakeBrowser(page);
  await serverKey(page);
  await page.route("**/api/push/subscribe", (route) => reply(route, { message: "nope" }, 500));
  await page.goto("/settings");
  await SWITCH(page).click();
  await expect(page.getByText("Couldn't turn on alerts on this device")).toBeVisible();
  await expect(SWITCH(page)).toHaveAttribute("aria-checked", "false");
});

test("the switch does not appear when the server has alerts off, or the browser can't do them", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await fakeBrowser(page);
  await serverKey(page, false);
  await page.goto("/settings");
  await expect(page.getByRole("switch", { name: "Toggle Event reminders" })).toBeVisible();
  await expect(SWITCH(page)).toHaveCount(0);

  await page.unroute("**/api/push/key");
  await serverKey(page, true);
  const second = await page.context().newPage();
  await setUp(second, { lang: "en", role: "student" });
  await fakeBrowser(second, { hasWorker: false });
  await serverKey(second);
  await second.goto("/settings");
  await expect(second.getByRole("switch", { name: "Toggle Event reminders" })).toBeVisible();
  await expect(SWITCH(second)).toHaveCount(0);
});

test("Nepali: the row and its messages are translated, and the page is accessible", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "student" });
  await fakeBrowser(page);
  await serverKey(page);
  await page.route("**/api/push/subscribe", (route) => reply(route, {}, 201));
  await page.goto("/settings");
  const toggle = SWITCH(page, false);
  await expect(toggle).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await toggle.click();
  await expect(page.getByText("यो उपकरणमा अलर्ट खुल्यो।")).toBeVisible();
});

test("with alerts on, 'Send a test alert' asks the server and shows its answer; it is hidden while off", async ({ page }) => {
  await setUp(page, { lang: "en", role: "student" });
  await fakeBrowser(page, { permission: "granted", subscribed: true });
  await serverKey(page);
  let posted = 0;
  await page.route("**/api/push/test", (route) => {
    posted += 1;
    return reply(route, { message: "Test alert sent. It should pop up in a moment." });
  });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Send a test alert" }).click();
  await expect(page.getByText("Test alert sent. It should pop up in a moment.")).toBeVisible();
  expect(posted).toBe(1);
  await page.route("**/api/push/subscribe", (route) => reply(route, {}));
  await SWITCH(page).click();
  await expect(page.getByRole("button", { name: "Send a test alert" })).toHaveCount(0);
});

test("a test alert with no device on shows the server's message, in Nepali too", async ({ page }) => {
  await setUp(page, { lang: "ne", role: "student" });
  await fakeBrowser(page, { permission: "granted", subscribed: true });
  await serverKey(page);
  await page.route("**/api/push/test", (route) => reply(route, { message: "No device has alerts switched on yet" }, 404));
  await page.goto("/settings");
  await page.getByRole("button", { name: "परीक्षण अलर्ट पठाउनुहोस्" }).click();
  await expect(page.getByText("कुनै उपकरणमा अझै अलर्ट खोलिएको छैन")).toBeVisible();
});

test("logging out removes this device's alerts, so a shared phone doesn't show the last student's messages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await setUp(page, { lang: "en", role: "student" });
  await fakeBrowser(page, { permission: "granted", subscribed: true });
  await serverKey(page);
  let removed = null;
  await page.route("**/api/push/subscribe", (route) => {
    if (route.request().method() === "DELETE") removed = route.request().postDataJSON().endpoint;
    return reply(route, { message: "ok" });
  });
  await page.route("**/api/auth/logout", (route) => reply(route, { message: "Logged out" }));
  await page.goto("/settings");
  await page.getByRole("button", { name: "Asha" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect.poll(() => removed).toBe(ENDPOINT);
  expect(await page.evaluate(() => window.__push.unsubscribed)).toBe(1);
});

test("logging out works normally on a device with no alerts", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await setUp(page, { lang: "en", role: "student" });
  await fakeBrowser(page, { hasWorker: false });
  let loggedOut = 0;
  await page.route("**/api/auth/logout", (route) => {
    loggedOut += 1;
    return reply(route, { message: "Logged out" });
  });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Asha" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect.poll(() => loggedOut).toBe(1);
});
