jest.mock("../../models/Notification");

const Notification = require("../../models/Notification");
const { getMyNotifications, markAllRead } = require("../notificationController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const user = { _id: "u1" };

afterEach(() => jest.resetAllMocks());

describe("getMyNotifications", () => {
  it("returns only the caller's latest messages and the unread count", async () => {
    const rows = [{ title: "A" }];
    const select = jest.fn().mockResolvedValue(rows);
    const limit = jest.fn().mockReturnValue({ select });
    const sort = jest.fn().mockReturnValue({ limit });
    Notification.find.mockReturnValue({ sort });
    Notification.countDocuments.mockResolvedValue(3);
    const res = mockRes();

    await getMyNotifications({ user }, res);

    expect(Notification.find).toHaveBeenCalledWith({ user: "u1" });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limit).toHaveBeenCalledWith(30);
    expect(Notification.countDocuments).toHaveBeenCalledWith({ user: "u1", read: false });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ notifications: rows, unreadCount: 3 });
  });

  it("returns 500 when the database fails", async () => {
    Notification.find.mockImplementation(() => { throw new Error("db down"); });
    const res = mockRes();
    await getMyNotifications({ user }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("markAllRead", () => {
  it("marks only the caller's unread messages as read", async () => {
    Notification.updateMany.mockResolvedValue({});
    const res = mockRes();
    await markAllRead({ user }, res);
    expect(Notification.updateMany).toHaveBeenCalledWith({ user: "u1", read: false }, { $set: { read: true } });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 500 when the database fails", async () => {
    Notification.updateMany.mockRejectedValue(new Error("db down"));
    const res = mockRes();
    await markAllRead({ user }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
