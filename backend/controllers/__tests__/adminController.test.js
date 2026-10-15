jest.mock("../../models/User");
jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/ClubMembership");
jest.mock("../../utils/sendEmail");
jest.mock("../../utils/notifyRegistrants");

const User = require("../../models/User");
const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const ClubMembership = require("../../models/ClubMembership");
const sendEmail = require("../../utils/sendEmail");
const { notifyEventCancelled } = require("../../utils/notifyRegistrants");
const { updateUser, deleteUser, updateEventAdmin } = require("../adminController");

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
