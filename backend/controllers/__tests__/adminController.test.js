jest.mock("../../models/User");
jest.mock("../../models/Event");
jest.mock("../../models/Registration");
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
const { updateUser, deleteUser, updateEventAdmin, getAuditLog, announceToRegistrants, checkInByCode } = require("../adminController");
const { notifyEventAnnouncement } = require("../../utils/notifyRegistrants");
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

  const actor = { _id: "a1", name: "Root" };
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
    return checkInByCode({ body: { code } }, res).then(() => res);
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

    await getAttendanceReport({}, res);

    expect(limit).toHaveBeenCalledWith(8);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].events[0]).toMatchObject({ attendanceRate: 75, noShows: 1 });
  });

  it("returns 500 when the database fails", async () => {
    Event.find = jest.fn().mockImplementation(() => { throw new Error("db down"); });
    const res = mockRes();
    await getAttendanceReport({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
