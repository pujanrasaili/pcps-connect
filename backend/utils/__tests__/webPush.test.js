jest.mock("web-push");
jest.mock("../../models/PushSubscription");

const webpush = require("web-push");
const PushSubscription = require("../../models/PushSubscription");

const KEYS = { VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" };
let webPush;
const load = (env) => {
  jest.resetModules();
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  Object.assign(process.env, env);
  jest.doMock("web-push");
  jest.doMock("../../models/PushSubscription");
  webPush = require("../webPush");
  return { webpush: require("web-push"), PushSubscription: require("../../models/PushSubscription") };
};
afterEach(() => {
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  jest.clearAllMocks();
});

describe("web push alerts", () => {
  it("does nothing, and says so, until the keys are set", async () => {
    const m = load({});
    expect(webPush.isConfigured()).toBe(false);
    expect(webPush.publicKey()).toBeNull();
    expect(await webPush.sendPush(["u1"], { title: "Hi" })).toBe(0);
    expect(m.PushSubscription.find).not.toHaveBeenCalled();
  });

  it("sends the title and a site-only link to each device of the given users", async () => {
    const m = load(KEYS);
    expect(webPush.publicKey()).toBe("pub");
    m.PushSubscription.find.mockResolvedValue([
      { _id: "s1", endpoint: "https://fcm.googleapis.com/1", keys: { p256dh: "k1", auth: "a1" } },
      { _id: "s2", endpoint: "https://fcm.googleapis.com/2", keys: { p256dh: "k2", auth: "a2" } },
    ]);
    m.webpush.sendNotification.mockResolvedValue({});
    expect(await webPush.sendPush(["u1", "u1", "u2"], { title: "Event moved", link: "/events/1" })).toBe(2);
    expect(m.PushSubscription.find).toHaveBeenCalledWith({ user: { $in: ["u1", "u2"] } });
    const [sub, payload] = m.webpush.sendNotification.mock.calls[0];
    expect(sub).toEqual({ endpoint: "https://fcm.googleapis.com/1", keys: { p256dh: "k1", auth: "a1" } });
    expect(JSON.parse(payload)).toEqual({ title: "Event moved", url: "/events/1" });
    // A link that leaves the site is replaced by the home page.
    await webPush.sendPush(["u1"], { title: "x", link: "//evil.com" });
    expect(JSON.parse(m.webpush.sendNotification.mock.calls.at(-1)[1]).url).toBe("/");
  });

  it("forgets a device whose subscription has expired, and survives other errors", async () => {
    const m = load(KEYS);
    jest.spyOn(console, "error").mockImplementation(() => {});
    m.PushSubscription.find.mockResolvedValue([
      { _id: "gone", endpoint: "https://fcm.googleapis.com/1", keys: { p256dh: "k", auth: "a" } },
      { _id: "flaky", endpoint: "https://fcm.googleapis.com/2", keys: { p256dh: "k", auth: "a" } },
      { _id: "ok", endpoint: "https://fcm.googleapis.com/3", keys: { p256dh: "k", auth: "a" } },
    ]);
    m.webpush.sendNotification
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockRejectedValueOnce({ statusCode: 500, message: "down" })
      .mockResolvedValueOnce({});
    expect(await webPush.sendPush(["u1"], { title: "x" })).toBe(1);
    expect(m.PushSubscription.deleteOne).toHaveBeenCalledTimes(1);
    expect(m.PushSubscription.deleteOne).toHaveBeenCalledWith({ _id: "gone" });
  });

  it("never throws, even if the database lookup fails", async () => {
    const m = load(KEYS);
    jest.spyOn(console, "error").mockImplementation(() => {});
    m.PushSubscription.find.mockRejectedValue(new Error("db"));
    await expect(webPush.sendPush(["u1"], { title: "x" })).resolves.toBe(0);
  });

  it("never calls an address that isn't a real push service, and forgets it", async () => {
    const m = load(KEYS);
    m.PushSubscription.find.mockResolvedValue([
      { _id: "bad", endpoint: "https://internal.local/hook", keys: { p256dh: "k", auth: "a" } },
      { _id: "good", endpoint: "https://fcm.googleapis.com/ok", keys: { p256dh: "k", auth: "a" } },
    ]);
    m.webpush.sendNotification.mockResolvedValue({});
    expect(await webPush.sendPush(["u1"], { title: "Hi" })).toBe(1);
    expect(m.webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(m.webpush.sendNotification.mock.calls[0][0].endpoint).toBe("https://fcm.googleapis.com/ok");
    expect(m.PushSubscription.deleteOne).toHaveBeenCalledWith({ _id: "bad" });
  });
});
