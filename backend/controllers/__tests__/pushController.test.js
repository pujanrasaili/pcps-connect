jest.mock("../../models/PushSubscription");
jest.mock("../../utils/webPush");

const PushSubscription = require("../../models/PushSubscription");
const { publicKey } = require("../../utils/webPush");
const { sendPush } = require("../../utils/webPush");
const { getKey, subscribe, unsubscribe, sendTest } = require("../pushController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const user = { _id: "u1" };
const sub = { endpoint: "https://fcm.example/abc", keys: { p256dh: "k", auth: "a" } };
afterEach(() => jest.resetAllMocks());

describe("getKey", () => {
  it("hands out the public key only when the server has keys", () => {
    publicKey.mockReturnValue("PUB");
    let res = mockRes();
    getKey({ user }, res);
    expect(res.json).toHaveBeenCalledWith({ enabled: true, key: "PUB" });
    publicKey.mockReturnValue(null);
    res = mockRes();
    getKey({ user }, res);
    expect(res.json).toHaveBeenCalledWith({ enabled: false });
  });
});

describe("subscribe", () => {
  beforeEach(() => {
    publicKey.mockReturnValue("PUB");
    PushSubscription.countDocuments.mockResolvedValue(0);
  });
  it("stores the device against the logged-in student (a device that switches accounts moves over)", async () => {
    const res = mockRes();
    await subscribe({ user, body: { subscription: sub } }, res);
    expect(PushSubscription.findOneAndUpdate).toHaveBeenCalledWith(
      { endpoint: sub.endpoint },
      { user: "u1", endpoint: sub.endpoint, keys: sub.keys },
      { upsert: true, setDefaultsOnInsert: true }
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it("refuses when alerts are off on the server (503)", async () => {
    publicKey.mockReturnValue(null);
    const res = mockRes();
    await subscribe({ user, body: { subscription: sub } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });
  it.each([
    [undefined],
    [{ endpoint: "http://insecure/x", keys: { p256dh: "k", auth: "a" } }],
    [{ endpoint: "https://x/y", keys: { p256dh: "k" } }],
    [{ endpoint: "https://x/" + "a".repeat(1000), keys: { p256dh: "k", auth: "a" } }],
  ])("rejects a bad subscription %j", async (bad) => {
    const res = mockRes();
    await subscribe({ user, body: { subscription: bad } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(PushSubscription.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it("stops at 10 devices", async () => {
    PushSubscription.countDocuments.mockResolvedValue(10);
    const res = mockRes();
    await subscribe({ user, body: { subscription: sub } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("unsubscribe", () => {
  it("removes only the caller's own device", async () => {
    const res = mockRes();
    await unsubscribe({ user, body: { endpoint: sub.endpoint } }, res);
    expect(PushSubscription.deleteOne).toHaveBeenCalledWith({ user: "u1", endpoint: sub.endpoint });
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("needs an endpoint", async () => {
    const res = mockRes();
    await unsubscribe({ user, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("sendTest", () => {
  it("sends a test alert to the student's own devices only", async () => {
    publicKey.mockReturnValue("PUB");
    sendPush.mockResolvedValue(2);
    const res = mockRes();
    await sendTest({ user }, res);
    expect(sendPush).toHaveBeenCalledWith(["u1"], expect.objectContaining({ link: "/settings" }));
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("says so when no device has alerts on, or the server has them off", async () => {
    publicKey.mockReturnValue("PUB");
    sendPush.mockResolvedValue(0);
    let res = mockRes();
    await sendTest({ user }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    publicKey.mockReturnValue(null);
    res = mockRes();
    await sendTest({ user }, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });
  it("reports a failure", async () => {
    publicKey.mockReturnValue("PUB");
    sendPush.mockRejectedValue(new Error("boom"));
    const res = mockRes();
    await sendTest({ user }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
