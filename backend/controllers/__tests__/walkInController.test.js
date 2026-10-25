jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/User");
jest.mock("../../models/WaitlistEntry");
jest.mock("../../utils/audit");
jest.mock("../../utils/clubAccess");

const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const User = require("../../models/User");
const WaitlistEntry = require("../../models/WaitlistEntry");
const { recordAudit } = require("../../utils/audit");
const { canManageEvent } = require("../../utils/clubAccess");
const { addWalkIn } = require("../walkInController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const EV = "e".repeat(24);
const organiser = { _id: "org1", name: "Org" };
const student = { _id: "s1", name: "Sita Rai", studentId: "PCPS-9" };
const req = (identifier = "sita@x.np") => ({ params: { id: EV }, body: { identifier }, user: organiser });

beforeEach(() => {
  Event.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: EV, title: "Hack Night", capacity: 10, club: "c1" }) });
  canManageEvent.mockResolvedValue(true);
  User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(student) });
  Registration.findOne.mockResolvedValue(null);
  Registration.countDocuments.mockResolvedValue(3);
  Registration.create.mockResolvedValue({ _id: "r1" });
  WaitlistEntry.deleteMany.mockResolvedValue({});
});
afterEach(() => jest.resetAllMocks());

describe("addWalkIn", () => {
  it("registers and checks in a student who never signed up, and records it", async () => {
    const res = mockRes();
    await addWalkIn(req(), res);
    expect(Registration.create).toHaveBeenCalledWith({ user: "s1", event: EV, status: "confirmed", attended: true });
    expect(WaitlistEntry.deleteMany).toHaveBeenCalledWith({ user: "s1", event: EV });
    expect(recordAudit).toHaveBeenCalledWith(organiser, "event.walkIn", 'Added Sita Rai as a walk-in at "Hack Night"');
    expect(res.status).toHaveBeenCalledWith(201);
    // Only the name and student ID come back, nothing else about the account.
    expect(res.json.mock.calls[0][0].student).toEqual({ name: "Sita Rai", studentId: "PCPS-9" });
  });

  it("refuses someone who doesn't manage the event, before looking anyone up", async () => {
    canManageEvent.mockResolvedValue(false);
    const res = mockRes();
    await addWalkIn(req(), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("404s for a missing event or an unknown student, 400s for bad input", async () => {
    Event.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    let res = mockRes();
    await addWalkIn(req(), res);
    expect(res.status).toHaveBeenCalledWith(404);

    Event.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: EV, title: "T", capacity: 10 }) });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    res = mockRes();
    await addWalkIn(req("nobody@x.np"), res);
    expect(res.status).toHaveBeenCalledWith(404);

    res = mockRes();
    await addWalkIn(req("ab"), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("won't go over the event's capacity", async () => {
    Registration.countDocuments.mockResolvedValue(10);
    const res = mockRes();
    await addWalkIn(req(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Registration.create).not.toHaveBeenCalled();
  });

  it("checks in a student who had registered but not yet been marked, without double-counting", async () => {
    const existing = { attended: false, status: "confirmed", save: jest.fn().mockResolvedValue() };
    Registration.findOne.mockResolvedValue(existing);
    const res = mockRes();
    await addWalkIn(req(), res);
    expect(Registration.create).not.toHaveBeenCalled();
    expect(Registration.countDocuments).not.toHaveBeenCalled();
    expect(existing.attended).toBe(true);
    expect(existing.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("settles a pending request when the organiser accepts them at the door", async () => {
    const existing = { attended: false, status: "pending", save: jest.fn().mockResolvedValue() };
    Registration.findOne.mockResolvedValue(existing);
    const res = mockRes();
    await addWalkIn(req(), res);
    expect(existing.status).toBe("confirmed");
    expect(existing.attended).toBe(true);
  });

  it("reports an already checked-in student without writing or auditing again", async () => {
    const existing = { attended: true, status: "confirmed", save: jest.fn() };
    Registration.findOne.mockResolvedValue(existing);
    const res = mockRes();
    await addWalkIn(req(), res);
    expect(existing.save).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].alreadyCheckedIn).toBe(true);
  });
});
