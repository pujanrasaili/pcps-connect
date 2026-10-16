jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/WaitlistEntry");

const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const WaitlistEntry = require("../../models/WaitlistEntry");
const { getWaitlistStatus, joinWaitlist, leaveWaitlist } = require("../waitlistController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const req = { params: { eventId: "ev1" }, user: { _id: "u1" } };
const future = new Date(Date.now() + 86400000);

describe("joinWaitlist", () => {
  afterEach(() => jest.resetAllMocks());

  it("404s for an unknown event", async () => {
    Event.findById.mockResolvedValue(null);
    const res = mockRes();
    await joinWaitlist(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("refuses for an event that already happened", async () => {
    Event.findById.mockResolvedValue({ _id: "ev1", capacity: 5, date: new Date(Date.now() - 1000) });
    const res = mockRes();
    await joinWaitlist(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(WaitlistEntry.create).not.toHaveBeenCalled();
  });

  it("refuses when the student is already registered", async () => {
    Event.findById.mockResolvedValue({ _id: "ev1", capacity: 5, date: future });
    Registration.findOne.mockResolvedValue({ _id: "r1" });
    const res = mockRes();
    await joinWaitlist(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(WaitlistEntry.create).not.toHaveBeenCalled();
  });

  it("refuses when the event still has spots", async () => {
    Event.findById.mockResolvedValue({ _id: "ev1", capacity: 5, date: future });
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments.mockResolvedValue(4);
    const res = mockRes();
    await joinWaitlist(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(WaitlistEntry.create).not.toHaveBeenCalled();
  });

  it("adds the student to the waitlist for a full event and reports their place", async () => {
    Event.findById.mockResolvedValue({ _id: "ev1", capacity: 5, date: future });
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments.mockResolvedValue(5);
    WaitlistEntry.create.mockResolvedValue({});
    WaitlistEntry.countDocuments.mockResolvedValue(3);
    const res = mockRes();
    await joinWaitlist(req, res);
    expect(WaitlistEntry.create).toHaveBeenCalledWith({ user: "u1", event: "ev1" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ position: 3 }));
  });

  it("400s (not 500) if they double-click and hit the unique index", async () => {
    Event.findById.mockResolvedValue({ _id: "ev1", capacity: 5, date: future });
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments.mockResolvedValue(5);
    WaitlistEntry.create.mockRejectedValue({ code: 11000 });
    const res = mockRes();
    await joinWaitlist(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("getWaitlistStatus", () => {
  afterEach(() => jest.resetAllMocks());

  it("reports not on the waitlist", async () => {
    WaitlistEntry.findOne.mockResolvedValue(null);
    const res = mockRes();
    await getWaitlistStatus(req, res);
    expect(res.json).toHaveBeenCalledWith({ onWaitlist: false });
  });

  it("reports position as one more than the number queued ahead", async () => {
    WaitlistEntry.findOne.mockResolvedValue({ createdAt: new Date() });
    WaitlistEntry.countDocuments.mockResolvedValue(2);
    const res = mockRes();
    await getWaitlistStatus(req, res);
    expect(res.json).toHaveBeenCalledWith({ onWaitlist: true, position: 3 });
  });
});

describe("leaveWaitlist", () => {
  afterEach(() => jest.resetAllMocks());

  it("removes only the caller's own entry", async () => {
    WaitlistEntry.deleteOne.mockResolvedValue({});
    const res = mockRes();
    await leaveWaitlist(req, res);
    expect(WaitlistEntry.deleteOne).toHaveBeenCalledWith({ user: "u1", event: "ev1" });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
