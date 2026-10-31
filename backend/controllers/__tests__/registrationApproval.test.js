// Events that require organiser approval: joining is a request ("pending"),
// organisers approve or decline it, and a pending request can't be checked in,
// marked attended or given a QR code.
process.env.JWT_SECRET = "test-secret";
jest.mock("../../models/User");
jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/Club");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/WaitlistEntry");
jest.mock("../../models/AuditLog");
jest.mock("../../utils/waitlist");
jest.mock("../../utils/inApp");
jest.mock("../../utils/audit");
jest.mock("../../utils/sendEmail");
jest.mock("../../utils/notifyRegistrants");
jest.mock("../../utils/notifyClubMembers");
jest.mock("../../utils/notifyNewLeaders");

const Registration = require("../../models/Registration");
const Event = require("../../models/Event");
const Club = require("../../models/Club");
const sendEmail = require("../../utils/sendEmail");
const { pushNotifications } = require("../../utils/inApp");
const { promoteFromWaitlist } = require("../../utils/waitlist");
const { createCheckInCode } = require("../../utils/checkInCode");
const { decideRegistration, updateRegistrationAttendance, checkInByCode } = require("../adminController");
const { registerForEvent, getCheckInCode, cancelRegistration } = require("../registrationController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const ADMIN = { _id: "a1", role: "admin" };
const STUDENT = { _id: "stu", role: "user", name: "Asha", email: "asha@patancollege.edu.np" };
const event = (extra = {}) => ({ _id: "64b7f0c2a1b2c3d4e5f60002", title: "Hack Night", location: "Lab 3", capacity: 5, club: "cA", date: new Date(Date.now() + 864e5), ...extra });
const pendingReg = (extra = {}) => ({
  _id: "r1",
  event: "64b7f0c2a1b2c3d4e5f60002",
  status: "pending",
  user: { _id: "stu", name: "Asha", email: "asha@patancollege.edu.np" },
  save: jest.fn().mockResolvedValue(),
  deleteOne: jest.fn().mockResolvedValue(),
  ...extra,
});

beforeEach(() => {
  sendEmail.mockResolvedValue();
  promoteFromWaitlist.mockResolvedValue(0);
});
afterEach(() => jest.resetAllMocks());

describe("registerForEvent on an approval event", () => {
  const setup = () => {
    Event.findById.mockResolvedValue(event({ requiresApproval: true }));
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments.mockResolvedValue(1);
    Registration.create.mockImplementation(async (doc) => ({ _id: "r1", ...doc, deleteOne: jest.fn() }));
  };

  it("creates a pending request (holding a seat) and emails 'request received', not a confirmation", async () => {
    setup();
    const res = mockRes();
    await registerForEvent({ body: { eventId: "64b7f0c2a1b2c3d4e5f60002" }, user: STUDENT }, res);
    expect(Registration.create).toHaveBeenCalledWith({ user: "stu", event: "64b7f0c2a1b2c3d4e5f60002", status: "pending" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].message).toMatch(/request sent/i);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.subject).toMatch(/Request received/);
    expect(mail.icalEvent).toBeUndefined(); // no calendar invite until approved
  });

  it("still refuses when the event is full", async () => {
    setup();
    Registration.countDocuments.mockResolvedValue(5);
    const res = mockRes();
    await registerForEvent({ body: { eventId: "64b7f0c2a1b2c3d4e5f60002" }, user: STUDENT }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Registration.create).not.toHaveBeenCalled();
  });

  it("leaves ordinary events as instantly confirmed", async () => {
    setup();
    Event.findById.mockResolvedValue(event()); // requiresApproval undefined
    const res = mockRes();
    await registerForEvent({ body: { eventId: "64b7f0c2a1b2c3d4e5f60002" }, user: STUDENT }, res);
    expect(Registration.create).toHaveBeenCalledWith({ user: "stu", event: "64b7f0c2a1b2c3d4e5f60002", status: "confirmed" });
  });
});

describe("decideRegistration", () => {
  const run = (body, { reg = pendingReg(), ev = event(), user = ADMIN } = {}) => {
    Registration.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(reg) });
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    return decideRegistration({ params: { id: "r1" }, body, user }, res).then(() => ({ res, reg }));
  };

  it("rejects anything but approve/reject", async () => {
    const { res } = await run({ decision: "maybe" });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Registration.findById).not.toHaveBeenCalled();
  });

  it("404s when the student already withdrew the request", async () => {
    Registration.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await decideRegistration({ params: { id: "r1" }, body: { decision: "approve" }, user: ADMIN }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("approve confirms the registration and emails the confirmation with a calendar invite", async () => {
    const { res, reg } = await run({ decision: "approve" });
    expect(reg.status).toBe("confirmed");
    expect(reg.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe("asha@patancollege.edu.np");
    expect(mail.subject).toMatch(/You're registered/);
    expect(mail.icalEvent).toContain("BEGIN:VEVENT");
  });

  it("reject removes the request, tells the student and offers the seat to the waitlist", async () => {
    const ev = event();
    const { res, reg } = await run({ decision: "reject" }, { ev });
    expect(reg.deleteOne).toHaveBeenCalled();
    expect(sendEmail.mock.calls[0][0].subject).toMatch(/Update on your request/);
    expect(promoteFromWaitlist).toHaveBeenCalledWith(ev);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("approving or declining also posts a message under the student's bell", async () => {
    await run({ decision: "approve" });
    expect(pushNotifications).toHaveBeenLastCalledWith([expect.anything()], expect.objectContaining({ type: "join_approved" }));
    await run({ decision: "reject" });
    expect(pushNotifications).toHaveBeenLastCalledWith([expect.anything()], expect.objectContaining({ type: "join_declined" }));
  });

  it("a decided request can't be decided again (no duplicate emails)", async () => {
    const { res } = await run({ decision: "approve" }, { reg: pendingReg({ status: "confirmed" }) });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("a decline still succeeds if the waitlist promotion or the email fails", async () => {
    promoteFromWaitlist.mockRejectedValue(new Error("boom"));
    sendEmail.mockRejectedValue(new Error("SMTP down"));
    const { res } = await run({ decision: "reject" });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("a club leader can decide for their own club but not another club's event", async () => {
    const leader = { _id: "lead", role: "user" };
    Club.exists.mockResolvedValue({ _id: "cA" });
    let out = await run({ decision: "approve" }, { user: leader });
    expect(out.res.status).toHaveBeenCalledWith(200);

    jest.clearAllMocks();
    sendEmail.mockResolvedValue();
    Club.exists.mockResolvedValue(null);
    out = await run({ decision: "approve" }, { user: leader, ev: event({ club: "cB" }) });
    expect(out.res.status).toHaveBeenCalledWith(403);
    expect(out.reg.save).not.toHaveBeenCalled();
  });
});

describe("pending requests can't be used as confirmed seats", () => {
  it("attendance can't be marked until approved", async () => {
    const reg = pendingReg();
    Registration.findById.mockResolvedValue(reg);
    Event.findById.mockResolvedValue(event());
    const res = mockRes();
    await updateRegistrationAttendance({ params: { id: "r1" }, body: { attended: true }, user: ADMIN }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(reg.save).not.toHaveBeenCalled();
  });

  it("QR check-in refuses a pending request", async () => {
    const reg = { ...pendingReg(), attended: false, user: { name: "Asha" }, event: event() };
    const q = { populate: jest.fn() };
    q.populate.mockReturnValue(q);
    q.then = (resolve) => resolve(reg);
    Registration.findById.mockReturnValue(q);
    const res = mockRes();
    await checkInByCode({ body: { code: createCheckInCode("a".repeat(24)) }, user: ADMIN }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(reg.save).not.toHaveBeenCalled();
  });

  it("the student gets no QR code while pending", async () => {
    Registration.findById.mockResolvedValue({ _id: "r1", status: "pending", user: { toString: () => "stu" } });
    const res = mockRes();
    await getCheckInCode({ params: { id: "r1" }, user: { _id: { toString: () => "stu" } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("withdrawing a pending request frees the seat for the waitlist", async () => {
    const reg = pendingReg({ user: { toString: () => "stu" } });
    reg.user = { toString: () => "stu" };
    Registration.findById.mockResolvedValue(reg);
    Event.findById.mockResolvedValue(event());
    const res = mockRes();
    await cancelRegistration({ params: { id: "r1" }, user: { _id: { toString: () => "stu" } } }, res);
    expect(reg.deleteOne).toHaveBeenCalled();
    expect(promoteFromWaitlist).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
