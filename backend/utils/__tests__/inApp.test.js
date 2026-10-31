jest.mock("../../models/Notification");
jest.mock("../../models/User");

const Notification = require("../../models/Notification");
const User = require("../../models/User");
const { pushNotifications, notifyAdmins } = require("../inApp");

afterEach(() => jest.resetAllMocks());

describe("pushNotifications", () => {
  it("stores one message per distinct user", async () => {
    Notification.insertMany.mockResolvedValue([]);
    const n = await pushNotifications(["u1", "u2", "u1", null, undefined], { type: "t", title: "Hello", link: "/events/1" });
    expect(n).toBe(2);
    expect(Notification.insertMany).toHaveBeenCalledWith([
      { user: "u1", type: "t", title: "Hello", link: "/events/1" },
      { user: "u2", type: "t", title: "Hello", link: "/events/1" },
    ]);
  });

  it("does nothing when there is nobody to tell or nothing to say", async () => {
    expect(await pushNotifications([], { type: "t", title: "x" })).toBe(0);
    expect(await pushNotifications([null], { type: "t", title: "x" })).toBe(0);
    expect(await pushNotifications(["u1"], { type: "t", title: "" })).toBe(0);
    expect(Notification.insertMany).not.toHaveBeenCalled();
  });

  it("only keeps links that are paths on this site", async () => {
    Notification.insertMany.mockResolvedValue([]);
    for (const link of ["https://evil.example", "//evil.example", "javascript:alert(1)", 42, undefined]) {
      await pushNotifications(["u1"], { type: "t", title: "x", link });
      expect(Notification.insertMany.mock.calls.at(-1)[0][0].link).toBe("");
    }
  });

  it("trims very long titles", async () => {
    Notification.insertMany.mockResolvedValue([]);
    await pushNotifications(["u1"], { type: "t", title: "x".repeat(500) });
    expect(Notification.insertMany.mock.calls[0][0][0].title).toHaveLength(200);
  });

  it("never throws: a database problem is swallowed and reported as zero", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    Notification.insertMany.mockRejectedValue(new Error("db down"));
    await expect(pushNotifications(["u1"], { type: "t", title: "x" })).resolves.toBe(0);
    spy.mockRestore();
  });
});

describe("notifyAdmins", () => {
  it("posts the message for every admin account", async () => {
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: "a1" }, { _id: "a2" }]) });
    Notification.insertMany.mockResolvedValue([]);
    expect(await notifyAdmins({ type: "t", title: "Hi", link: "/admin/users" })).toBe(2);
    expect(User.find).toHaveBeenCalledWith({ role: "admin" });
  });

  it("never throws if the lookup fails", async () => {
    User.find.mockImplementation(() => { throw new Error("db"); });
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(notifyAdmins({ type: "t", title: "Hi" })).resolves.toBe(0);
  });
});
