jest.mock("../../models/User");
jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/ClubMembership");

const User = require("../../models/User");
const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const ClubMembership = require("../../models/ClubMembership");
const { updateUser, deleteUser } = require("../adminController");

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
});
