jest.mock("../../models/User");
jest.mock("bcryptjs");
jest.mock("../../utils/sendEmail");

process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const sendEmail = require("../../utils/sendEmail");
const { register, login, changePassword } = require("../authController");

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

  const body = { name: "Sita", email: "sita@patancollege.edu.np", password: "secret1" };

  it("rejects non-PCP email domains", async () => {
    const res = mockRes();
    await register({ body: { ...body, email: "sita@gmail.com" } }, res);
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
