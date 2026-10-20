jest.mock("../../models/User");
jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/Club");
jest.mock("../../utils/notifyNewLeaders");
jest.mock("../../utils/notifyClubMembers");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/WaitlistEntry");
jest.mock("../../utils/waitlist");
jest.mock("../../models/AuditLog");
jest.mock("../../utils/audit");
jest.mock("../../utils/sendEmail");
jest.mock("../../utils/notifyRegistrants");
process.env.JWT_SECRET = "test-secret";

const User = require("../../models/User");
const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const ClubMembership = require("../../models/ClubMembership");
const WaitlistEntry = require("../../models/WaitlistEntry");
const AuditLog = require("../../models/AuditLog");
const { recordAudit } = require("../../utils/audit");
const sendEmail = require("../../utils/sendEmail");
const { notifyEventCancelled } = require("../../utils/notifyRegistrants");
const { notifyNewLeaders } = require("../../utils/notifyNewLeaders");
const { updateUser, deleteUser, updateEventAdmin, getAuditLog, announceToRegistrants, checkInByCode, updateRegistrationAttendance, getEventRegistrations, getClubLeaders, setClubLeaders, bulkApproveUsers } = require("../adminController");
const { notifyEventAnnouncement } = require("../../utils/notifyRegistrants");
const Club = require("../../models/Club");
const { notifyClubAnnouncement } = require("../../utils/notifyClubMembers");
const { announceToClubMembers } = require("../adminController");
const { createCheckInCode } = require("../../utils/checkInCode");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const ADMIN_ID = "admin1";
const OTHER_ADMIN_ID = "admin2";
const STUDENT_ID = "student1";

describe("updateUser -- admin safety guards", () => {
  afterEach(() => jest.clearAllMocks());

  it("blocks an admin from changing their own role", async () => {
    const req = {
      params: { id: ADMIN_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { role: "user" },
    };
    const res = mockRes();
    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("blocks an admin from changing their own approval status", async () => {
    const req = {
      params: { id: ADMIN_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { approvalStatus: "rejected" },
    };
    const res = mockRes();
    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("allows an admin to edit their own other fields (name, phone, etc.)", async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: ADMIN_ID, name: "New Name" });
    const req = {
      params: { id: ADMIN_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { name: "New Name" },
    };
    const res = mockRes();
    await updateUser(req, res);
    expect(User.findByIdAndUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("blocks demoting the last remaining admin", async () => {
    User.findById.mockResolvedValue({ role: "admin" });
    User.countDocuments.mockResolvedValue(1);
    const req = {
      params: { id: OTHER_ADMIN_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { role: "user" },
    };
    const res = mockRes();
    await updateUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/last remaining admin/i) })
    );
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("allows demoting an admin when other admins still exist", async () => {
    User.findById.mockResolvedValue({ role: "admin" });
    User.countDocuments.mockResolvedValue(2);
    User.findByIdAndUpdate.mockResolvedValue({ _id: OTHER_ADMIN_ID, role: "user" });
    const req = {
      params: { id: OTHER_ADMIN_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { role: "user" },
    };
    const res = mockRes();
    await updateUser(req, res);
    expect(User.findByIdAndUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("silently ignores an attempt to set the password field through this route", async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: STUDENT_ID });
    const req = {
      params: { id: STUDENT_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { password: "hacked123", name: "Fine Field" },
    };
    const res = mockRes();
    await updateUser(req, res);
    const [, updates] = User.findByIdAndUpdate.mock.calls[0];
    expect(updates).not.toHaveProperty("password");
    expect(updates).toEqual({ name: "Fine Field" });
  });
});

describe("updateUser -- approval decision emails", () => {
  afterEach(() => jest.clearAllMocks());

  it("emails the student when their pending registration is approved", async () => {
    User.findById.mockResolvedValue({ _id: STUDENT_ID, approvalStatus: "pending" });
    User.findByIdAndUpdate.mockResolvedValue({
      _id: STUDENT_ID,
      name: "Bibek Shrestha",
      email: "bibek@patancollege.edu.np",
      approvalStatus: "approved",
    });
    sendEmail.mockResolvedValue();

    const req = {
      params: { id: STUDENT_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { approvalStatus: "approved" },
    };
    const res = mockRes();
    await updateUser(req, res);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe("bibek@patancollege.edu.np");
    expect(sendEmail.mock.calls[0][0].subject).toMatch(/approved/i);
  });

  it("emails the student when their pending registration is rejected", async () => {
    User.findById.mockResolvedValue({ _id: STUDENT_ID, approvalStatus: "pending" });
    User.findByIdAndUpdate.mockResolvedValue({
      _id: STUDENT_ID,
      name: "Bibek Shrestha",
      email: "bibek@patancollege.edu.np",
      approvalStatus: "rejected",
    });
    sendEmail.mockResolvedValue();

    const req = {
      params: { id: STUDENT_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { approvalStatus: "rejected" },
    };
    const res = mockRes();
    await updateUser(req, res);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].subject).not.toMatch(/approved/i);
  });

  it("does not email when approvalStatus is sent but unchanged from its current value", async () => {
    User.findById.mockResolvedValue({ _id: STUDENT_ID, approvalStatus: "approved" });
    User.findByIdAndUpdate.mockResolvedValue({
      _id: STUDENT_ID,
      name: "Bibek Shrestha",
      email: "bibek@patancollege.edu.np",
      approvalStatus: "approved",
    });

    const req = {
      params: { id: STUDENT_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { approvalStatus: "approved", name: "Updated Name" },
    };
    const res = mockRes();
    await updateUser(req, res);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does not email when the update doesn't touch approvalStatus at all", async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: STUDENT_ID, name: "Fine Field" });
    const req = {
      params: { id: STUDENT_ID },
      user: { _id: { toString: () => ADMIN_ID } },
      body: { name: "Fine Field" },
    };
    const res = mockRes();
    await updateUser(req, res);

    expect(User.findById).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("deleteUser -- admin safety guards", () => {
  afterEach(() => jest.clearAllMocks());

  it("blocks an admin from deleting their own account", async () => {
    const req = { params: { id: ADMIN_ID }, user: { _id: { toString: () => ADMIN_ID } } };
    const res = mockRes();
    await deleteUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("404s when the target user doesn't exist", async () => {
    User.findById.mockResolvedValue(null);
    const req = { params: { id: "ghost" }, user: { _id: { toString: () => ADMIN_ID } } };
    const res = mockRes();
    await deleteUser(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("blocks deleting the last remaining admin", async () => {
    User.findById.mockResolvedValue({ _id: OTHER_ADMIN_ID, role: "admin" });
    User.countDocuments.mockResolvedValue(1);
    const req = { params: { id: OTHER_ADMIN_ID }, user: { _id: { toString: () => ADMIN_ID } } };
    const res = mockRes();
    await deleteUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/last remaining admin/i) })
    );
  });

  it("cascades the delete across events, registrations, and club memberships for an ordinary student", async () => {
    const deleteOne = jest.fn().mockResolvedValue();
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: "user", deleteOne });
    Event.find.mockResolvedValue([]);
    Event.deleteMany.mockResolvedValue({});
    Registration.deleteMany.mockResolvedValue({});
    ClubMembership.deleteMany.mockResolvedValue({});

    const req = { params: { id: STUDENT_ID }, user: { _id: { toString: () => ADMIN_ID } } };
    const res = mockRes();
    await deleteUser(req, res);

    expect(Event.deleteMany).toHaveBeenCalledWith({ createdBy: STUDENT_ID });
    expect(Registration.deleteMany).toHaveBeenCalledWith({ user: STUDENT_ID });
    expect(ClubMembership.deleteMany).toHaveBeenCalledWith({ user: STUDENT_ID });
    expect(WaitlistEntry.deleteMany).toHaveBeenCalledWith({ user: STUDENT_ID });
    expect(deleteOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("cancels the events a deleted user created: notifies registrants, then removes their registrations", async () => {
    const deleteOne = jest.fn().mockResolvedValue();
    User.findById.mockResolvedValue({ _id: OTHER_ADMIN_ID, role: "admin", deleteOne });
    User.countDocuments.mockResolvedValue(2);
    const ownedEvents = [{ _id: "evA", title: "A" }, { _id: "evB", title: "B" }];
    Event.find.mockResolvedValue(ownedEvents);
    Event.deleteMany.mockResolvedValue({});
    Registration.deleteMany.mockResolvedValue({});
    ClubMembership.deleteMany.mockResolvedValue({});

    const callOrder = [];
    notifyEventCancelled.mockImplementation(async () => callOrder.push("notify"));
    Registration.deleteMany.mockImplementation(async () => callOrder.push("deleteRegs"));

    const req = { params: { id: OTHER_ADMIN_ID }, user: { _id: { toString: () => ADMIN_ID } } };
    const res = mockRes();
    await deleteUser(req, res);

    expect(notifyEventCancelled).toHaveBeenCalledTimes(2);
    expect(Registration.deleteMany).toHaveBeenCalledWith({ event: { $in: ["evA", "evB"] } });
    // Notifications must happen before any registrations are deleted.
    expect(callOrder.indexOf("deleteRegs")).toBeGreaterThan(callOrder.lastIndexOf("notify"));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("updateEventAdmin -- field whitelist and capacity checks", () => {
  afterEach(() => jest.clearAllMocks());

  const existing = { _id: "ev1", date: new Date("2027-01-01"), location: "Hall A" };

  it("404s for an unknown event", async () => {
    Event.findById.mockResolvedValue(null);
    const res = mockRes();
    await updateEventAdmin({ params: { id: "nope" }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("does not let the request overwrite createdBy or other non-whitelisted fields", async () => {
    Event.findById.mockResolvedValue(existing);
    Event.findByIdAndUpdate.mockResolvedValue({ ...existing, title: "New" });
    const res = mockRes();
    await updateEventAdmin(
      { params: { id: "ev1" }, body: { title: "New", createdBy: "attacker", _id: "other" } },
      res
    );
    const [, updates] = Event.findByIdAndUpdate.mock.calls[0];
    expect(updates).toEqual({ title: "New" });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects an invalid capacity", async () => {
    Event.findById.mockResolvedValue(existing);
    const res = mockRes();
    await updateEventAdmin({ params: { id: "ev1" }, body: { capacity: "abc" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects lowering capacity below the number already registered", async () => {
    Event.findById.mockResolvedValue(existing);
    Registration.countDocuments.mockResolvedValue(30);
    const res = mockRes();
    await updateEventAdmin({ params: { id: "ev1" }, body: { capacity: 10 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe("admin audit log", () => {
  afterEach(() => jest.resetAllMocks());

  const actor = { _id: { toString: () => ADMIN_ID }, name: "Root Admin" };

  it("records a role change", async () => {
    User.findById.mockResolvedValue({ role: "user" });
    User.findByIdAndUpdate.mockResolvedValue({ name: "Sita", email: "s@patancollege.edu.np", role: "admin" });
    const res = mockRes();
    await updateUser({ params: { id: STUDENT_ID }, user: actor, body: { role: "admin" } }, res);
    expect(recordAudit).toHaveBeenCalledWith(actor, "user.role_changed", expect.stringContaining("admin"));
  });

  it("records an approval only on a real transition, not a no-op", async () => {
    User.findById.mockResolvedValue({ approvalStatus: "approved" });
    User.findByIdAndUpdate.mockResolvedValue({ name: "Sita", email: "s@patancollege.edu.np", approvalStatus: "approved" });
    const res = mockRes();
    await updateUser({ params: { id: STUDENT_ID }, user: actor, body: { approvalStatus: "approved" } }, res);
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("records an approval transition", async () => {
    User.findById.mockResolvedValue({ approvalStatus: "pending" });
    User.findByIdAndUpdate.mockResolvedValue({ name: "Sita", email: "s@patancollege.edu.np", approvalStatus: "approved" });
    sendEmail.mockResolvedValue();
    const res = mockRes();
    await updateUser({ params: { id: STUDENT_ID }, user: actor, body: { approvalStatus: "approved" } }, res);
    expect(recordAudit).toHaveBeenCalledWith(actor, "user.approved", expect.stringContaining("Sita"));
  });

  it("records an account deletion", async () => {
    const deleteOne = jest.fn().mockResolvedValue();
    User.findById.mockResolvedValue({ _id: STUDENT_ID, name: "Sita", email: "s@patancollege.edu.np", role: "user", deleteOne });
    Event.find.mockResolvedValue([]);
    const res = mockRes();
    await deleteUser({ params: { id: STUDENT_ID }, user: { ...actor, _id: { toString: () => ADMIN_ID } } }, res);
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), "user.deleted", expect.stringContaining("Sita"));
  });

  it("lists entries newest first", async () => {
    const limit = jest.fn().mockResolvedValue([{ summary: "x" }]);
    const sort = jest.fn().mockReturnValue({ limit });
    AuditLog.find.mockReturnValue({ sort });
    const res = mockRes();
    await getAuditLog({}, res);
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.json).toHaveBeenCalledWith({ entries: [{ summary: "x" }] });
  });
});

describe("announceToRegistrants", () => {
  afterEach(() => jest.resetAllMocks());

  const actor = { _id: "a1", name: "Root", role: "admin" };
  const call = (body, id = "ev1") => {
    const res = mockRes();
    return announceToRegistrants({ params: { id }, body, user: actor }, res).then(() => res);
  };

  it.each([[undefined], [""], ["   "], [123], [{ a: 1 }]])("rejects message %p", async (message) => {
    const res = await call({ message });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(notifyEventAnnouncement).not.toHaveBeenCalled();
  });

  it("rejects an over-long message", async () => {
    const res = await call({ message: "x".repeat(1001) });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404s for an unknown event", async () => {
    Event.findById.mockResolvedValue(null);
    const res = await call({ message: "hello" });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(notifyEventAnnouncement).not.toHaveBeenCalled();
  });

  it("sends the trimmed message, logs it, and reports how many were emailed", async () => {
    const ev = { _id: "ev1", title: "Hack Night" };
    Event.findById.mockResolvedValue(ev);
    notifyEventAnnouncement.mockResolvedValue(7);
    const res = await call({ message: "  Room changed to B2  " });
    expect(notifyEventAnnouncement).toHaveBeenCalledWith(ev, "Room changed to B2");
    expect(recordAudit).toHaveBeenCalledWith(actor, "event.announcement", expect.stringContaining("7"));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ sent: 7 }));
  });
});

describe("checkInByCode", () => {
  afterEach(() => jest.resetAllMocks());

  const REG_ID = "a".repeat(24);
  const call = (code) => {
    const res = mockRes();
    return checkInByCode({ body: { code }, user: { _id: "a1", role: "admin" } }, res).then(() => res);
  };
  function populated(doc) {
    const q = { populate: jest.fn() };
    q.populate.mockReturnValue(q);
    q.then = (resolve) => resolve(doc);
    return q;
  }

  it("rejects a forged or malformed code without touching the database", async () => {
    const res = await call(`${REG_ID}.forged`);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Registration.findById).not.toHaveBeenCalled();
  });

  it("404s when the registration no longer exists", async () => {
    Registration.findById.mockReturnValue(populated(null));
    const res = await call(createCheckInCode(REG_ID));
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("marks the student attended and reports who and which event", async () => {
    const reg = {
      attended: false,
      user: { name: "Sita", studentId: "S-12" },
      event: { title: "Hack Night", date: new Date() },
      save: jest.fn().mockResolvedValue(),
    };
    Registration.findById.mockReturnValue(populated(reg));
    const res = await call(createCheckInCode(REG_ID));
    expect(reg.attended).toBe(true);
    expect(reg.save).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ alreadyCheckedIn: false, student: { name: "Sita", studentId: "S-12" } })
    );
  });

  it("scanning twice is harmless and says so", async () => {
    const reg = {
      attended: true,
      user: { name: "Sita", studentId: "" },
      event: { title: "Hack Night", date: new Date() },
      save: jest.fn(),
    };
    Registration.findById.mockReturnValue(populated(reg));
    const res = await call(createCheckInCode(REG_ID));
    expect(reg.save).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ alreadyCheckedIn: true }));
  });
});

describe("getAttendanceReport", () => {
  const { getAttendanceReport } = require("../adminController");
  afterEach(() => jest.clearAllMocks());

  it("aggregates the most recent past events into a report", async () => {
    const limit = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: "e1", title: "Talk", date: "2026-10-01" }]) });
    Event.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit }) });
    Registration.aggregate = jest.fn().mockResolvedValue([{ _id: "e1", registered: 4, attended: 3, ratingSum: 0, ratingCount: 0 }]);
    const res = mockRes();

    await getAttendanceReport({ user: { _id: "a1", role: "admin" } }, res);

    expect(limit).toHaveBeenCalledWith(8);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].events[0]).toMatchObject({ attendanceRate: 75, noShows: 1 });
  });

  it("returns 500 when the database fails", async () => {
    Event.find = jest.fn().mockImplementation(() => { throw new Error("db down"); });
    const res = mockRes();
    await getAttendanceReport({ user: { _id: "a1", role: "admin" } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("limits a club leader's report to the clubs they lead", async () => {
    Club.find = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: "cA" }]) }) });
    const select = jest.fn().mockResolvedValue([]);
    Event.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ select }) }) });
    Registration.aggregate = jest.fn().mockResolvedValue([]);
    const res = mockRes();
    await getAttendanceReport({ user: { _id: "leader1", role: "user" } }, res);
    expect(Event.find).toHaveBeenCalledWith(expect.objectContaining({ club: { $in: ["cA"] } }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("403s someone who leads no club, without querying events", async () => {
    Club.find = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }) });
    Event.find = jest.fn();
    const res = mockRes();
    await getAttendanceReport({ user: { _id: "stu", role: "user" } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(Event.find).not.toHaveBeenCalled();
  });
});

describe("announceToClubMembers", () => {
  afterEach(() => jest.resetAllMocks());

  const actor = { _id: "a1", name: "Root", role: "admin" };
  const call = (body, id = "c1") => {
    const res = mockRes();
    return announceToClubMembers({ params: { id }, body, user: actor }, res).then(() => res);
  };

  it.each([[undefined], [""], ["   "], [42]])("rejects message %p", async (message) => {
    const res = await call({ message });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(notifyClubAnnouncement).not.toHaveBeenCalled();
  });

  it("rejects an over-long message", async () => {
    const res = await call({ message: "x".repeat(1001) });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404s for an unknown club", async () => {
    Club.findById.mockResolvedValue(null);
    const res = await call({ message: "hello" });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(notifyClubAnnouncement).not.toHaveBeenCalled();
  });

  it("sends the trimmed message, logs it, and reports how many were emailed", async () => {
    const club = { _id: "c1", name: "Tech Club" };
    Club.findById.mockResolvedValue(club);
    notifyClubAnnouncement.mockResolvedValue(5);
    const res = await call({ message: "  Meeting at 3  " });
    expect(notifyClubAnnouncement).toHaveBeenCalledWith(club, "Meeting at 3");
    expect(recordAudit).toHaveBeenCalledWith(actor, "club.announcement", expect.stringContaining("5 member(s)"));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Message sent to 5 member(s)", sent: 5 });
  });

  it("returns 500 when sending fails", async () => {
    Club.findById.mockResolvedValue({ _id: "c1", name: "Tech Club" });
    notifyClubAnnouncement.mockRejectedValue(new Error("db down"));
    const res = await call({ message: "hi" });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe("getEventRegistrations", () => {
  afterEach(() => jest.resetAllMocks());

  const sorted = (docs) => ({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(docs) }) });

  it("returns registrations and the waitlist in queue order", async () => {
    Event.findById.mockResolvedValue({ _id: "e1" });
    Registration.find.mockReturnValue(sorted([{ _id: "r1" }]));
    WaitlistEntry.find.mockReturnValue(sorted([{ _id: "w1" }, { _id: "w2" }]));
    const res = mockRes();

    await getEventRegistrations({ params: { id: "e1" }, user: { _id: "a1", role: "admin" } }, res);

    expect(WaitlistEntry.find).toHaveBeenCalledWith({ event: "e1" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ registrations: [{ _id: "r1" }], waitlist: [{ _id: "w1" }, { _id: "w2" }] });
  });

  it("404s for an unknown event", async () => {
    Event.findById.mockResolvedValue(null);
    const res = mockRes();
    await getEventRegistrations({ params: { id: "nope" }, user: { _id: "a1", role: "admin" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(WaitlistEntry.find).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Club leaders: may manage ONLY the events/club they lead
// ---------------------------------------------------------------------------
describe("club leader permissions", () => {
  afterEach(() => jest.resetAllMocks());

  const LEADER = { _id: "leader1", name: "Pres", role: "user" };
  const ownEvent = { _id: "e1", title: "Own", club: "clubA" };
  const otherEvent = { _id: "e2", title: "Other", club: "clubB" };
  const noClubEvent = { _id: "e3", title: "General", club: null };
  // Club.exists({ _id: clubId, leaders }) -> truthy only for the club this person leads
  const leadsOnlyClubA = () =>
    Club.exists.mockImplementation(async (q) => (q._id === "clubA" && q.leaders === "leader1" ? { _id: "clubA" } : null));

  describe("getEventRegistrations", () => {
    const sorted = (docs) => ({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(docs) }) });
    it("lets a leader see their own club's event", async () => {
      leadsOnlyClubA();
      Event.findById.mockResolvedValue(ownEvent);
      Registration.find.mockReturnValue(sorted([]));
      WaitlistEntry.find.mockReturnValue(sorted([]));
      const res = mockRes();
      await getEventRegistrations({ params: { id: "e1" }, user: LEADER }, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    it.each([["another club's", otherEvent], ["a no-club", noClubEvent]])("403s for %s event and reads no registrations", async (_l, ev) => {
      leadsOnlyClubA();
      Event.findById.mockResolvedValue(ev);
      const res = mockRes();
      await getEventRegistrations({ params: { id: ev._id }, user: LEADER }, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(Registration.find).not.toHaveBeenCalled();
    });
  });

  describe("updateRegistrationAttendance", () => {
    const run = (ev, user = LEADER) => {
      const reg = { _id: "r1", event: ev._id, attended: false, save: jest.fn().mockResolvedValue(), populate: jest.fn().mockResolvedValue() };
      Registration.findById.mockResolvedValue(reg);
      Event.findById.mockResolvedValue(ev);
      const res = mockRes();
      return updateRegistrationAttendance({ params: { id: "r1" }, body: { attended: true }, user }, res).then(() => ({ res, reg }));
    };
    it("lets a leader mark attendance for their own club's event", async () => {
      leadsOnlyClubA();
      const { res, reg } = await run(ownEvent);
      expect(reg.attended).toBe(true);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    it("403s and changes nothing for another club's event", async () => {
      leadsOnlyClubA();
      const { res, reg } = await run(otherEvent);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(reg.save).not.toHaveBeenCalled();
    });
    it("a plain student (no clubs led) is refused", async () => {
      Club.exists.mockResolvedValue(null);
      const { res, reg } = await run(ownEvent, { _id: "stu", role: "user" });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(reg.save).not.toHaveBeenCalled();
    });
    it("an admin can mark any event", async () => {
      const { res } = await run(otherEvent, { _id: "a1", role: "admin" });
      expect(res.status).toHaveBeenCalledWith(200);
    });
    it("404s for an unknown registration", async () => {
      Registration.findById.mockResolvedValue(null);
      const res = mockRes();
      await updateRegistrationAttendance({ params: { id: "x" }, body: { attended: true }, user: LEADER }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("checkInByCode", () => {
    const REG = "b".repeat(24);
    const populated = (doc) => {
      const q = { populate: jest.fn() };
      q.populate.mockReturnValue(q);
      q.then = (resolve) => resolve(doc);
      return q;
    };
    it("lets a leader check in a student of their own club's event", async () => {
      leadsOnlyClubA();
      const reg = { attended: false, user: { name: "S" }, event: ownEvent, save: jest.fn().mockResolvedValue() };
      Registration.findById.mockReturnValue(populated(reg));
      const res = mockRes();
      await checkInByCode({ body: { code: createCheckInCode(REG) }, user: LEADER }, res);
      expect(reg.attended).toBe(true);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    it("refuses a student registered for another club's event and does not check them in", async () => {
      leadsOnlyClubA();
      const reg = { attended: false, user: { name: "S" }, event: otherEvent, save: jest.fn() };
      Registration.findById.mockReturnValue(populated(reg));
      const res = mockRes();
      await checkInByCode({ body: { code: createCheckInCode(REG) }, user: LEADER }, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(reg.save).not.toHaveBeenCalled();
      expect(reg.attended).toBe(false);
    });
  });

  describe("announcements", () => {
    it("a leader can message their own event's registrants", async () => {
      leadsOnlyClubA();
      Event.findById.mockResolvedValue(ownEvent);
      notifyEventAnnouncement.mockResolvedValue(3);
      const res = mockRes();
      await announceToRegistrants({ params: { id: "e1" }, body: { message: "hi" }, user: LEADER }, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    it("a leader cannot message another club's event registrants", async () => {
      leadsOnlyClubA();
      Event.findById.mockResolvedValue(otherEvent);
      const res = mockRes();
      await announceToRegistrants({ params: { id: "e2" }, body: { message: "hi" }, user: LEADER }, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(notifyEventAnnouncement).not.toHaveBeenCalled();
    });
    it("a leader can message their own club's members but not another club's", async () => {
      leadsOnlyClubA();
      Club.findById.mockImplementation(async (id) => ({ _id: id, name: id }));
      notifyClubAnnouncement.mockResolvedValue(4);
      const ok = mockRes();
      await announceToClubMembers({ params: { id: "clubA" }, body: { message: "hi" }, user: LEADER }, ok);
      expect(ok.status).toHaveBeenCalledWith(200);
      const no = mockRes();
      await announceToClubMembers({ params: { id: "clubB" }, body: { message: "hi" }, user: LEADER }, no);
      expect(no.status).toHaveBeenCalledWith(403);
      expect(notifyClubAnnouncement).toHaveBeenCalledTimes(1);
    });
  });
});

describe("club leader management (admin only)", () => {
  afterEach(() => jest.resetAllMocks());
  const ADMIN = { _id: "a1", name: "Root", role: "admin" };
  const ID1 = "1".repeat(24);
  const ID2 = "2".repeat(24);

  const run = (fn, req) => {
    const res = mockRes();
    return fn({ user: ADMIN, ...req }, res).then(() => res);
  };

  it.each([[undefined], ["x"], [[123]], [["not-an-id"]], [Array(11).fill(ID1)]])("setClubLeaders rejects userIds %p", async (userIds) => {
    const res = await run(setClubLeaders, { params: { id: "c1" }, body: { userIds } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Club.findById).not.toHaveBeenCalled();
  });

  it("setClubLeaders 404s for an unknown club", async () => {
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = await run(setClubLeaders, { params: { id: "c1" }, body: { userIds: [ID1] } });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("setClubLeaders refuses ids that aren't approved accounts", async () => {
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "Tech", save: jest.fn() }) });
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: ID1, name: "A" }]) });
    const res = await run(setClubLeaders, { params: { id: "c1" }, body: { userIds: [ID1, ID2] } });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("setClubLeaders saves the (de-duplicated) leaders and logs it", async () => {
    const club = { name: "Tech", save: jest.fn().mockResolvedValue() };
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(club) });
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: ID1, name: "Sita" }]) });
    const res = await run(setClubLeaders, { params: { id: "c1" }, body: { userIds: [ID1, ID1] } });
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ _id: { $in: [ID1] }, approvalStatus: "approved" }));
    expect(club.leaders).toEqual([ID1]);
    expect(notifyNewLeaders).toHaveBeenCalledWith([{ _id: ID1, name: "Sita" }], club);
    expect(recordAudit).toHaveBeenCalledWith(ADMIN, "club.leaders", expect.stringContaining("Sita"));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("setClubLeaders can clear all leaders", async () => {
    const club = { name: "Tech", save: jest.fn().mockResolvedValue() };
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(club) });
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const res = await run(setClubLeaders, { params: { id: "c1" }, body: { userIds: [] } });
    expect(club.leaders).toEqual([]);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("getClubLeaders returns the populated leaders", async () => {
    const q = { select: jest.fn().mockReturnThis(), populate: jest.fn().mockResolvedValue({ leaders: [{ name: "Sita" }] }) };
    Club.findById.mockReturnValue(q);
    const res = await run(getClubLeaders, { params: { id: "c1" } });
    expect(res.json).toHaveBeenCalledWith({ leaders: [{ name: "Sita" }] });
  });
});

describe("bulkApproveUsers", () => {
  afterEach(() => jest.resetAllMocks());
  const ADMIN = { _id: "a1", name: "Root", role: "admin" };
  const ID1 = "1".repeat(24);
  const ID2 = "2".repeat(24);
  const run = (body) => {
    const res = mockRes();
    return bulkApproveUsers({ user: ADMIN, body }, res).then(() => res);
  };

  it.each([[{}], [{ userIds: [] }], [{ userIds: "x" }], [{ userIds: ["nope"] }], [{ userIds: Array(201).fill(ID1) }]])(
    "rejects %p",
    async (body) => {
      const res = await run(body);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(User.find).not.toHaveBeenCalled();
      expect(User.updateMany).not.toHaveBeenCalled();
    }
  );

  it("approves only still-pending accounts, emails them and audits once", async () => {
    sendEmail.mockResolvedValue();
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: ID1, name: "A", email: "a@x.com" }]) });
    const res = await run({ userIds: [ID1, ID2, ID1] });
    expect(User.find).toHaveBeenCalledWith({ _id: { $in: [ID1, ID2] }, approvalStatus: "pending" });
    expect(User.updateMany).toHaveBeenCalledWith({ _id: { $in: [ID1] }, approvalStatus: "pending" }, { approvalStatus: "approved" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(recordAudit).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ approved: 1 }));
  });

  it("does nothing when none of the accounts are pending", async () => {
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const res = await run({ userIds: [ID1] });
    expect(User.updateMany).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ approved: 0 }));
  });
});

describe("getInsights", () => {
  const { getInsights } = require("../adminController");
  afterEach(() => jest.clearAllMocks());

  it("combines monthly registrations, top clubs and overall turnout", async () => {
    const now = new Date();
    Registration.aggregate = jest
      .fn()
      .mockResolvedValueOnce([{ _id: { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1 }, count: 5 }]) // monthly
      .mockResolvedValueOnce([{ _id: null, registered: 8, attended: 6 }]); // turnout
    ClubMembership.aggregate = jest.fn().mockResolvedValue([{ _id: "c1", members: 12 }]);
    Club.find = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: "c1", name: "Coding" }]) });
    Event.find = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: "e1" }]) });
    const res = mockRes();

    await getInsights({ user: { _id: "a1", role: "admin" } }, res);

    const body = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.registrationsByMonth).toHaveLength(6);
    expect(body.registrationsByMonth[5].count).toBe(5);
    expect(body.topClubs).toEqual([{ _id: "c1", name: "Coding", members: 12 }]);
    expect(body.attendance).toEqual({ attended: 6, registered: 8, rate: 75 });
  });

  it("works on an empty database (no clubs, no past events) with a null rate", async () => {
    Registration.aggregate = jest.fn().mockResolvedValue([]);
    ClubMembership.aggregate = jest.fn().mockResolvedValue([]);
    Club.find = jest.fn();
    Event.find = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const res = mockRes();

    await getInsights({ user: { _id: "a1", role: "admin" } }, res);

    const body = res.json.mock.calls[0][0];
    expect(body.topClubs).toEqual([]);
    expect(body.attendance).toEqual({ attended: 0, registered: 0, rate: null });
    expect(body.registrationsByMonth.every((m) => m.count === 0)).toBe(true);
    expect(Club.find).not.toHaveBeenCalled();
    expect(Registration.aggregate).toHaveBeenCalledTimes(1); // no turnout query without past events
  });

  it("returns 500 when the database fails", async () => {
    Registration.aggregate = jest.fn().mockRejectedValue(new Error("db down"));
    ClubMembership.aggregate = jest.fn().mockResolvedValue([]);
    Event.find = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const res = mockRes();
    await getInsights({ user: { _id: "a1", role: "admin" } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
