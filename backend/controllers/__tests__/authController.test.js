jest.mock("../../models/User");
jest.mock("bcryptjs");
jest.mock("../../utils/sendEmail");
jest.mock("../../utils/deleteAccountData");
jest.mock("../../utils/audit");
jest.mock("../../models/Registration");
jest.mock("../../models/WaitlistEntry");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/Club");
jest.mock("../../models/Notification");

process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const sendEmail = require("../../utils/sendEmail");
const { register, login, forgotPassword, resendVerification, resetPassword, changePassword, updateProfile, deleteAccount, exportMyData } = require("../authController");
const Registration = require("../../models/Registration");
const WaitlistEntry = require("../../models/WaitlistEntry");
const ClubMembership = require("../../models/ClubMembership");
const Club = require("../../models/Club");
const { removeUserAndData } = require("../../utils/deleteAccountData");
const { recordAudit } = require("../../utils/audit");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
}

// login() chains .select("+password") onto findOne
function mockFindOneWithPassword(user) {
  User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
}

const goodUser = (overrides = {}) => ({
  _id: "u1",
  name: "Sita",
  email: "sita@patancollege.edu.np",
  password: "hashed",
  role: "user",
  emailVerified: true,
  approvalStatus: "approved",
  ...overrides,
});

describe("register", () => {
  afterEach(() => jest.resetAllMocks());

  const body = { name: "Sita", email: "sita@patancollege.edu.np", password: "secret12" };

  it("rejects non-PCP email domains", async () => {
    const res = mockRes();
    await register({ body: { ...body, email: "sita@gmail.com" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejects a password longer than bcrypt can use (72 bytes)", async () => {
    const res = mockRes();
    await register({ body: { ...body, password: "a".repeat(73) } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("400s (not 500) when a field is not a string", async () => {
    const res = mockRes();
    await register({ body: { ...body, password: ["a", "b", "c", "d", "e", "f"] } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejects an email that is already registered", async () => {
    User.findOne.mockResolvedValue({ _id: "existing" });
    const res = mockRes();
    await register({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("never takes the role from the request body", async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed");
    User.create.mockResolvedValue(goodUser());
    sendEmail.mockResolvedValue();
    const res = mockRes();
    await register({ body: { ...body, role: "admin" } }, res);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: "user" }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("still creates the account if the verification email fails to send", async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed");
    User.create.mockResolvedValue(goodUser());
    sendEmail.mockRejectedValue(new Error("smtp down"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    await register({ body }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const sent = res.json.mock.calls[0][0];
    expect(sent.emailSent).toBe(false);
    expect(sent.message).toMatch(/couldn't send the verification email/);
  });

  it("reports emailSent: true when the verification email went out", async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed");
    User.create.mockResolvedValue(goodUser());
    sendEmail.mockResolvedValue();
    const res = mockRes();
    await register({ body }, res);
    expect(res.json.mock.calls[0][0]).toEqual(expect.objectContaining({ emailSent: true, message: expect.stringMatching(/Check your email/) }));
  });
});

describe("login", () => {
  afterEach(() => jest.resetAllMocks());

  const req = { body: { email: "Sita@patancollege.edu.np", password: "secret1" } };

  it("400s with a generic message for an unknown email", async () => {
    mockFindOneWithPassword(null);
    const res = mockRes();
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password" });
  });

  it("gives the same generic message for a wrong password (no account enumeration)", async () => {
    mockFindOneWithPassword(goodUser());
    bcrypt.compare.mockResolvedValue(false);
    const res = mockRes();
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password" });
  });

  it("400s (not 500) when email is not a string", async () => {
    const res = mockRes();
    await login({ body: { email: { $gt: "" }, password: "x" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it.each([
    [{ emailVerified: false }, "EMAIL_NOT_VERIFIED"],
    [{ approvalStatus: "pending" }, "APPROVAL_PENDING"],
    [{ approvalStatus: "rejected" }, "APPROVAL_REJECTED"],
  ])("blocks login with 403 for %j", async (overrides, code) => {
    mockFindOneWithPassword(goodUser(overrides));
    bcrypt.compare.mockResolvedValue(true);
    const res = mockRes();
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code }));
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("logs in a verified, approved user: sets an httpOnly cookie and returns no password", async () => {
    mockFindOneWithPassword(goodUser());
    bcrypt.compare.mockResolvedValue(true);
    const res = mockRes();
    await login(req, res);
    expect(res.cookie).toHaveBeenCalledWith("token", expect.any(String), expect.objectContaining({ httpOnly: true }));
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toMatch(/hashed/);
  });
});

describe("changePassword", () => {
  afterEach(() => jest.resetAllMocks());

  function setup(user) {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
  }
  const req = { user: { _id: "u1" }, body: { currentPassword: "old-pass", newPassword: "new-pass" } };

  it("rejects a wrong current password without changing anything", async () => {
    const user = goodUser({ save: jest.fn() });
    setup(user);
    bcrypt.compare.mockResolvedValue(false);
    const res = mockRes();
    await changePassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(user.save).not.toHaveBeenCalled();
  });

  it("rejects a too-short new password", async () => {
    const res = mockRes();
    await changePassword({ ...req, body: { currentPassword: "old-pass", newPassword: "123" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("rejects a new password longer than bcrypt can use (72 bytes)", async () => {
    const res = mockRes();
    await changePassword({ ...req, body: { currentPassword: "old-pass", newPassword: "a".repeat(73) } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/72 bytes/);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("saves the new hash, stamps passwordChangedAt, re-issues the cookie and emails a notice", async () => {
    const user = goodUser({ save: jest.fn().mockResolvedValue() });
    setup(user);
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue("new-hash");
    sendEmail.mockResolvedValue();
    const res = mockRes();
    await changePassword(req, res);
    expect(user.password).toBe("new-hash");
    expect(user.passwordChangedAt).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledWith("token", expect.any(String), expect.any(Object));
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("still succeeds if the notice email fails", async () => {
    const user = goodUser({ save: jest.fn().mockResolvedValue() });
    setup(user);
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue("new-hash");
    sendEmail.mockRejectedValue(new Error("smtp down"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    await changePassword(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("register -- profile field limits", () => {
  afterEach(() => jest.resetAllMocks());
  const base = { name: "Sita", email: "sita@patancollege.edu.np", password: "secret12" };

  it("400s on an over-long name without touching the database", async () => {
    const res = mockRes();
    await register({ body: { ...base, name: "x".repeat(81) } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("400s on a non-text student ID", async () => {
    const res = mockRes();
    await register({ body: { ...base, studentId: { $gt: "" } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("stores the trimmed name", async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed");
    User.create.mockResolvedValue({ _id: "u1", name: "Sita", email: base.email });
    await register({ body: { ...base, name: "  Sita  " } }, mockRes());
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ name: "Sita", role: "user" }));
  });
});

describe("updateProfile", () => {
  afterEach(() => jest.resetAllMocks());
  const call = (body) => {
    const res = mockRes();
    return updateProfile({ user: { _id: "u1" }, body }, res).then(() => res);
  };

  it("400s on bad input and does not update", async () => {
    const res = await call({ name: "x".repeat(200) });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("never passes role or approvalStatus through to the update", async () => {
    User.findByIdAndUpdate.mockResolvedValue(goodUser());
    await call({ name: "Sita", role: "admin", approvalStatus: "approved" });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", { name: "Sita" }, expect.any(Object));
  });

  it("rejects an http avatar link", async () => {
    const res = await call({ avatar: "http://evil.example/x.png" });
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("deleteAccount", () => {
  afterEach(() => jest.resetAllMocks());

  const student = { _id: "s1", role: "user" };
  const dbUser = () => ({ _id: "s1", name: "Sita", email: "s@patancollege.edu.np", password: "hash" });
  const run = (body, user = student) => {
    const res = mockRes();
    res.clearCookie = jest.fn();
    return deleteAccount({ body, user }, res).then(() => res);
  };

  it.each([[{}], [{ password: "" }], [{ password: 123 }]])("requires a password (%p)", async (body) => {
    const res = await run(body);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(removeUserAndData).not.toHaveBeenCalled();
  });

  it("refuses admins, without touching anything", async () => {
    const res = await run({ password: "x" }, { _id: "a1", role: "admin" });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(User.findById).not.toHaveBeenCalled();
    expect(removeUserAndData).not.toHaveBeenCalled();
  });

  it("refuses a wrong password and deletes nothing", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(dbUser()) });
    bcrypt.compare.mockResolvedValue(false);
    const res = await run({ password: "wrong" });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(removeUserAndData).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it("deletes the account and data, logs the cookie out, audits and emails", async () => {
    const user = dbUser();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    bcrypt.compare.mockResolvedValue(true);
    sendEmail.mockResolvedValue();
    const res = await run({ password: "right" });
    expect(removeUserAndData).toHaveBeenCalledWith(user);
    expect(recordAudit).toHaveBeenCalledWith({ name: "Sita" }, "user.selfDeleted", expect.stringContaining("Sita"));
    expect(res.clearCookie).toHaveBeenCalledWith("token", expect.any(Object));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "s@patancollege.edu.np" }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("still succeeds if the goodbye email fails", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(dbUser()) });
    bcrypt.compare.mockResolvedValue(true);
    sendEmail.mockRejectedValue(new Error("smtp"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await run({ password: "right" });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("exportMyData", () => {
  afterEach(() => jest.resetAllMocks());

  const chain = (docs) => {
    const q = { populate: jest.fn(), sort: jest.fn(), select: jest.fn(), then: (res, rej) => Promise.resolve(docs).then(res, rej) };
    q.populate.mockReturnValue(q);
    q.sort.mockReturnValue(q);
    q.select.mockReturnValue(q);
    return q;
  };

  it("returns only the caller's own data, scoped by their id", async () => {
    User.findById.mockReturnValue(chain({ name: "Sita", email: "s@x.com", role: "user", password: "HASH" }));
    Registration.find.mockReturnValue(chain([]));
    WaitlistEntry.find.mockReturnValue(chain([]));
    ClubMembership.find.mockReturnValue(chain([]));
    Club.find.mockReturnValue(chain([]));
    Notification.find.mockReturnValue(chain([{ title: "Hack Night was updated", read: false, createdAt: "2026-10-01T00:00:00Z" }]));
    const res = mockRes();
    await exportMyData({ user: { _id: "s1" } }, res);
    expect(Notification.find).toHaveBeenCalledWith({ user: "s1" });
    expect(res.json.mock.calls[0][0].notifications).toEqual([{ message: "Hack Night was updated", read: false, receivedAt: "2026-10-01T00:00:00.000Z" }]);
    expect(Registration.find).toHaveBeenCalledWith({ user: "s1" });
    expect(ClubMembership.find).toHaveBeenCalledWith({ user: "s1" });
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.profile.name).toBe("Sita");
    expect(JSON.stringify(body)).not.toContain("HASH");
  });

  it("500s cleanly on a database error", async () => {
    User.findById.mockImplementation(() => { throw new Error("db"); });
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    await exportMyData({ user: { _id: "s1" } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("forgotPassword / resendVerification -- email must be text", () => {
  afterEach(() => jest.resetAllMocks());

  it.each([
    ["forgotPassword", forgotPassword],
    ["resendVerification", resendVerification],
  ])("%s answers 400 (not 500) for a non-text email", async (_name, handler) => {
    for (const email of [{ $gt: "" }, 123, ["a@patancollege.edu.np"], true]) {
      const res = mockRes();
      await handler({ body: { email } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("forgotPassword still gives the generic answer for an unknown email", async () => {
    User.findOne.mockResolvedValue(null);
    const res = mockRes();
    await forgotPassword({ body: { email: "Nobody@patancollege.edu.np" } }, res);
    expect(User.findOne).toHaveBeenCalledWith({ email: "nobody@patancollege.edu.np" });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("resendVerification -- outcomes", () => {
  afterEach(() => jest.resetAllMocks());
  const body = { email: "Sita@patancollege.edu.np" };

  it("sends a new link to an unverified account and says so", async () => {
    User.findOne.mockResolvedValue(goodUser({ emailVerified: false }));
    sendEmail.mockResolvedValue();
    const res = mockRes();
    await resendVerification({ body }, res);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("gives the same generic answer, without sending, for unknown or already-verified accounts", async () => {
    for (const found of [null, goodUser({ emailVerified: true })]) {
      User.findOne.mockResolvedValue(found);
      const res = mockRes();
      await resendVerification({ body }, res);
      expect(res.status).toHaveBeenCalledWith(200);
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("says so (503) instead of claiming success when the email can't be sent", async () => {
    User.findOne.mockResolvedValue(goodUser({ emailVerified: false }));
    sendEmail.mockRejectedValue(new Error("smtp down"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    await resendVerification({ body }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].message).toMatch(/couldn't send/);
  });
});

describe("password fields must be text", () => {
  afterEach(() => jest.resetAllMocks());

  it("changePassword rejects a non-text password with 400", async () => {
    for (const body of [
      { currentPassword: "old-secret", newPassword: ["a", "b", "c", "d", "e", "f"] },
      { currentPassword: { $ne: "" }, newPassword: "new-secret" },
    ]) {
      const res = mockRes();
      await changePassword({ user: { id: "u1" }, body }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("resetPassword rejects a non-text new password with 400", async () => {
    const res = mockRes();
    await resetPassword({ body: { token: "t", newPassword: ["a", "b", "c", "d", "e", "f"] } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });
});
